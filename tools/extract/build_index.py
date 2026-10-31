"""Write sources-text/sources-index.md from the _chapters.tsv file of each book.

Dev-only tool. It is not part of the app.

    tools/extract/.venv/bin/python -I tools/extract/build_index.py
"""

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
TEXT = ROOT / "sources-text"

DOMAINS = {
    "C1": {1: "Mobile Devices", 2: "Networking", 3: "Hardware", 4: "Virtualization and Cloud Computing",
           5: "Hardware and Network Troubleshooting"},
    "C2": {1: "Operating Systems", 2: "Security", 3: "Software Troubleshooting", 4: "Operational Procedures"},
    "N": {1: "Networking Concepts", 2: "Network Implementation", 3: "Network Operations", 4: "Network Security",
          5: "Network Troubleshooting"},
    "S": {1: "General Security Concepts", 2: "Threats, Vulnerabilities, and Attacks", 3: "Security Architecture",
          4: "Security Operations", 5: "Security Program Management and Oversight"},
}
EXAM_LABEL = {"C1": "Core 1", "C2": "Core 2", "N": "Network+", "S": "Security+"}

# The Security+ books are for SY0-701. Each SY0-701 objective and the SY0-801 objectives that cover most
# of its topics (by objective title and topic list), with what moved. A starting point for tagging book
# questions with an SY0-801 objective: check each question against the SY0-801 objectives file.
SEC_OBJECTIVE_MAP = [  # (SY0-701, SY0-701 title, SY0-801, note)
    ("1.1", "Compare and contrast various types of security controls", "1.1", ""),
    ("1.2", "Summarize fundamental security concepts", "1.1, 3.2, 4.1",
     "CIA, AAA, non-repudiation, and Zero Trust principles are in 1.1; Zero Trust architecture in 3.2; deception technology in 4.1; physical security in 2.3 (physical-based vectors) and 4.1."),
    ("1.3", "Explain the importance of change management processes and the impact to security", "1.2", ""),
    ("1.4", "Explain the importance of using appropriate cryptographic solutions", "1.3", ""),
    ("2.1", "Compare and contrast common threat actors and motivations", "2.2", ""),
    ("2.2", "Explain common threat vectors and attack surfaces", "2.3", "Some attack surfaces are in 2.4."),
    ("2.3", "Explain various types of vulnerabilities", "2.4", ""),
    ("2.4", "Given a scenario, analyze indicators of malicious activity", "2.5", ""),
    ("2.5", "Explain the purpose of mitigation techniques used to secure the enterprise", "4.1", "Segmentation, access control, hardening, and application allow lists."),
    ("3.1", "Compare and contrast security implications of different architecture models", "3.1", ""),
    ("3.2", "Given a scenario, apply security principles to secure enterprise infrastructure", "3.2, 4.1", "Firewalls and IDS/IPS are in 4.1."),
    ("3.3", "Compare and contrast concepts and strategies to protect data", "3.3", ""),
    ("3.4", "Explain the importance of resilience and recovery in security architecture", "3.4", ""),
    ("4.1", "Given a scenario, apply common security techniques to computing resources", "4.1", ""),
    ("4.2", "Explain the security implications of proper hardware, software, and data asset management", "4.2", ""),
    ("4.3", "Explain various activities associated with vulnerability management", "4.3, 2.1", "Threat feeds, CVSS, and CVE are in 2.1."),
    ("4.4", "Explain security alerting and monitoring concepts and tools", "4.4", ""),
    ("4.5", "Given a scenario, modify enterprise capabilities to enhance security", "4.1", "Firewalls, IDS/IPS, web and DNS filtering, email security, DLP, NAC, and EDR."),
    ("4.6", "Given a scenario, implement and maintain identity and access management", "4.5", ""),
    ("4.7", "Explain the importance of automation and orchestration related to secure operations", "4.6", ""),
    ("4.8", "Explain appropriate incident response activities", "4.7", "Forensics topics (chain of custody, legal hold) may be in 4.8."),
    ("4.9", "Given a scenario, use data sources to support an investigation", "4.8", ""),
    ("5.1", "Summarize elements of effective security governance", "5.1", ""),
    ("5.2", "Explain elements of the risk management process", "5.2", ""),
    ("5.3", "Explain the processes associated with third-party risk assessment and management", "5.3", ""),
    ("5.4", "Summarize elements of effective security compliance", "5.4", ""),
    ("5.5", "Explain types and purposes of audits and assessments", "5.5", ""),
    ("5.6", "Given a scenario, implement security awareness practices", "5.6", ""),
]
SEC_NEW = ("New in SY0-801, with no SY0-701 objective: 2.6 (threats and vulnerabilities of AI usage) and the AI topics "
           "of 4.6. Check every SY0-801 topic against the books before you write content: other topics are new too "
           "(for example the large language model, identity provider, and public repository attack surfaces in 2.4).")
