"""Extract the source books into one Markdown file for each chapter.

Dev-only tool. It is not part of the app.

    tools/extract/.venv/bin/python -I tools/extract/extract_books.py [book-key ...]

Reads the books in sources/<category>/ and writes sources-text/<category>/<book-key>/.
Filler (cover, copyright, about the authors, ads, index, figures, page headers,
performance-based questions, "Beyond A+" sections) is removed.
"""

import re
import sys
from pathlib import Path

import pymupdf
from bs4 import BeautifulSoup, NavigableString, Tag
from ebooklib import epub

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / "sources"
OUT = ROOT / "sources-text"


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

def slug(text, limit=60):
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s[:limit].rstrip("-")


def tidy(md):
    """Normalize whitespace and remove leftover noise lines."""
    md = md.replace("­", "").replace("​", "").replace("﻿", "")
    md = md.replace(" ", " ").replace(" ", " ").replace(" ", " ")
    md = re.sub(r"[ \t]+\n", "\n", md)
    md = re.sub(r"\*\*\s*\*\*", "", md)
    md = re.sub(r"\*\* ([.,;:])", r"**\1", md)
    md = re.sub(r"^○ ", "", md, flags=re.M)
    md = re.sub(r"\( ", "(", md)
    for line in BOILERPLATE:
        md = re.sub(r"^" + line + r".*\n", "", md, flags=re.M | re.I)
    # Answer options: one line each, no blank lines between them.
    md = re.sub(r"\n\n(?=[A-F]\. )", "\n", md)
    md = shift_headings(md)
    md = re.sub(r"\n{3,}", "\n\n", md)
    return md.strip() + "\n"


BOILERPLATE = [
    r"The answers to the chapter review questions can be found in Appendix",
    r"Answer these questions\. The answers follow the last question",
]


def shift_headings(md):
    """Make the highest body heading level ## (the file title is #)."""
    levels = [len(m) for m in re.findall(r"^(#+) ", md, re.M)]
    if not levels:
        return md
    delta = min(levels) - 2
    if delta <= 0:
        return md
    return re.sub(r"^(#+) ", lambda m: "#" * max(2, len(m.group(1)) - delta) + " ", md, flags=re.M)


def write_chapter(book_dir, num, title, header, body):
    book_dir.mkdir(parents=True, exist_ok=True)
    prefix = f"{num:02d}" if isinstance(num, int) else num
    name = f"{prefix}-{slug(title)}.md"
    text = f"# {title}\n\n{header}\n\n" + tidy(body)
    (book_dir / name).write_text(text, encoding="utf-8")
    return name


# ---------------------------------------------------------------------------
# EPUB (XHTML) to Markdown
# ---------------------------------------------------------------------------

DROP_TAGS = {"img", "figure", "script", "style", "nav", "svg", "hr", "br_never"}


def inline(node):
    """Inline text of a node with **bold**, *italic*, and `code`."""
    if isinstance(node, NavigableString):
        return re.sub(r"\s+", " ", str(node))
    if not isinstance(node, Tag) or node.name in DROP_TAGS:
        return ""
    if node.get("epub:type") == "pagebreak" or node.get("role") == "doc-pagebreak":
        return ""
    if node.name == "br":
        return " "
    inner = "".join(inline(c) for c in node.children)
    if not inner.strip():
        return inner
    lead = inner[: len(inner) - len(inner.lstrip())]
    trail = inner[len(inner.rstrip()):]
    core = inner.strip()
    if node.name in ("b", "strong"):
        return f"{lead}**{core}**{trail}"
    if node.name in ("i", "em"):
        return f"{lead}*{core}*{trail}"
    if node.name == "code" and node.parent.name != "pre":
        return f"{lead}`{core}`{trail}"
    return inner


def table_md(table):
    rows = []
    for tr in table.find_all("tr"):
        cells = [inline(c).strip().replace("|", "/") for c in tr.find_all(["th", "td"])]
        if cells:
            rows.append(cells)
    if not rows:
        return ""
    width = max(len(r) for r in rows)
    rows = [r + [""] * (width - len(r)) for r in rows]
    out = ["| " + " | ".join(rows[0]) + " |", "|" + "---|" * width]
    out += ["| " + " | ".join(r) + " |" for r in rows[1:]]
    cap = table.find("caption")
    title = f"**{inline(cap).strip()}**\n\n" if cap else ""
    return title + "\n".join(out)


BLOCK = {"p", "div", "section", "aside", "header", "blockquote", "ul", "ol", "li",
         "table", "pre", "h1", "h2", "h3", "h4", "h5", "h6", "dl", "dt", "dd", "body"}


def blocks(node, depth=0, quote=False):
    """Yield Markdown blocks for a node."""
    out = []
    for child in node.children:
        if isinstance(child, NavigableString):
            t = re.sub(r"\s+", " ", str(child)).strip()
            if t:
                out.append(t)
            continue
        if not isinstance(child, Tag) or child.name in DROP_TAGS:
            continue
        name = child.name
        if name in ("h1", "h2", "h3", "h4", "h5", "h6"):
            level = min(6, int(name[1]) + 1)
            t = inline(child).strip().strip("*").strip()
            if t:
                out.append("#" * level + " " + t)
        elif name == "p":
            t = inline(child).strip()
            if not t:
                continue
            t = re.sub(r"^[•▪■]\s*", "- ", t)
            out.append(t)
        elif name in ("ul", "ol"):
            out.append(list_md(child, depth))
        elif name == "table":
            out.append(table_md(child))
        elif name == "pre":
            out.append("```\n" + child.get_text().strip("\n") + "\n```")
        elif name in ("dl",):
            for dt in child.find_all("dt"):
                dd = dt.find_next_sibling("dd")
                out.append(f"**{inline(dt).strip()}**: {inline(dd).strip() if dd else ''}")
        elif name == "aside" or (name == "div" and set(child.get("class", [])) & BOX_CLASSES):
            inner = blocks(child, depth)
            if inner:
                out.append("\n".join("> " + line if line else ">" for line in "\n\n".join(inner).split("\n")))
        elif name in BLOCK or any(isinstance(c, Tag) and c.name in BLOCK for c in child.children):
            out.extend(blocks(child, depth))
        else:
            t = inline(child).strip()
            if t:
                out.append(t)
    return [b for b in out if b and b.strip()]


BOX_CLASSES = {"note", "ex-note-g", "ex-note", "tip", "warning", "sidebar", "feature1",
               "feature2", "feature3", "feature4", "box", "chap-box"}


# Honor <ol start> and <li value> (the Security+ Neil book). Off for the older books: their text,
# question parsers, and pool content were made without it.
LIST_NUMBERS = {"honor": False}


def list_md(lst, depth=0):
    lines = []
    ordered = lst.name == "ol"
    first_li = lst.find("li", recursive=False)
    classes = " ".join(lst.get("class", []) + (first_li.get("class", []) if first_li else [])).lower()
    alpha = "alpha" in classes or lst.get("type") in ("A", "a")
    numbered = ordered and not alpha and LIST_NUMBERS["honor"]
    start = lst.get("start", "1")
    n = int(start) - 1 if numbered and start.isdigit() else 0
    for li in lst.find_all("li", recursive=False):
        n += 1
        value = li.get("value", "")
        if numbered and value.isdigit():  # <li value="2"> continues a list split by a table
            n = int(value)
        nested = [c for c in li.children if isinstance(c, Tag) and c.name in ("ul", "ol")]
        text_parts = []
        for c in li.children:
            if isinstance(c, Tag) and c.name in ("ul", "ol"):
                continue
            if isinstance(c, Tag) and c.name in ("p", "div"):
                text_parts.append(inline(c).strip())
            else:
                text_parts.append(inline(c))
        text = re.sub(r"\s+", " ", " ".join(text_parts)).strip()
        if ordered and alpha:
            mark = f"{chr(64 + n)}."
        elif ordered:
            mark = f"{n}."
        else:
            mark = "-"
        lines.append("  " * depth + f"{mark} {text}")
        for sub in nested:
            lines.append(list_md(sub, depth + 1))
    return "\n".join(lines)


def html_to_md(html):
    soup = BeautifulSoup(html, "lxml")
    for t in soup.find_all(["img", "figure", "script", "style", "svg"]):
        t.decompose()
    for t in soup.select("[epub\\:type=pagebreak], [role=doc-pagebreak]"):
        t.decompose()
    return soup, "\n\n".join(blocks(soup.body or soup))


def epub_items(path):
    book = epub.read_epub(str(path))
    items = []
    for idref, _ in book.spine:
        it = book.get_item_with_id(idref)
        items.append((it.get_name(), it.get_content()))
    return items


