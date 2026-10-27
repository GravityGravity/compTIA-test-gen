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


def list_md(lst, depth=0):
    lines = []
    ordered = lst.name == "ol"
    first_li = lst.find("li", recursive=False)
    classes = " ".join(lst.get("class", []) + (first_li.get("class", []) if first_li else [])).lower()
    alpha = "alpha" in classes or lst.get("type") in ("A", "a")
    n = 0
    for li in lst.find_all("li", recursive=False):
        n += 1
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


def obj_parse(doc):
    """Exam details, domains, objectives, and the acronym list of one objectives PDF."""
    details, domains, objectives, acronyms = [], [], [], []
    front = re.sub(r"\s+", " ", " ".join(doc[i].get_text() for i in range(1, 3)))
    for label in ("Number of questions", "Types of questions", "Length of test", "Passing Score"):
        m = re.search(re.escape(label) + r" (.+?) (?=Number of|Types of|Length of|Recommended|Passing|EXAM OBJECTIVES)", front, re.I)
        if m:
            details.append((label, m.group(1).strip()))
    domains = re.findall(r"(\d\.0) ([A-Za-z ,]+?) (\d+%)", front)
    m = re.search(r"The troubleshooting methodology includes the following steps: (.+?) DOMAIN", front)
    method = [s.strip() for s in re.split(r"[•]", m.group(1)) if s.strip()] if m else []
    method = [re.sub(r" - ", "\n   - ", s) for s in method]  # sub-steps

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


def book_objectives(src, out):
    code = re.search(r"220-\d{4}|n10-\d{3}", src.name, re.I).group(0).upper()
    core = "Network+" if code.startswith("N10") else "Core 1" if code.endswith("1") else "Core 2"
    details, domains, method, objectives, acronyms = obj_parse(pymupdf.open(str(src)))
    cert = "" if core == "Network+" else "A+ "
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
        md += [f"### {o['num']} {o['title']}", "", obj_items(o["lines"]), ""]
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

BOOKS = {
    "exam-cram-2e": ("general", "CompTIAACore1(220-1201)andCore2(220-1202)ExamCram,2ndEdition-9780135447000.epub", book_exam_cram),
    "docter-study-guide": ("general", "COMPTIA A+ COMPLETE STUDY GUIDE by Quentin Docter.epub", book_docter),
    "neil-practice-tests": ("general", "CompTIA A+ Practice Tests Core 1 (220-1101) and Core 2 (220-1102) by Ian Neil.epub", book_neil),
    "aio-11e": ("general", "CompTIA A+ Certification All-in-One Exam Guide 11ed 2023.pdf", book_aio),
    "objectives-220-1201": ("general", "comptia-a-plus-220-1201-exam-objectives.pdf", book_objectives),
    "objectives-220-1202": ("general", "comptia-a-plus-220-1202-exam-objectives.pdf", book_objectives),
    "objectives-n10-009": ("network", "n10-009-exam-objectives.pdf", book_objectives),
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