SEC_701_TO_801 = {old: new.split(", ") for old, _, new, _ in SEC_OBJECTIVE_MAP}
# Gorgotsias chapters have no objectives: chapter 1–5 is the SY0-701 domain (chapter 3 is
# "Implementation", the SY0-601 name, but its questions are on Security Architecture).
GORG_DOMAINS = {1: 1, 2: 2, 3: 3, 4: 4, 5: 5}


def label(c, n):
    return f"{EXAM_LABEL[c]} {n} {DOMAINS[c][n]}"

BOOKS = [  # (category, folder, title, objectives, use)
    ("general", "objectives-220-1201", "CompTIA A+ Core 1 (220-1201) Exam Objectives (official)", "220-1201",
     "The official objectives and acronym list. Use it to check that content matches an objective and as the main source for acronyms."),
    ("general", "objectives-220-1202", "CompTIA A+ Core 2 (220-1202) Exam Objectives (official)", "220-1202",
     "The official objectives and acronym list. Use it to check that content matches an objective and as the main source for acronyms."),
    ("general", "exam-cram-2e", "CompTIA A+ Core 1 (220-1201) and Core 2 (220-1202) Exam Cram, 2nd ed.", "220-1201/1202",
     "Current objectives. Short chapters by objective. Cram Quiz questions with answers at the end of each chapter, two practice exams, and a cram sheet."),
    ("general", "docter-study-guide", "CompTIA A+ Complete Study Guide (Docter), Core 1 and Core 2", "220-1201/1202",
     "Current objectives. Most detail. Exam Essentials and Review Questions in each chapter; the answers are added at the end of each chapter."),
    ("general", "aio-11e", "CompTIA A+ Certification All-in-One Exam Guide, 11th ed.", "220-1101/1102",
     "Older objectives. Good background and troubleshooting detail; check facts against the current books. Review questions with answers in each chapter. Has the only glossary."),
    ("general", "neil-practice-tests", "CompTIA A+ Practice Tests Core 1 (220-1101) and Core 2 (220-1102) (Neil)", "220-1101/1102",
     "Older objectives. Practice questions only, grouped by objective, with the solutions added at the end of each chapter. Some answers have errors; check them."),
    ("network", "objectives-n10-009", "CompTIA Network+ (N10-009) Exam Objectives (official)", "N10-009",
     "The official objectives and acronym list. Use it to check that content matches an objective and as the main source for Network+ acronyms."),
    ("network", "net-exam-cram", "CompTIA Network+ N10-009 Exam Cram (Dulaney)", "N10-009",
     "Short chapters by objective. CramSaver and Cram Quiz questions with answers in each chapter, a cram sheet, and a glossary."),
    ("network", "net-zacker-practice-tests", "CompTIA Network+ Practice Tests: Exam N10-009 (Zacker)", "N10-009",
     "Practice questions only, grouped by objective, plus two practice tests. The answers with explanations are added at the end of each chapter."),
    ("network", "net-west-guide", "CompTIA Network+ Guide to Networks (West), Cengage", "N10-009",
     "Textbook with the most explanation. Self-Check questions with answers, review and scenario questions (no answers), key terms, an acronym checklist in each chapter, a practice exam, and a glossary."),
    ("sec", "objectives-sy0-801", "CompTIA Security+ (SY0-801) Exam Objectives (official)", "SY0-801",
     "The official objectives (version 2.0) and acronym list. Use it to check that content matches an objective and as the main source for Security+ acronyms."),
    ("sec", "sec-heuermann-cert-guide", "CompTIA Security+ SY0-701 Cert Guide (Heuermann), Pearson", "SY0-701",
     "Older objectives. Study guide, one chapter for each SY0-701 objective. \"Do I Know This Already?\" quizzes without answers (the answer appendix is not in this edition) and short-answer review questions."),
    ("sec", "sec-neil-cert-guide", "CompTIA Security+ SY0-701 Certification Guide, 3rd ed. (Neil), Packt", "SY0-701",
     "Older objectives. Study guide, one chapter for each SY0-701 objective, with a summary of the objective. Chapter review questions; the solutions are added at the end of each chapter."),
    ("sec", "sec-seidl-practice-tests", "CompTIA Security+ Practice Tests: Exam SY0-701 (Seidl), Sybex", "SY0-701",
     "Older objectives. Practice questions only, one chapter for each domain (not grouped by objective). The answers with explanations are added at the end of each chapter."),
    ("sec", "sec-gorgotsias-practice-tests", "CompTIA Security+ SY0-701 Practice Tests & PBQs (Gorgotsias), ExamsDigest", "SY0-701",
     "Older objectives. Practice questions only: one chapter for each domain and six 100-question exam simulators, each answer with a reason for every wrong option. No objective numbers."),
]