def objectives_in(text, core):
    """Objective numbers like 2.1 found in a chapter's objective box."""
    found = sorted(set(re.findall(r"\b([1-5]\.\d{1,2})\b", text)), key=lambda s: [int(x) for x in s.split(".")])
    return found


# ---------------------------------------------------------------------------
# Book: Exam Cram, 2nd edition (220-1201/220-1202)
# ---------------------------------------------------------------------------

def book_exam_cram(src, out):
    files = []
    num = 0
    for name, html in epub_items(src):
        m = re.fullmatch(r"ch(\d+)\.html", name)
        if not (m or name in ("exam01.html", "exam02.html", "cramsheet.html")):
            continue
        html = re.sub(rb'<p class="cbox-para">.*?</p>', b"", html, flags=re.S)
        soup, md = html_to_md(html)
        h = soup.find(["h1", "h2"])
        title = re.sub(r"\s+", " ", h.get_text(" ")).strip() if h else name
        title = title.replace("Chapter ", "Chapter ").replace(" . ", ": ").replace(". ", ": ", 1) if title.startswith("Chapter") else title
        md = md.split("\n\n", 1)[1] if md.startswith("#") else md  # title is written by write_chapter
        if m:
            ch = int(m.group(1))
            core = "Core 1 (220-1201)" if ch <= 28 else "Core 2 (220-1202)"
            box = soup.find(class_="chap-box")
            objs = [o for o in objectives_in(box.get_text(" ") if box else "", core) if not o.endswith(".0")]
        elif name == "exam01.html":
            ch, core, objs = "x1", "Core 1 (220-1201)", []
        elif name == "exam02.html":
            ch, core, objs = "x2", "Core 2 (220-1202)", []
        else:
            ch, core, objs = "x3", "Core 1 (220-1201) and Core 2 (220-1202)", []
        md = drop_sections(md, [r"What Next\?", r"Figure Credits", r"Answers at a Glance"])
        md = re.sub(r"^The multiple-choice questions provided here help you.*\n", "", md, flags=re.M)
        header = f"Source: CompTIA A+ Core 1 and Core 2 Exam Cram, 2nd ed. – {name}\nExam: {core}"
        if objs:
            header += "\nObjectives: " + ", ".join(objs)
        num = ch
        files.append((write_chapter(out, num, title, header, md), title, core, objs))
    return files


# ---------------------------------------------------------------------------
# Book: Complete Study Guide, Docter (220-1201/220-1202), 2 volumes
# ---------------------------------------------------------------------------

def split_by_heading(md, pattern):
    """Split Markdown at headings that match pattern. Returns {key: text}."""
    parts, key, buf = {}, None, []
    for line in md.split("\n"):
        m = re.match(pattern, line)
        if m:
            if key is not None:
                parts[key] = "\n".join(buf)
            key, buf = m.group(1), []
        elif key is not None:
            buf.append(line)
    if key is not None:
        parts[key] = "\n".join(buf)
    return parts


def drop_sections(md, title_patterns):
    """Remove headed sections (and their subsections) whose title matches."""
    lines = md.split("\n")
    out, skip_level = [], None
    for line in lines:
        m = re.match(r"^(#+)\s+(.*)", line)
        if m:
            level = len(m.group(1))
            if skip_level is not None and level <= skip_level:
                skip_level = None
            if skip_level is None and any(re.search(p, m.group(2), re.I) for p in title_patterns):
                skip_level = level
                continue
        if skip_level is None:
            out.append(line)
    return "\n".join(out)


def book_docter(src, out):
    items = dict(epub_items(src))
    files = []
    for vol, core in ((1, "Core 1 (220-1201)"), (2, "Core 2 (220-1202)")):
        suffix = "" if vol == 1 else "_Vol2"
        _, ans_md = html_to_md(items[f"b01{suffix}.xhtml"])
        answers = split_by_heading(ans_md, r"^#+\s+Chapter (\d+):")
        ch = 0
        while f"c{ch + 1:02d}_Vol{vol}.xhtml" in items:
            ch += 1
            soup, md = html_to_md(items[f"c{ch:02d}_Vol{vol}.xhtml"])
            t = soup.find(class_="chapterTitle")
            title = f"Chapter {ch}: {t.get_text(' ').strip() if t else ''}"
            md = re.sub(r"^#+ Chapter \d+ .*\n", "", md, count=1)
            md = drop_sections(md, [r"Performance-Based Question"])
            box = soup.find("aside")
            objs = [o for o in objectives_in(box.get_text(" ") if box else "", core) if not o.endswith(".0")]
            if str(ch) in answers:
                md += "\n\n## Answers to Review Questions\n\n" + answers[str(ch)].strip()
            header = (f"Source: CompTIA A+ Complete Study Guide (Docter), Volume {vol} – chapter {ch}\n"
                      f"Exam: {core}" + ("\nObjectives: " + ", ".join(objs) if objs else ""))
            num = f"c{vol}-{ch:02d}"
            files.append((write_chapter(out, num, f"{'Core 1' if vol == 1 else 'Core 2'} {title}", header, md),
                          title, core, objs))
    return files


# ---------------------------------------------------------------------------
# Book: Practice Tests, Neil (220-1101/220-1102)
# ---------------------------------------------------------------------------

NEIL_CHAPTERS = {
    "B19729_01.xhtml": (1, "Core 1 (220-1101)"), "B19729_02.xhtml": (2, "Core 1 (220-1101)"),
    "B19729_03.xhtml": (3, "Core 1 (220-1101)"), "B19729_04.xhtml": (4, "Core 1 (220-1101)"),
    "B19729_05.xhtml": (5, "Core 1 (220-1101)"), "B19729_06_Mock_Exam.xhtml": (6, "Core 1 (220-1101)"),
    "B19729_07.xhtml": (7, "Core 2 (220-1102)"), "B19729_08.xhtml": (8, "Core 2 (220-1102)"),
    "B19729_09.xhtml": (9, "Core 2 (220-1102)"), "B19729_10.xhtml": (10, "Core 2 (220-1102)"),
    "B19729_11_Mock_Exam.xhtml": (11, "Core 2 (220-1102)"),
}
NEIL_SOLUTION_IDS = ["_idParaDest-126", "_idParaDest-131", "_idParaDest-140", "_idParaDest-148",
                     "_idParaDest-151", "_idParaDest-159", "_idParaDest-160", "_idParaDest-172",
                     "_idParaDest-183", "_idParaDest-189", "_idParaDest-199"]


def neil_solutions(html):
    """Split the Solutions file into one HTML fragment for each chapter (1–11)."""
    soup = BeautifulSoup(html, "lxml")
    marks = [soup.find(id=i) for i in NEIL_SOLUTION_IDS]
    container = marks[0].parent
    parts, cur = {}, None
    for el in list(container.children):
        if isinstance(el, Tag) and el.get("id") in NEIL_SOLUTION_IDS:
            cur = NEIL_SOLUTION_IDS.index(el["id"]) + 1
            parts[cur] = []
            continue
        if cur is not None:
            parts[cur].append(str(el))
    return {k: "<html><body>" + "".join(v) + "</body></html>" for k, v in parts.items()}


def book_neil(src, out):
    items = dict(epub_items(src))
    sols = neil_solutions(items["B19729_Solution.xhtml"])
    files = []
    for name, (ch, core) in NEIL_CHAPTERS.items():
        soup, md = html_to_md(items[name])
        heads = [h.get_text(" ").strip() for h in soup.find_all("h1")]
        heads = [h for h in heads if h and not h.isdigit() and h != "Introduction"]
        title = f"Chapter {ch}: {heads[0] if heads else name}"
        md = drop_sections(md, [r"Instructions to Unlock", r"Unlock", r"^Introduction$"])
        if 7 <= ch <= 10:  # Core 2 chapters number the objectives 7.x–10.x
            md = re.sub(rf"^(#+ ){ch}\.(\d+) ", lambda m: f"{m.group(1)}{ch - 6}.{m.group(2)} ", md, flags=re.M)
        # Leading chapter-number and title headings are rewritten by write_chapter.
        md = re.sub(r"^(#+ .*\n\n?){1,2}", "", md)
        _, smd = html_to_md(sols[ch])
        if 7 <= ch <= 10:
            smd = re.sub(rf"^(#+ ){ch}\.(\d+) ", lambda m: f"{m.group(1)}{ch - 6}.{m.group(2)} ", smd, flags=re.M)
        md += "\n\n## Solutions\n\n" + smd
        objs = sorted(set(re.findall(r"^#+ ([1-5]\.\d{1,2}) ", md, re.M)),
                      key=lambda s: [int(x) for x in s.split(".")])
        header = (f"Source: CompTIA A+ Practice Tests Core 1 (220-1101) and Core 2 (220-1102) (Neil) – chapter {ch}\n"
                  f"Exam: {core} (older objectives; the app targets 220-1201/1202)"
                  + ("\nObjectives: " + ", ".join(objs) if objs else ""))
        files.append((write_chapter(out, ch, title, header, md), title, core, objs))
    return files


# ---------------------------------------------------------------------------
# Book: All-in-One Exam Guide, 11th edition (220-1101/220-1102), PDF
# ---------------------------------------------------------------------------

AIO_HEADINGS = [  # (min size, max size, font contains, markdown prefix)
    (17.5, 19, "BoldSemiCn", "## "),
    (14.5, 15.5, "BoldSemiCn", "### "),
    (12.0, 13.0, "BoldSemiCn", "#### "),
    (13.5, 14.5, "BoldCond", "#### "),
]


def aio_line(spans):
    parts = []
    for s in spans:
        t = s["text"]
        if not t.strip():
            parts.append(t)
            continue
        bold = "Bold" in s["font"] and s["size"] <= 11.5
        parts.append(f"**{t.strip()}** " if bold else t)
    return "".join(parts)


def aio_kind(span):
    """Classify a line by its first span: a heading prefix, 'skip', or 'body'."""
    size, font = span["size"], span["font"]
    for lo, hi, f, p in AIO_HEADINGS:
        if lo <= size <= hi and f in font:
            return p
    if font == "MyriadPro-Cond" or font.startswith("MyriadPro-BlackSemiExt") or size >= 28:
        return "skip"  # page numbers and chapter-opening numbers
    if size < 8.5 and "Courier" not in font:
        return "skip"  # labels inside figures
    if font == "MyriadPro-Regular" and size < 9.5:
        return "skip"  # figure captions
    return "body"


def aio_join(lines):
    text = ""
    for l in lines:
        seg = aio_line(l["spans"]).rstrip()
        if text.endswith("­"):
            text = text[:-1] + seg.lstrip()
        elif text.endswith("-") and seg[:1].islower():
            text = text + seg.lstrip()
        else:
            text = (text + " " + seg.lstrip()) if text else seg
    text = re.sub(r"\s+", " ", text.replace("\t", " ")).strip()
    # Question numbers and answer letters: "**1.** Text" and "**A.** Text" -> "1. Text".
    text = re.sub(r"^\*\*(\d+\.)\s*([A-F](?:, [A-F])*\.)?\*\*\s*", lambda m: m.group(1) + (" " + m.group(2) if m.group(2) else "") + " ", text)
    text = re.sub(r"^\*\*([A-F]\.)\*\*\s*", r"\1 ", text)
    return text.strip()


def aio_table(page, tb):
    """A table as Markdown, with cell text from the page words (keeps the spaces)."""
    words = page.get_text("words")
    rows = []
    for row in tb.rows:
        cells = []
        for c in row.cells:
            if c is None:
                cells.append("")
                continue
            r = pymupdf.Rect(c)
            ws = [w for w in words if r.contains(pymupdf.Point((w[0] + w[2]) / 2, (w[1] + w[3]) / 2))]
            ws.sort(key=lambda w: (round(w[1]), w[0]))
            cells.append(" ".join(w[4] for w in ws).replace("|", "/").replace("­", ""))
        if any(cells):
            rows.append(cells)
    if len(rows) < 2:
        return ""
    width = max(len(r) for r in rows)
    rows = [r + [""] * (width - len(r)) for r in rows]
    md = ["| " + " | ".join(rows[0]) + " |", "|" + "---|" * width]
    return "\n".join(md + ["| " + " | ".join(r) + " |" for r in rows[1:]])


def aio_page(page, first_page):
    """Markdown blocks for one PDF page."""
    tables = []
    try:
        tables = [t for t in page.find_tables().tables if t.row_count >= 2 and t.col_count >= 2]
    except Exception:
        pass
    tboxes = [pymupdf.Rect(t.bbox) for t in tables]
    out = []  # (y, text)
    for t in tables:
        md = aio_table(page, t)
        if md:
            out.append((t.bbox[1], md))
    for b in page.get_text("dict")["blocks"]:
        lines = [l for l in b.get("lines", []) if l["spans"] and "".join(s["text"] for s in l["spans"]).strip()]
        if not lines or b["bbox"][1] < 48:  # empty, or running header and page number
            continue
        if any(pymupdf.Rect(b["bbox"]).intersects(tb) for tb in tboxes):
            continue
        first = "".join(s["text"] for s in lines[0]["spans"]).strip()
        if re.match(r"Figure \d+-\d+", first) or "intentionally left blank" in first:
            continue
        # Split the block into groups: a new group starts at a heading, after a heading, or at a bullet.
        groups, kinds = [], []
        for l in lines:
            spans = [s for s in l["spans"] if s["text"].strip()]
            kind = aio_kind(spans[0])
            text0 = "".join(s["text"] for s in spans).lstrip()
            new = (not groups or kind != kinds[-1] or kind.startswith("#") or text0.startswith("•")
                   or re.match(r"^([A-F]\.|\d+\.)\t", "".join(s["text"] for s in l["spans"])))
            if new:
                groups.append([l])
                kinds.append(kind)
            else:
                groups[-1].append(l)
        for g, kind in zip(groups, kinds):
            if kind == "skip":
                continue
            text = aio_join(g)
            if not text:
                continue
            font = g[0]["spans"][0]["font"]
            if kind.startswith("#"):
                text = kind + text.replace("**", "")
            elif "Courier" in font:
                text = "`" + text + "`"
            elif re.match(r"^(NOTE|EXAM TIP|CAUTION|SIM|TIP)\b", text.replace("**", "")):
                text = "> " + text
            elif text.startswith("•"):
                text = "- " + text.lstrip("• ").strip()
            out.append((g[0]["bbox"][1], text))
    out.sort(key=lambda x: x[0])
    return [t for _, t in out]


def aio_merge(paragraphs):
    """Join paragraphs that a page break split in two."""
    merged = []
    for p in paragraphs:
        if (merged and p and p[0].islower() and not merged[-1].startswith(("#", "|", ">", "`"))
                and not merged[-1].rstrip().endswith((".", ":", "?", "!"))):
            merged[-1] = merged[-1] + " " + p
        else:
            merged.append(p)
    return merged


def aio_body(paras):
    md = "\n\n".join(aio_merge(paras))
    # Exam markers become plain notes; "Beyond A+" sections are past the exam objectives.
    md = re.sub(r"^## (1101|1102|1101/1102)$", r"> Exam objectives: 220-\1", md, flags=re.M)
    md = re.sub(r"^## Historical/Conceptual$", "> Historical/conceptual background (not an exam objective)", md, flags=re.M)
    md = drop_sections(md, [r"^Beyond A\+$"])
    return compact_bullets(md)


def compact_bullets(md):
    """No blank lines between the items of one bullet list."""
    while True:
        new = re.sub(r"(?m)^(- .*)\n\n(?=- )", r"\1\n", md)
        if new == md:
            return md
        md = new


AIO_CORE = {1: "Core 2", 2: "Core 1 and Core 2", 3: "Core 1", 4: "Core 1", 5: "Core 1", 6: "Core 1", 7: "Core 1",
            8: "Core 1", 9: "Core 1 and Core 2", 10: "Core 1", 11: "Core 2", 12: "Core 2", 13: "Core 2",
            14: "Core 2", 15: "Core 2", 16: "Core 2", 17: "Core 1", 18: "Core 1", 19: "Core 1", 20: "Core 1",
            21: "Core 1", 22: "Core 1", 23: "Core 1", 24: "Core 1 and Core 2", 25: "Core 1 and Core 2",
            26: "Core 1", 27: "Core 2", 28: "Core 2"}


def book_aio(src, out):
    doc = pymupdf.open(str(src))
    toc = [(t, p) for lvl, t, p in doc.get_toc() if lvl == 1]
    files = []
    for i, (title, start) in enumerate(toc):
        end = toc[i + 1][1] - 1 if i + 1 < len(toc) else doc.page_count
        m = re.match(r"Chapter (\d+) (.*)", title)
        if m:
            ch = int(m.group(1))
            name = f"Chapter {ch}: {m.group(2)}"
        elif title == "Glossary":
            ch, name = 99, "Glossary"
        else:
            continue
        paras = []
        for pg in range(start - 1, end):
            paras += aio_page(doc[pg], pg == start - 1)
        if ch == 99:
            body = "\n\n".join(aio_merge(paras))
            core = "Core 1 and Core 2 (220-1101/1102)"
        else:
            # The chapter-opening title is repeated by write_chapter.
            paras = [p for p in paras if p.strip() != m.group(2)]
            body = aio_body(paras)
            core = f"{AIO_CORE[ch]} (220-1101/1102)"
        header = (f"Source: CompTIA A+ Certification All-in-One Exam Guide, 11th ed. – {name}\n"
                  f"Exam: {core} (older objectives; the app targets 220-1201/1202)")
        files.append((write_chapter(out, ch, name, header, body), name, core, []))
    return files