# The All-in-One chapters do not list objectives. Domains from the book's exam markers and topics.
AIO_DOMAINS = {
    1: "C1:5 C2:4", 2: "C1:3 C2:1", 3: "C1:3,5", 4: "C1:3,5", 5: "C1:3", 6: "C1:3,5", 7: "C1:3,5 C2:4",
    8: "C1:3,5", 9: "C1:3,5 C2:1", 10: "C1:3", 11: "C2:1", 12: "C2:1", 13: "C2:1,2", 14: "C2:1,3,4",
    15: "C2:1,4", 16: "C1:5 C2:3", 17: "C1:3,5 C2:1", 18: "C1:2", 19: "C1:2,5 C2:1", 20: "C1:2,5 C2:2",
    21: "C1:2 C2:2,4", 22: "C1:4", 23: "C1:1,5", 24: "C1:1 C2:1", 25: "C1:5 C2:2,3", 26: "C1:3,5",
    27: "C2:2,3", 28: "C2:4",
}


def domains_for(folder, fname, core, objs):
    if folder == "aio-11e":
        m = re.match(r"(\d+)-", fname)
        spec = AIO_DOMAINS.get(int(m.group(1))) if m else None
        if not spec:
            return "All A+"
        out = []
        for part in spec.split():
            c, nums = part.split(":")
            out += [label(c, int(n)) for n in nums.split(",")]
        return "; ".join(out)
    c = "S" if "Security+" in core else "N" if "Network+" in core else "C1" if "Core 1" in core else "C2"
    every = {"S": "All Security+", "N": "All Network+"}.get(c, "All A+")
    if folder == "sec-gorgotsias-practice-tests":
        m = re.match(r"(\d+)-chapter-", fname)
        return label(c, GORG_DOMAINS[int(m.group(1))]) if m else every
    if not objs or folder.startswith("objectives-"):
        return every
    objs = objs.split(",")
    if c == "S":  # SY0-701 objective numbers -> SY0-801 domains
        objs = [new for o in objs for new in SEC_701_TO_801.get(o, [o])]
    majors = sorted({int(o.split(".")[0]) for o in objs})
    return "; ".join(label(c, n) for n in majors if n in DOMAINS[c])