# ---------------------------------------------------------------------------
# Official CompTIA exam objectives (220-1201, 220-1202), PDF
# ---------------------------------------------------------------------------

OBJ_BULLETS = {"•": 1, "−": 2, "-": 2, "◦": 3, "գ": 3, "▪": 4}


def obj_lines(page):
    """(x, y, size, font, text) for each text line, without the page footer."""
    out = []
    for b in page.get_text("dict")["blocks"]:
        for l in b.get("lines", []):
            spans = [s for s in l["spans"] if s["text"].strip()]
            if not spans or l["bbox"][1] > 740:
                continue
            text = re.sub(r"\s+", " ", "".join(s["text"] for s in spans)).strip()
            out.append((l["bbox"][0], l["bbox"][1], spans[0]["size"], spans[0]["font"], text))
    return out


def obj_column(x):
    return 0 if x < 150 else 1 if x < 320 else 2 if x < 400 else 3


def obj_table(lines):
    """A two-column table inside an objective (N10-009 1.4: Protocols | Ports). Returns (markdown, other lines)."""
    heads = [l for l in lines if "Bold" in l[3] and l[4] in ("Protocols", "Ports")]
    if len(heads) != 2:
        return "", lines
    left, right = sorted(heads, key=lambda l: l[0])
    names = [l for l in lines if abs(l[0] - left[0]) < 5 and l[1] > left[1] and l not in heads]
    values = [l for l in lines if abs(l[0] - right[0]) < 5 and l[1] > right[1] and l not in heads]
    rows, used = [], set()
    for n in sorted(names, key=lambda l: l[1]):
        v = next((v for v in values if abs(v[1] - n[1]) < 3), None)
        if v is None:
            continue
        rows.append((n[4], v[4]))
        used |= {id(n), id(v)}
    md = "\n".join([f"| {left[4]} | {right[4]} |", "|---|---|"] + [f"| {a} | {b} |" for a, b in rows])
    return md, [l for l in lines if id(l) not in used and l not in heads]


def obj_items(lines):
    """Nested Markdown list from the bullet lines of one objective (read column by column)."""
    table, lines = obj_table(lines)
    lines = sorted(lines, key=lambda l: (obj_column(l[0]), l[1]))
    items = []  # [level, text]
    for x, y, size, font, text in lines:
        level = OBJ_BULLETS.get(text[0])
        if text.startswith("o "):
            level, text = 3, text[1:]
        if level:
            items.append([level, text[1:].strip() if text[0] in OBJ_BULLETS else text.strip()])
        elif re.match(r"\d+\. ", text):
            items.append([0, text])  # numbered step
        elif items:
            sep = "" if items[-1][1].endswith(("/", "-")) else " "
            items[-1][1] += sep + text
        else:
            items.append([1, text])
    out = "\n".join(t if lvl == 0 else "  " * (lvl - 1) + "- " + t for lvl, t in items)
    if table:
        out = table + "\n\n" + out
    return re.sub(r"(\w)\. (exe|msc)\b", r"\1.\2", out)


def obj_front(doc):
    """Exam details, domains, and the troubleshooting methodology from the first pages."""
    details = []
    front = re.sub(r"\s+", " ", " ".join(doc[i].get_text() for i in range(1, 3)))
    for label in ("Number of questions", "Types of questions", "Length of test", "Passing Score"):
        m = re.search(re.escape(label) + r" (.+?) (?=Number of|Types of|Length of|Recommended|Passing|EXAM OBJECTIVES)", front, re.I)
        if m:
            details.append((label, m.group(1).strip()))
    domains = re.findall(r"(\d\.0) ([A-Za-z ,]+?) (\d+%)", front)
    m = re.search(r"The troubleshooting methodology includes the following steps: (.+?) DOMAIN", front)
    method = [s.strip() for s in re.split(r"[•]", m.group(1)) if s.strip()] if m else []
    method = [re.sub(r" - ", "\n   - ", s) for s in method]  # sub-steps
    return details, domains, method


def obj_parse(doc):
    """Exam details, domains, objectives, and the acronym list of one objectives PDF."""
    details, domains, method = obj_front(doc)
    objectives, acronyms = [], []
    mode, cur = "front", None
    for page in doc:
        lines = obj_lines(page)
        texts = " ".join(l[4] for l in lines)
        if "Hardware and Software List" in texts or "registered trademark" in texts:
            break
        if "Acronym List" in texts:
            mode = "acronyms"
        if mode == "front" and any(l[2] > 20 and re.match(r"1\.0 ", l[4]) for l in lines):
            mode = "objectives"
        if mode == "objectives":
            lines = [l for l in lines if not re.match(r"\d\.0 +\| ", l[4])]  # repeated domain header
            # Objective numbers sit in the left margin, sometimes joined to the title ("1.3Summarize ...").
            nums, extra = [], []
            for l in lines:
                m = re.match(r"(\d\.\d+) ?(.*)", l[4])
                if m and "Bold" in l[3] and l[0] < 45:
                    nums.append((l[0], l[1], l[2], l[3], m.group(1)))
                    if m.group(2):
                        extra.append((54.0, l[1], 12.0, l[3], m.group(2)))
            nums.sort(key=lambda l: l[1])
            lines = [l for l in lines if not (re.match(r"\d\.\d+", l[4]) and "Bold" in l[3] and l[0] < 45)] + extra
            titles = [l for l in lines if 11 < l[2] < 17]
            starts = []  # (y, number, title)
            for n in nums:
                tl = sorted([t for t in titles if abs(t[1] - n[1]) < 8 or 0 < t[1] - n[1] < 40 and t[0] > 50], key=lambda t: t[1])
                block = [tl[0]] if tl else []
                for t in tl[1:]:
                    if t[1] - block[-1][1] <= 22:
                        block.append(t)
                starts.append((block[0][1] if block else n[1], n[4], " ".join(t[4] for t in block), {id(t) for t in block}))
            used = set().union(*[s[3] for s in starts]) if starts else set()
            bullets = [l for l in lines if l[2] < 10 and id(l) not in used]
            bounds = [s[0] for s in starts] + [1e9]
            # Bullets above the first objective on a page continue the last objective.
            if cur is not None:
                cur["lines"] += [b for b in bullets if b[1] < bounds[0]]
            for i, (y, num, title, _) in enumerate(starts):
                title = re.sub(r"(\.\s*)+(\s[a-z])?$", ".", title.strip())
                cur = {"num": num, "title": title, "lines": [b for b in bullets if bounds[i] < b[1] < bounds[i + 1]]}
                objectives.append(cur)
        elif mode == "acronyms":
            # One or two acronym/definition column pairs per page; read the left pair first.
            rows = sorted([l for l in lines if l[2] < 10 and l[4].upper() not in ("ACRONYM", "DEFINITION", "SPELLED OUT")],
                          key=lambda l: (l[0] >= 300, round(l[1]), l[0]))
            for x, y, size, font, text in rows:
                if x < 100 or 300 <= x < 360:
                    acronyms.append([text, ""])
                elif acronyms:
                    acronyms[-1][1] = (acronyms[-1][1] + " " + text).strip()
    return details, domains, method, objectives, acronyms


SEC_COLUMNS = (108, 360)  # x of the top-level bullet in the left and right column


def sec_obj_parse(doc):
    """SY0-801 objectives PDF: one or two bullet columns, the bullet glyph and its text are separate lines.

    The level comes from the text's x (18 pt per level from the column's first bullet). A text
    line with no bullet glyph beside it continues the item above it in the same column.
    """
    details, domains, method = obj_front(doc)
    objectives, acronyms, mode = [], [], "front"
    for page in doc:
        lines = [l for l in obj_lines(page) if l[1] < 720]
        texts = " ".join(l[4] for l in lines)
        if "Acronym List" in texts:
            mode = "acronyms"
        if "Hardware and Software List" in texts or "EQUIPMENT" in texts:
            break
        if mode == "front" and any(l[2] > 20 and re.match(r"1\.0 ", l[4]) for l in lines):
            mode = "objectives"
        if mode == "objectives":
            heads = sorted([l for l in lines if l[2] == 12 and "Bold" in l[3] and re.match(r"\d\.\d+", l[4])], key=lambda l: l[1])
            conts = [l for l in lines if l[2] == 12 and "Bold" not in l[3]]
            glyphs = [l for l in lines if l[2] < 10 and ("Wingdings" in l[3] or "Symbol" in l[3]) and len(l[4]) <= 2]
            body = [l for l in lines if l[2] < 10 and l not in glyphs]
            bands = [0] + [h[1] for h in heads] + [1e9]
            for i in range(len(bands) - 1):
                if i > 0:
                    h = heads[i - 1]
                    m = re.match(r"(\d\.\d+) ?(.*)", h[4])
                    title = " ".join([m.group(2)] + [c[4] for c in conts if 0 < c[1] - h[1] < 40])
                    title = re.sub(r"(\w)- (\w)", r"\1-\2", re.sub(r"\s+", " ", title)).strip().rstrip(".")
                    objectives.append({"num": m.group(1), "title": title, "items": []})
                if not objectives:
                    continue
                items = objectives[-1]["items"]
                for col, base in enumerate(SEC_COLUMNS):
                    part = sorted([l for l in body if bands[i] < l[1] < bands[i + 1] and (l[0] >= 340) == bool(col)], key=lambda l: l[1])
                    for x, y, size, font, text in part:
                        level = round((x - base) / 18)
                        if any(abs(g[0] - (x - 18)) < 3 and abs(g[1] - y) < 4 for g in glyphs):
                            items.append([max(level, 1), text.strip()])
                        elif items:
                            sep = "" if items[-1][1].endswith(("/", "-")) else " "
                            items[-1][1] += sep + text.strip()
        elif mode == "acronyms":
            for x, y, size, font, text in sorted([l for l in lines if l[2] < 10], key=lambda l: (round(l[1]), l[0])):
                if x < 100:
                    acronyms.append([text, ""])
                elif acronyms:
                    acronyms[-1][1] = (acronyms[-1][1] + " " + text).strip()
    for o in objectives:
        # 4.2 prints all its bullets one step deeper: the shallowest bullet of an objective is level 1.
        shift = min((lvl for lvl, _ in o["items"]), default=1) - 1
        o["md"] = "\n".join("  " * (lvl - 1 - shift) + "- " + t for lvl, t in o["items"])
    return details, domains, method, objectives, acronyms


def book_objectives(src, out):
    code = re.search(r"220-\d{4}|n10-\d{3}|sy0-\d{3}", src.name, re.I).group(0).upper()
    core = ("Network+" if code.startswith("N10") else "Security+" if code.startswith("SY0")
            else "Core 1" if code.endswith("1") else "Core 2")
    parse = sec_obj_parse if core == "Security+" else obj_parse
    details, domains, method, objectives, acronyms = parse(pymupdf.open(str(src)))
    cert = "" if core in ("Network+", "Security+") else "A+ "
    src_line = f"Source: CompTIA {cert}{core} ({code}) Exam Objectives (official)\nExam: {core} ({code})"

    md = ["## Exam details", ""] + [f"- **{k}:** {v}" for k, v in details] + [""]
    md += ["## Domains", "", "| Domain | Weight |", "|---|---|"] + [f"| {n} {name} | {w} |" for n, name, w in domains] + [""]
    if method:
        md += ["## Troubleshooting methodology", "",
               "Listed in the objectives as a best practice. CompTIA says it is not tested as an objective.", ""]
        md += [f"{i}. {s}" for i, s in enumerate(method, 1)] + [""]
    names = {n.split(".")[0]: name for n, name, _ in domains}
    major = None
    for o in objectives:
        d = o["num"].split(".")[0]
        if d != major:
            major = d
            md += [f"## {d}.0 {names.get(d, '')}".rstrip(), ""]
        md += [f"### {o['num']} {o['title']}", "", o["md"] if "md" in o else obj_items(o["lines"]), ""]
    files = [(write_chapter(out, 1, f"{core} ({code}) Exam Objectives", src_line, "\n".join(md)),
              f"{core} ({code}) Exam Objectives", f"{core} ({code})", [o["num"] for o in objectives])]

    rows = ["| Acronym | Expanded form |", "|---|---|"] + [f"| {a} | {d} |" for a, d in acronyms]
    body = (f"The official list of acronyms that can appear on the {core} ({code}) exam: {len(acronyms)} acronyms. "
            "Use it as the main source for `content/acronyms/`.\n\n" + "\n".join(rows))
    files.append((write_chapter(out, 2, f"{core} ({code}) Acronym List", src_line, body),
                  f"{core} ({code}) Acronym List", f"{core} ({code})", []))
    return files



# ---------------------------------------------------------------------------
# Book: Network+ N10-009 Exam Cram (Dulaney), EPUB
# ---------------------------------------------------------------------------

NET = "Network+ (N10-009)"


def gloss_html(html):
    """Glossary entries ("term" paragraph, then a definition paragraph) as one paragraph each."""
    return re.sub(rb'<p class="gloss"[^>]*>(.*?)</p>\s*<p class="gloss-p"[^>]*>(.*?)</p>',
                  rb"<p><b>\1</b> \2</p>", html, flags=re.S)


def book_exam_cram_net(src, out):
    files = []
    for name, html in epub_items(src):
        m = re.fullmatch(r"ch(\d+)\.xhtml", name)
        if not (m or name in ("cramsheet.xhtml", "gloss.xhtml")):
            continue
        html = re.sub(rb'<p class="obj-p">.*?</p>', b"", html, flags=re.S)  # intro chatter
        if name == "gloss.xhtml":
            html = gloss_html(html)
        soup, md = html_to_md(html)
        h = soup.find(["h1", "h2"])
        title = re.sub(r"\s+", " ", h.get_text(" ")).strip() if h else name
        title = title.replace(". ", ": ", 1) if title.startswith("Chapter") else title
        md = md.split("\n\n", 1)[1] if md.startswith("#") else md
        md = drop_sections(md, [r"What.s Next\?"])
        md = re.sub(r"^If you can correctly answer these questions before going through this section.*\n", "", md, flags=re.M)
        md = re.sub(r"^(CramSaver|Cram Quiz|Cram Quiz Answers|Answers)$", r"**\1**", md, flags=re.M)
        objs = []
        if m:
            ch = int(m.group(1))
            box = " ".join(p.get_text(" ") for p in soup.find_all(class_="obj-bullet"))
            objs = objectives_in(box, NET)
        else:
            ch = "x1" if name == "cramsheet.xhtml" else "x2"
        header = f"Source: CompTIA Network+ N10-009 Exam Cram (Dulaney) – {name}\nExam: {NET}"
        if objs:
            header += "\nObjectives: " + ", ".join(objs)
        files.append((write_chapter(out, ch, title, header, md), title, NET, objs))
    return files


# ---------------------------------------------------------------------------
# Book: Network+ Practice Tests N10-009 (Zacker), EPUB
# ---------------------------------------------------------------------------

def book_zacker(src, out):
    items = dict(epub_items(src))
    _, ans_md = html_to_md(items["b01.xhtml"])
    answers = split_by_heading(ans_md, r"^#+\s+Chapter (\d+):")
    files = []
    ch = 0
    while f"c{ch + 1:02d}.xhtml" in items:
        ch += 1
        soup, md = html_to_md(items[f"c{ch:02d}.xhtml"])
        h = soup.find("h1")
        title = re.sub(r"\s+", " ", h.get_text(" ")).strip() if h else f"Chapter {ch}"
        title = re.sub(r"^Chapter\s*(\d+)\s*:?\s*", r"Chapter \1: ", title)
        md = re.sub(r"^#+ .*\n", "", md, count=1)
        # The objectives box at the start lists every sub-topic; the objective headings carry the numbers.
        md = re.sub(r"^> \*\*THE COMPTIA NETWORK\+.*?(?=\n\n(?!>))", "", md, flags=re.S | re.M)
        objs = sorted(set(re.findall(r"^#+ ([1-5]\.\d{1,2}) ", md, re.M)), key=lambda s: [int(x) for x in s.split(".")])
        if str(ch) in answers:
            md += "\n\n## Answers to Review Questions\n\n" + answers[str(ch)].strip()
        header = (f"Source: CompTIA Network+ Practice Tests: Exam N10-009 (Zacker) – chapter {ch}\nExam: {NET}"
                  + ("\nObjectives: " + ", ".join(objs) if objs else ""))
        files.append((write_chapter(out, ch, title, header, md), title, NET, objs))
    return files


# ---------------------------------------------------------------------------
# Book: Network+ Guide to Networks (West), Cengage, PDF
# ---------------------------------------------------------------------------

WEST_HEADINGS = [  # (min size, max size, font starts with, markdown prefix)
    (19.0, 21.0, "Montserrat-Bold", "## "),
    (16.0, 18.0, "Montserrat-Bold", "### "),
    (11.5, 13.5, "Montserrat-Bold", "#### "),
    (11.5, 12.5, "HelveticaNeue", "#### "),
]