def main():
    lines = ["# Sources index", "",
             "Links each extracted chapter to its exam and domains. Generated by `tools/extract/build_index.py`.",
             "Domain numbers follow `docs/compTIA-exam-overviews.md` (220-1201/1202, N10-009, and SY0-801). The 220-1101/1102 books use the same domain numbers as 220-1201/1202. The Security+ books are for SY0-701: their Objectives column has SY0-701 numbers, and their Domains column has the SY0-801 domains (see \"Security+ objective map\").",
             "", "Files are in `sources-text/<category>/<book>/`: `general/` for A+ (both cores), `network/` for Network+, and `sec/` for Security+. For A+, use the current-objective books (220-1201/1202) first. Keep the content of each certification apart.",
             "", "## Books", "", "| Folder | Book | Objectives | Use |", "|---|---|---|---|"]
    for cat, folder, title, objv, use in BOOKS:
        lines.append(f"| `{cat}/{folder}/` | {title} | {objv} | {use} |")
    lines += ["", "Other files:", "",
              "- `derived/a-plus-acronyms.md` – the official 220-1201 and 220-1202 acronym lists merged, with notes where they differ. The main source for `content/acronyms/`.",
              "- `derived/acronym-candidates.md` – acronym and expanded-form pairs found in the books, marked when they are on the official list (from `tools/extract/derive_terms.py`).",
              "- `general/aio-11e/99-glossary.md` – A+ glossary of terms (220-1101/1102 book).",
              "- `derived/network-plus-acronyms.md` – the official N10-009 acronym list, with notes. The main source for Network+ `content/acronyms/`.",
              "- `derived/network-plus-acronym-candidates.md` – acronym pairs found in the Network+ books.",
              "- `network/net-exam-cram/x2-glossary.md` and `network/net-west-guide/99-glossary.md` – Network+ glossaries.",
              "- `derived/security-plus-acronyms.md` – the official SY0-801 acronym list, with notes. The main source for Security+ `content/acronyms/`.",
              "- `derived/security-plus-acronym-candidates.md` – acronym pairs found in the Security+ books.",
              "- The Security+ books have no glossary (the Heuermann glossary is not in this edition).", ""]
    lines += ["## Security+ objective map", "",
              "The Security+ books are for SY0-701. Each SY0-701 objective and the SY0-801 objectives that cover most of its topics. "
              "A starting point only: tag each book question with the SY0-801 objective whose topics it tests.", "",
              "| SY0-701 | SY0-701 objective | SY0-801 | Note |", "|---|---|---|---|"]
    lines += [f"| {o} | {t} | {n} | {note} |" for o, t, n, note in SEC_OBJECTIVE_MAP]
    lines += ["", SEC_NEW, ""]

    by_domain = {}
    for cat, folder, title, objv, _ in BOOKS:
        tsv = TEXT / cat / folder / "_chapters.tsv"
        if not tsv.exists():
            continue
        lines += [f"## {title}", "", "| File | Exam | Objectives | Domains |", "|---|---|---|---|"]
        for row in tsv.read_text(encoding="utf-8").splitlines():
            fname, core, objs, ctitle = row.split("\t")
            doms = domains_for(folder, fname, core, objs)
            lines.append(f"| [{ctitle}]({cat}/{folder}/{fname}) | {core} | {objs.replace(',', ', ') or '–'} | {doms} |")
            for d in doms.split("; "):
                by_domain.setdefault(d, []).append(f"{cat}/{folder}/{fname}")
        lines.append("")

    lines += ["## By domain", ""]
    def key(d):
        order = {"Core 1": 1, "Core 2": 2, "Network+": 3, "Security+": 4, "All A+": 8, "All Network+": 9, "All Security+": 10}
        m = re.match(r"(Core \d|Network\+|Security\+) (\d)", d)
        return (order[m.group(1)], int(m.group(2))) if m else (order.get(d, 11), 0)
    for d in sorted(by_domain, key=key):
        lines += [f"### {d}", ""] + [f"- [{p.split('/')[-1]}]({p})" for p in by_domain[d]] + [""]
    (TEXT / "sources-index.md").write_text("\n".join(lines), encoding="utf-8")
    print(f"{len(by_domain)} domain groups")


if __name__ == "__main__":
    main()