def west_kind(span):
    size, font = span["size"], span["font"]
    for lo, hi, f, p in WEST_HEADINGS:
        if lo <= size <= hi and font.startswith(f):
            return p
    if size >= 20 or font.startswith(("Helvetica", "Syntax", "Courier", "Arial")):
        return "skip"  # chapter numbers and figure labels
    if font.startswith("OpenSans"):
        keep = (8.6 <= size <= 9.0 and "Bold" not in font and "Semibold" not in font) or (size >= 10.5 and "Bold" in font)
        return "body" if keep else "skip"  # self-check questions and table titles; else figure labels
    if size < 7.5:
        return "skip"
    return "body"


def west_line(spans):
    parts = []
    for s in spans:
        t = s["text"]
        bold = t.strip() and s["font"].startswith(("UtopiaStd-Bold", "AreaNormal-Bold", "AreaNormal-ExtraBold"))
        parts.append(f"**{t.strip()}** " if bold else t)
    return "".join(parts)


def west_page(page):
    """(band, column, y, x, text) items for one page of the West book."""
    width = page.rect.width
    tables = []
    try:
        tables = [t for t in page.find_tables().tables if t.row_count >= 2 and t.col_count >= 2]
    except Exception:
        pass
    tboxes = [pymupdf.Rect(t.bbox) for t in tables]
    items = []  # (y, x0, x1, text)
    for t in tables:
        md = aio_table(page, t)
        if md:
            items.append((t.bbox[1], t.bbox[0], t.bbox[2], md))
    for b in page.get_text("dict")["blocks"]:
        lines = [l for l in b.get("lines", []) if l["spans"] and "".join(s["text"] for s in l["spans"]).strip()]
        if not lines or b["bbox"][1] < 45:  # running header and page number
            continue
        if any(pymupdf.Rect(b["bbox"]).intersects(tb) for tb in tboxes):
            continue
        first = "".join(s["text"] for s in lines[0]["spans"]).strip()
        if re.match(r"Figure \d+-\d+", first):
            continue
        groups, kinds = [], []
        for l in lines:
            spans = [s for s in l["spans"] if s["text"].strip()]
            kind = west_kind(spans[0])
            raw = "".join(s["text"] for s in l["spans"]).lstrip()
            new = (not groups or kind != kinds[-1] or kind.startswith("#") or raw.startswith(("•", "■"))
                   or re.match(r"^(\d+|[a-z])\.\t", raw) or raw.startswith(("Answer:", "Explanation:")))
            if new:
                groups.append([l])
                kinds.append(kind)
            else:
                groups[-1].append(l)
        for g, kind in zip(groups, kinds):
            if kind == "skip":
                continue
            text = ""
            for l in g:
                seg = west_line(l["spans"]).rstrip()
                if text.endswith("-") and seg[:1].islower():
                    text = text[:-1] + HYPHEN + seg.lstrip()  # resolved in book_west
                else:
                    text = (text + " " + seg.lstrip()) if text else seg
            text = re.sub(r"\s+", " ", text.replace("\t", " ").replace("­", "")).strip()
            if not text:
                continue
            if kind.startswith("#"):
                text = kind + text.replace("**", "")
            elif "SourceCodePro" in g[0]["spans"][0]["font"]:
                text = "`" + text + "`"
            elif re.match(r"^\*\*(Note|Exam Tip|Caution|Warning) [\d-]*", text):
                text = "> " + text
            elif text.startswith(("•", "■")):
                text = "- " + text.lstrip("•■ ").strip()
            x0, x1 = g[0]["bbox"][0], max(l["bbox"][2] for l in g)
            items.append((g[0]["bbox"][1], x0, x1, text))
    # Reading order: bands split by full-width items; in a band, the left column first.
    items.sort(key=lambda i: (i[0], i[1]))
    out, band = [], 0
    for y, x0, x1, text in items:
        full = x1 - x0 > width * 0.55 or text.startswith("## ")
        if full:
            band += 1
        col = 1 if (not full and x0 > width * 0.47) else 0
        out.append((band, col, y, x0, text))
    out.sort(key=lambda i: i[:4])
    return [i[4] for i in out]


WEST_DROP = [r"^Outline$", r"^Objectives$", r"^Applying Concepts", r"^Hands-On Projects$", r"^Capstone Projects$",
             r"^Project \d", r"^Capstone Project", r"^On the Job$", r"^Key Terms$", r"^Acronyms Checklist$"]
HYPHEN = "\x00"  # a hyphen at a line break: dropped when the joined word is used elsewhere in the book
WEST_BOILERPLATE = [r"Check your answers at the end of this chapter\.", r"Study the chapter.s outline",
                    r"For definitions of key terms, check the Glossary\.", r"After reading this chapter and completing"]


def west_body(paras):
    merged = []
    for p in paras:
        prev = merged[-1] if merged else ""
        if re.fullmatch(r"(\d+|[a-z])\.", prev):
            merged[-1] = prev + " " + p  # a list number in its own block
        elif re.match(r"(#+) ", p) and re.match(r"(#+) ", prev) and p.split(" ")[0] == prev.split(" ")[0]:
            merged[-1] = prev + " " + p.split(" ", 1)[1]  # a heading on two lines
        elif (prev and p[:1].islower() and not re.match(r"[a-z]\. ", p)
              and not prev.startswith(("#", "|", ">", "`")) and not prev.rstrip().endswith((".", ":", "?", "!"))):
            merged[-1] = prev + " " + p  # a paragraph split by a page break
        else:
            merged.append(p)
    md = "\n\n".join(merged)
    for b in WEST_BOILERPLATE:
        md = re.sub(r"^.*" + b + r".*\n?", "", md, flags=re.M)
    md = drop_sections(md, WEST_DROP)
    md = re.sub(r"\n\n(?=[a-f]\. )", "\n", md)  # answer options
    return compact_bullets(md)


def book_west(src, out):
    doc = pymupdf.open(str(src))
    toc = [(t, p) for lvl, t, p in doc.get_toc() if lvl == 1]
    # Every word in the book, to tell a line-break hyphen ("under-stand") from a real one ("peer-to-peer").
    words = set(w.lower() for pg in doc for w in re.findall(r"[A-Za-z]+", pg.get_text()))
    files = []
    for i, (title, start) in enumerate(toc):
        end = toc[i + 1][1] - 1 if i + 1 < len(toc) else doc.page_count
        m = re.match(r"Chapter (\d+): (.*)", title)
        if m:
            ch, name = int(m.group(1)), title
        elif title.startswith("Appendix B"):
            ch, name = "xb", "Appendix B: Calculating Subnets"
        elif title.startswith("Appendix C"):
            ch, name = "xc", "Appendix C: Practice Exam"
        elif title == "Glossary":
            ch, name = 99, "Glossary"
        else:
            continue  # front matter, objectives (see the official file), rubric, index
        paras = []
        for pg in range(start - 1, end):
            paras += west_page(doc[pg])
        if m:
            paras = [p for p in paras if p.strip() not in (m.group(2), "Chapter")]
        body = west_body(paras)
        body = re.sub(r"(\w+)\x00(\w+)", lambda m: m.group(1) + m.group(2) if (m.group(1) + m.group(2)).lower() in words
                      else m.group(1) + "-" + m.group(2), body).replace(HYPHEN, "-")
        objs = sorted(set(re.findall(r"Net\+ ([1-5]\.\d{1,2})", body)), key=lambda s: [int(x) for x in s.split(".")])
        header = (f"Source: CompTIA Network+ Guide to Networks (West), Cengage – {name}\nExam: {NET}"
                  + ("\nObjectives: " + ", ".join(objs) if objs else ""))
        files.append((write_chapter(out, ch, name, header, body), name, NET, objs))
    return files


# ---------------------------------------------------------------------------
# Security+ books. All four are for SY0-701, the exam before SY0-801. Their chapters keep
# the SY0-701 objective numbers; the content step tags each question with an SY0-801 objective.
# ---------------------------------------------------------------------------

SEC = "Security+ (SY0-701)"
SEC_NOTE = "(older objectives; the app targets SY0-801)"


def sec_header(book, ch, objs):
    return (f"Source: {book} – chapter {ch}\nExam: {SEC} {SEC_NOTE}"
            + ("\nObjectives: " + ", ".join(objs) if objs else ""))


def sort_objectives(objs):
    return sorted(set(objs), key=lambda s: [int(x) for x in s.split(".")])


def neil_sec_options(md):
    """In the review questions, a question whose stem goes on after a paragraph or a table has its
    options as a new top-level list ("1. Rule #1"). Indent that list under the question."""
    out, in_review, open_q, next_opt = [], False, False, 0
    for line in md.split("\n"):
        if line.startswith("## "):
            in_review = bool(re.match(r"## Chapter Review ?Questions", line))
        elif in_review and not line.strip():
            next_opt = 0  # the options of one question are one run of lines
        elif in_review:
            top = re.match(r"^(\d+)\. ", line)
            if top and next_opt and int(top.group(1)) == next_opt:
                line, next_opt = "  " + line, next_opt + 1
            elif top and top.group(1) == "1" and open_q:
                line, next_opt, open_q = "  " + line, 2, False
            elif top:
                open_q, next_opt = True, 0
            elif re.match(r"^  \d+\. ", line):
                open_q = False  # the question has its options
        out.append(line)
    return "\n".join(out)


def book_sec_neil(src, out):
    """Packt (Neil), EPUB: one chapter for each SY0-701 objective, answers in the Solutions file."""
    items = dict(epub_items(src))
    LIST_NUMBERS["honor"] = True
    _, sol = html_to_md(items["B21881_Solution_ePub.xhtml"])
    sols = split_by_heading(sol, r"^#+ Chapter (\d+): ")
    files = []
    for ch in range(1, 29):
        soup, md = html_to_md(items[f"B21881_{ch:02d}_ePub.xhtml"])
        heads = [h.get_text(" ").strip() for h in soup.find_all("h1")]
        heads = [h for h in heads if h and not h.isdigit() and h != "Introduction"]
        title = f"Chapter {ch}: {heads[0]}"
        md = re.sub(r"^(#+ .*\n\n?){1,2}", "", md)  # chapter number and title: write_chapter adds them
        md = re.sub(r"^The following questions are designed to check.*\n", "", md, flags=re.M)
        objs = sort_objectives(re.findall(r"^#+ Exam Objectives? (\d\.\d+)", md, re.M))
        md = neil_sec_options(md)
        md += "\n\n## Solutions\n\n" + sols.get(str(ch), "")
        book = "CompTIA Security+ SY0-701 Certification Guide, 3rd edition (Neil)"
        files.append((write_chapter(out, ch, title, sec_header(book, ch, objs), md), title, SEC, objs))
    LIST_NUMBERS["honor"] = False
    return files


def book_sec_heuermann(src, out):
    """Pearson Cert Guide (Heuermann), EPUB. The "Do I Know This Already?" quizzes have options but
    the answer appendix is "in development" in this edition, so they have no answers. The Review
    Questions are short-answer questions (no options)."""
    items = dict(epub_items(src))
    files = []
    book = "CompTIA Security+ SY0-701 Cert Guide (Heuermann)"
    for ch in range(1, 29):
        soup, md = html_to_md(items[f"ch{ch:02d}.html"])
        title = re.sub(r"^Chapter (\d+)\. ", r"Chapter \1: ", soup.find(["h1", "h2", "h3"]).get_text(" ").strip())
        md = re.sub(r"^#+ Chapter \d+\..*\n", "", md, count=1)
        objs = sort_objectives(re.findall(r"Objectives? (\d\.\d+)", md[:3000]))
        # Quiz options "**a.** text" -> "a. text"; the quiz intro, mapping table, and caution box are filler.
        md = re.sub(r"^\*\*([a-h])\.\*\*\s+", r"\1. ", md, flags=re.M)
        md = re.sub(r"^\*\*(\d+)\.\*\*\s+", r"\1. ", md, flags=re.M)
        md = re.sub(r"\n\n(?=[a-h]\. )", "\n", md)
        md = re.sub(r"(#+ [“”]Do I Know This Already\?” Quiz\n)(?:.|\n)*?(?=^1\. )", r"\1\n", md, flags=re.M)
        md = re.sub(r"^Answer the following review questions\..*\n", "", md, flags=re.M)
        files.append((write_chapter(out, ch, title, sec_header(book, ch, objs), md), title, SEC, objs))
    return files


def pdf_lines(doc, first, last, header):
    """Text lines of pages first..last (1-based), without the lines that match `header`."""
    lines = []
    for i in range(first - 1, last):
        for line in doc[i].get_text().split("\n"):
            if not header.match(line.strip()):
                lines.append(line.rstrip())
    return lines


def join_wrapped(parts, soft_hyphens):
    """Joins wrapped lines. With `soft_hyphens` (Seidl), a line that ends in '-' without a soft
    hyphen is a word broken in two; '-' plus a soft hyphen is a real hyphen."""
    text = ""
    for p in parts:
        p = p.strip()
        if not p:
            continue
        if not text:
            text = p
        elif soft_hyphens and text.endswith("-") and not text.endswith("-­"):
            text = text[:-1] + p
        elif text.endswith(("-", "­", "/")):
            text += p
        else:
            text += " " + p
    return text.replace("­", "")


def numbered_items(lines, start, soft_hyphens):
    """Question blocks: [[number, stem lines, [(letter, option lines)]]]; a new question is the next number."""
    items, expected = [], None
    for line in lines:
        t = line.strip()
        m = re.match(r"^(\d+)\.\s*(.*)", t) or re.match(r"^(\d+)\t\s*(.*)", line.lstrip(" "))  # Seidl: "58\t" (no period)
        if m and not t[len(m.group(1)):len(m.group(1)) + 1] == "." and int(m.group(1)) != expected:
            m = None
        if m and (expected is None and int(m.group(1)) == start or int(m.group(1)) in (expected, (expected or 0) + 1)):
            items.append([int(m.group(1)), [m.group(2)], []])
            expected = int(m.group(1)) + 1
            continue
        if not items:
            continue
        o = re.match(r"^\(?([A-H])[.)]\s*(.*)", t)
        opts = items[-1][2]
        if o and ord(o.group(1)) - ord("A") == len(opts):
            opts.append((o.group(1), [o.group(2)]))
        elif opts:
            opts[-1][1].append(t)
        else:
            items[-1][1].append(t)
    return [(n, join_wrapped(stem, soft_hyphens), [(l, join_wrapped(o, soft_hyphens)) for l, o in opts])
            for n, stem, opts in items]


def questions_md(items):
    out = []
    for n, stem, opts in items:
        out.append(f"{n}. {stem}")
        out += [f"  {l}. {o}" for l, o in opts]
    return "\n".join(out)


SEIDL_HEADER = re.compile(r"^(\d+|Chapter \d+ +■ +Domain.*|Appendix +■ +Answers.*|Chapter \d+: Domain \d\.0:.*)$")
SEIDL_DOMAINS = {  # chapter: (question pages, title)
    1: ((21, 48), "Domain 1.0: General Security Concepts"),
    2: ((49, 88), "Domain 2.0: Threats, Vulnerabilities, and Mitigations"),
    3: ((89, 134), "Domain 3.0: Security Architecture"),
    4: ((135, 188), "Domain 4.0: Security Operations"),
    5: ((189, 236), "Domain 5.0: Security Program Management and Oversight"),
}


def seidl_answers(doc):
    """{chapter: [(number, text)]} from the appendix; the numbers restart at 1 for each chapter."""
    lines = pdf_lines(doc, 238, 356, SEIDL_HEADER)
    # Answers 1–9 print the number on its own line: "1." then "B.  File encryption …".
    merged = []
    for line in lines:
        if merged and re.fullmatch(r"\d+\.", merged[-1].strip()):
            merged[-1] = merged[-1].strip() + " " + line.strip()
        else:
            merged.append(line)
    lines = merged
    chapters, cur = {}, None
    for line in lines:
        t = line.strip()
        m = re.match(r"^(\d+)\.\s+([A-H](?:,\s*[A-H])*)\.\s+(.*)", t)
        if m and (cur is None or int(m.group(1)) == 1 or int(m.group(1)) == cur[-1][0] + 1):
            if int(m.group(1)) == 1:
                cur = []
                chapters[len(chapters) + 1] = cur
            cur.append([int(m.group(1)), [f"{m.group(2)}. {m.group(3)}"]])
        elif cur and not re.match(r"^Chapter \d+: Domain", t) and t not in ("Concepts", "Mitigations", "and Oversight"):
            cur[-1][1].append(t)
    return {ch: [(n, join_wrapped(p, True)) for n, p in rows] for ch, rows in chapters.items()}


def book_sec_seidl(src, out):
    """Sybex Practice Tests (Seidl), PDF: one chapter for each SY0-701 domain, answers in the appendix."""
    doc = pymupdf.open(str(src))
    answers = seidl_answers(doc)
    files = []
    book = "CompTIA Security+ Practice Tests: Exam SY0-701 (Seidl)"
    for ch, ((first, last), name) in SEIDL_DOMAINS.items():
        lines = pdf_lines(doc, first, last, SEIDL_HEADER)
        topics = join_wrapped(lines[:next(i for i, l in enumerate(lines) if re.fullmatch(r"1\.(\s.*)?", l.strip()))], True)
        objs = sort_objectives(re.findall(r"[■✓](\d\.\d+) ", topics.replace("■ ■", "■").replace("■■", "■")))
        md = ["## Review Questions", "", questions_md(numbered_items(lines, 1, True)), "",
              "## Answers to Review Questions", ""]
        md += [f"{n}. {text}" for n, text in answers.get(ch, [])]
        title = f"Chapter {ch}: {name}"
        files.append((write_chapter(out, ch, title, sec_header(book, ch, objs), "\n".join(md)), title, SEC, objs))
    return files


GORG_HEADER = re.compile(r"^\d+$")  # page numbers
GORG_PARTS = [  # (file number, title, answer pages, first question number)
    (1, "Chapter 1: General Security Concepts", (51, 163), 1),
    (2, "Chapter 2: Threats, Vulnerabilities, and Mitigations", (204, 321), 111),
    (3, "Chapter 3: Implementation", (355, 446), 221),
    (4, "Chapter 4: Security Operations", (504, 658), 311),
    (5, "Chapter 5: Security Program Management and Oversight", (689, 771), 461),
    (6, "Exam Simulator 1", (808, 913), 1),
    (7, "Exam Simulator 2", (950, 1052), 101),
    (8, "Exam Simulator 3", (1090, 1197), 201),
    (9, "Exam Simulator 4", (1234, 1333), 301),
    (10, "Exam Simulator 5", (1371, 1473), 401),
    (11, "Exam Simulator 6", (1513, 1619), 501),
]


# "Question 1. …", and the book's typos "Question 394.Lisa", "Question 444 Omega", "Question 365.. Web", ".Question 456."
GORG_QUESTION = re.compile(r"^\.?Question (\d+)(?:\.{1,2}\s*|\s+)(?=\S)")


def book_sec_gorgotsias(src, out):
    """ExamsDigest Practice Tests (Gorgotsias), PDF. Each answer section repeats the question and its
    options before 'Explanation N. Correct Answer: C. …', so only the answer sections are read. The
    book numbers a few questions wrong (a repeated or skipped number), so blocks split at each
    'Question N.' line, not by number. The book has no PBQs in this edition's text."""
    doc = pymupdf.open(str(src))
    files = []
    book = "CompTIA Security+ SY0-701 Practice Tests & PBQs (Gorgotsias)"
    for num, title, (first, last), _ in GORG_PARTS:
        # An answer section can start and end in the middle of a page: read from the
        # "Answers N-M" title to the next section title.
        lines = [l.strip() for l in pdf_lines(doc, first - 1, last + 1, GORG_HEADER) if l.strip()]
        start = next(i for i, t in enumerate(lines) if re.fullmatch(r"Answers \d+-\d+", t))
        lines = lines[start + 1:]
        stop = next((i for i, t in enumerate(lines) if re.match(r"^(Questions \d+-\d+|Exam Simulator #\d+|Chapter \d+ |BONUSES)", t)), len(lines))
        lines = lines[:stop]
        # Options run into one line in a few places ("… respectively? ((A)       TechFirm … (B)       …",
        # "(D       Encrypting"): each "(X)" followed by a wide gap starts its own line.
        lines = [p.strip() for t in lines for p in re.sub(r"\s*\(+([A-H])\)?\s{3,}", r"\n(\1) ", t).split("\n") if p.strip()]
        blocks, cur = [], None
        for t in lines:
            if GORG_QUESTION.match(t):
                cur = {"q": [t], "opts": [], "exp": []}
                blocks.append(cur)
            elif cur is None:
                continue
            elif re.match(r"^Explanation \d+\.\s", t) or cur["exp"]:
                cur["exp"].append(t)
            elif re.match(r"^\([A-H]\)(\s|$)", t) and len(cur["opts"]) == ord(t[1]) - ord("A"):
                cur["opts"].append([t[3:].strip()])
            elif cur["opts"]:
                cur["opts"][-1].append(t)
            else:
                cur["q"].append(t)
        qs, ans = [], []
        for k, b in enumerate(blocks, start=1):
            n = GORG_QUESTION.match(b["q"][0])
            stem = join_wrapped([b["q"][0][n.end():]] + b["q"][1:], False)
            qs.append(f"{n.group(1)}. {stem}")
            qs += [f"  {chr(65 + i)}. {join_wrapped(o, False)}" for i, o in enumerate(b["opts"])]
            # "Explanation 1. Correct Answer: C. Non-repudiation. …", then "Option A is incorrect. …" paragraphs.
            paras, para = [], []
            for t in b["exp"]:
                if re.match(r"^Option [A-H] is (in)?correct\b", t) and para:
                    paras.append(join_wrapped(para, False))
                    para = []
                para.append(t)
            if para:
                paras.append(join_wrapped(para, False))
            first_para = re.sub(r"^Explanation \d+\.\s*Correct Answers?:\s*", "", paras[0]) if paras else ""
            ans.append(f"{n.group(1)}. {first_para}")
            ans += [f"    {p}" for p in paras[1:]]
        md = ["## Questions", "", "\n".join(qs), "", "## Answers", "", "\n".join(ans)]
        files.append((write_chapter(out, num, title, sec_header(book, num, []), "\n".join(md)), title, SEC, []))
    return files




# ---------------------------------------------------------------------------

BOOKS = {
    "exam-cram-2e": ("general", "CompTIAACore1(220-1201)andCore2(220-1202)ExamCram,2ndEdition-9780135447000.epub", book_exam_cram),
    "docter-study-guide": ("general", "COMPTIA A+ COMPLETE STUDY GUIDE by Quentin Docter.epub", book_docter),
    "neil-practice-tests": ("general", "CompTIA A+ Practice Tests Core 1 (220-1101) and Core 2 (220-1102) by Ian Neil.epub", book_neil),
    "aio-11e": ("general", "CompTIA A+ Certification All-in-One Exam Guide 11ed 2023.pdf", book_aio),
    "objectives-220-1201": ("general", "comptia-a-plus-220-1201-exam-objectives.pdf", book_objectives),
    "objectives-220-1202": ("general", "comptia-a-plus-220-1202-exam-objectives.pdf", book_objectives),
    "objectives-n10-009": ("network", "n10-009-exam-objectives.pdf", book_objectives),
    "objectives-sy0-801": ("sec", "CompTIA Security+ SY0-801 Exam Objectives (2.0).pdf", book_objectives),
    "sec-neil-cert-guide": ("sec", "Ian Neil - CompTIA Security+ SY0-701 Certification Guide, Third Edition (2024, Packt Publishing Pvt. Ltd.) - libgen.li.epub", book_sec_neil),
    "sec-heuermann-cert-guide": ("sec", "Lewis Heuermann - CompTIA Security+ SY0-701 Cert Guide (Certification Guide) (2024, Pearson IT Certification) - libgen.li.epub", book_sec_heuermann),
    "sec-seidl-practice-tests": ("sec", "David Seidl - CompTIA Security+ Practice Tests_ Exam SY0-701 (2024, Sybex) - libgen.li.pdf", book_sec_seidl),
    "sec-gorgotsias-practice-tests": ("sec", "Nikolaos Gorgotsias - CompTIA Security+ SY0-701 Practice Tests & PBQs_ Exam SY0-701 (2024, ExamsDigest LLC. and LabsDigest LLC) - libgen.li.pdf", book_sec_gorgotsias),
    "net-exam-cram": ("network", "Comptia Network+ N10-009 Exam Cram (Exam Cram (Pearson)){Emmett Dulaney}(2024, Pearson It Certification){105355531} libgen.li.epub", book_exam_cram_net),
    "net-zacker-practice-tests": ("network", "CompTIA Network+ Practice Tests_ Exam N10-009{Craig Zacker}(2024, Sybex){105351008} libgen.li.epub", book_zacker),
    "net-west-guide": ("network", "CompTIA Network+ Guide to Networks{Jill West}(224, Cengage Learning){107908711} libgen.li.pdf", book_west),
}


def main(keys):
    for key in keys or BOOKS:
        cat, fname, fn = BOOKS[key]
        out = OUT / cat / key
        if out.exists():
            for f in out.glob("*.md"):
                f.unlink()
        files = fn(SRC / cat / fname, out)
        lines = [f"{f}\t{core}\t{','.join(objs)}\t{title}" for f, title, core, objs in files]
        (out / "_chapters.tsv").write_text("\n".join(lines) + "\n", encoding="utf-8")
        print(f"{key}: {len(files)} files")


if __name__ == "__main__":
    main(sys.argv[1:])
