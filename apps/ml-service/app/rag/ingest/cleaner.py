"""
app/rag/ingest/cleaner.py
-------------------------
Turns raw PDF page text into clean KB text. Raw loaders return everything:
title/author/affiliation blocks, running headers/footers, page numbers,
reference lists, tables, promo lines, words broken across lines. If those go
into the vector store, retrieval returns junk. Steps, per source:

  1. page selection      start_page / end_page / skip_pages
  2. control chars       invisible junk characters are stripped
  3. start / end cut     start_at_pattern, end_at_pattern, and a real
                         "References" heading (only if citation entries follow it,
                         so a table column called "References" is NOT mistaken for it)
  4. junk lines          repeated headers/footers (auto), lone page numbers,
                         e-mail / phone / fax lines, drop_line_patterns, drop_blocks
  5. reference pages     pages that look like a bibliography are dropped
  6. normalisation       unicode ligatures, de-hyphenation, line re-flow
  7. empty pages         pages with almost no text (scans/figures) are dropped

Every drop is counted in a CleanReport so `--dry-run` shows exactly what was
thrown away and you can verify it instead of trusting it blindly.
"""

import math
import re
import unicodedata
from collections import Counter
from dataclasses import dataclass, field

from langchain_core.documents import Document

from app.rag.ingest.manifest import SourceConfig

_PAGE_NUM = re.compile(r"^\s*(page\s*)?\d{1,4}(\s*(of|/)\s*\d{1,4})?\s*$", re.IGNORECASE)
_BULLET = re.compile(r"^\s*([•●▪■◦‣➢✓\-\*–]|\d{1,2}[.)]|[a-z][.)])\s+")
# "3.3.2" style section / recommendation numbers on their own line
_SECTION_NUM = re.compile(r"^\s*\d{1,2}(\.\d{1,2}){1,4}\.?(\s|$)")
_PUA = re.compile(r"[\ue000-\uf8ff]")  # private-use glyphs from Symbol/Wingdings bullet fonts
_CONTROL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f]")
_URL = re.compile(r"https?://|\bwww\.", re.IGNORECASE)
_CONTACT = re.compile(r"[\w.+\-]+@[\w\-]+\.[\w.\-]+|\b(?:tel|fax|e-?mail)\b\s*[.:]", re.IGNORECASE)

# Bibliography detection: numbered / "Surname AB," entry starts + citation signals
_REF_START = re.compile(r"^\s*(\[\d{1,3}\]|\d{1,3}[.)])\s+[A-Z]|^\s*[A-Z][A-Za-z'’\-]+\s+[A-Z]{1,3}[,.]\s")
_CITATION_SIGNAL = re.compile(
    r"(doi\.org|\bdoi:|\bpmid\b|\bet al\b|\[(?:crossref|pubmed|google scholar)\]"
    r"|\b(19|20)\d{2};\s*\d+|\b(19|20)\d{2}\W+\d{1,4}\s*[(:]\s*\d|\b(19|20)\d{2},\s*\d{1,4},\s*[\w.\-–]+)",
    re.IGNORECASE,
)
_FIRST_ENTRY = re.compile(r"^\s*(\[1\]|1[.)])(\s|$)")
_REF_HEADING = re.compile(r"^\s*(?:\d{1,2}\.?\s*)?(?:references?|bibliography|literature cited|works cited)\s*:?\s*$", re.IGNORECASE)

MIN_PAGE_CHARS = 80
EDGE_LINES = 3  # how many lines at the top/bottom of a page count as header/footer zone


@dataclass
class CleanReport:
    source: str
    pages_total: int = 0
    pages_selected: int = 0
    pages_kept: int = 0
    dropped_reference_pages: list[int] = field(default_factory=list)
    dropped_empty_pages: list[int] = field(default_factory=list)
    dropped_after_end_pages: list[int] = field(default_factory=list)
    cut_at_page: int | None = None
    lines_before_start: int = 0
    block_lines_removed: int = 0
    contact_lines_removed: int = 0
    boilerplate_lines_removed: int = 0
    boilerplate_samples: list[str] = field(default_factory=list)
    notes: list[str] = field(default_factory=list)


def _norm_key(line: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"\d+", "#", line.strip().lower()))


def _edge_indices(lines: list[str]) -> set[int]:
    non_empty = [i for i, l in enumerate(lines) if l.strip()]
    return set(non_empty[:EDGE_LINES]) | set(non_empty[-EDGE_LINES:])


def _detect_boilerplate(page_lines: list[list[str]]) -> set[str]:
    """Header/footer lines = short lines near page edges that repeat on many pages."""
    counts: Counter[str] = Counter()
    for lines in page_lines:
        keys = {_norm_key(lines[i]) for i in _edge_indices(lines) if 0 < len(lines[i].strip()) <= 120}
        counts.update(keys)
    threshold = max(2, math.ceil(0.3 * len(page_lines)))
    return {k for k, c in counts.items() if c >= threshold and k and not _PAGE_NUM.match(k)}


def _is_reference_page(text: str) -> bool:
    lines = [l for l in text.splitlines() if l.strip()]
    if len(lines) < 8:
        return False
    entries = sum(1 for l in lines if _REF_START.search(l))
    signals = sum(1 for l in lines if _CITATION_SIGNAL.search(l))
    return entries >= 5 and signals >= 3 and (entries + signals) / len(lines) >= 0.35


def _is_end_marker(lines: list[str], i: int, end_rx, cut_refs: bool) -> bool:
    line = lines[i]
    if end_rx and end_rx.search(line):
        return True
    if cut_refs and _REF_HEADING.match(line):
        # a real reference list starts with entry "1." / "[1]" (or has several entries nearby);
        # a table column header called "References" does not
        following = [l for l in lines[i + 1:] if l.strip()][:20]
        if following and _FIRST_ENTRY.match(following[0]):
            return True
        return sum(1 for l in following if _REF_START.search(l)) >= 2
    return False


def _reflow(text: str) -> str:
    """Rebuild paragraphs: PDF extraction hard-wraps lines mid-sentence."""
    out, cur = [], ""
    for raw in text.split("\n"):
        line = raw.strip()
        if not line:
            if cur:
                out.append(cur)
                cur = ""
            continue
        if not cur:
            cur = line
            continue
        starts_new = (
            _BULLET.match(line)
            or _SECTION_NUM.match(line)
            or (cur[-1] in ".:;?!" and line[0].isupper())
            or (line.isupper() and len(line) < 80 and len(re.findall(r"[A-Za-z]", line)) >= 7)  # not acronyms like (PCOS)
        )
        if starts_new:
            out.append(cur)
            cur = line
        else:
            cur += " " + line
    if cur:
        out.append(cur)
    return "\n\n".join(out)


def _normalise(text: str) -> str:
    text = unicodedata.normalize("NFKC", text)          # ligatures: ﬁ -> fi
    text = text.replace("\u00ad", "")                   # soft hyphens
    text = re.sub(r"^[ \t]*[\ue000-\uf8ff]+[ \t]*$\n?", "", text, flags=re.MULTILINE)  # lines that are ONLY a glyph
    text = re.sub(r"^[ \t]*[\ue000-\uf8ff][ \t]*", "• ", text, flags=re.MULTILINE)  # symbol-font bullet -> real bullet
    text = _PUA.sub("", text)                           # any other private-use junk glyph
    text = re.sub(r"(?<=[a-z])-\n(?=[a-z])", "", text)  # co-\noperate -> cooperate
    text = re.sub(r"[ \t]+", " ", text)
    return _reflow(text).strip()


def clean_pages(pages: list[Document], cfg: SourceConfig) -> tuple[list[Document], CleanReport]:
    source = pages[0].metadata["source"] if pages else "?"
    report = CleanReport(source=source, pages_total=len(pages))

    # 1. page selection
    selected = [
        p for p in pages
        if (cfg.start_page is None or p.metadata["page"] >= cfg.start_page)
        and (cfg.end_page is None or p.metadata["page"] <= cfg.end_page)
        and p.metadata["page"] not in cfg.skip_pages
    ]
    report.pages_selected = len(selected)

    # 2. control characters
    page_lines = [_CONTROL.sub("", p.page_content).splitlines() for p in selected]
    boilerplate = _detect_boilerplate(page_lines)

    flags = re.IGNORECASE
    custom = [re.compile(pat, flags) for pat in cfg.drop_line_patterns]
    blocks = [(re.compile(a, flags), re.compile(b, flags)) for a, b in cfg.drop_blocks]
    start_rx = re.compile(cfg.start_at_pattern, flags) if cfg.start_at_pattern else None
    end_rx = re.compile(cfg.end_at_pattern, flags) if cfg.end_at_pattern else None

    started = start_rx is None
    if start_rx and not any(start_rx.search(l) for lines in page_lines for l in lines):
        report.notes.append(f"start_at_pattern {cfg.start_at_pattern!r} matched nothing -> kept everything")
        started = True
    if end_rx and not any(end_rx.search(l) for lines in page_lines for l in lines):
        report.notes.append(f"end_at_pattern {cfg.end_at_pattern!r} matched nothing")
    ended = False
    active_end = None  # end-regex of the drop_block currently being skipped

    kept: list[Document] = []
    for page, lines in zip(selected, page_lines):
        page_no = page.metadata["page"]
        if ended:
            report.dropped_after_end_pages.append(page_no)
            continue

        edges = _edge_indices(lines)
        survivors = []
        for i, line in enumerate(lines):
            # 3. start / end cut
            if not started:
                if start_rx.search(line):
                    started = True
                else:
                    report.lines_before_start += 1
                    continue
            if _is_end_marker(lines, i, end_rx, cfg.cut_at_references):
                ended = True
                report.cut_at_page = page_no
                break

            # 4. junk lines
            if active_end is not None:
                if active_end.search(line):
                    active_end = None            # block over; this line itself is kept
                else:
                    report.block_lines_removed += 1
                    continue
            else:
                opened = next((b for b in blocks if b[0].search(line)), None)
                if opened:
                    active_end = opened[1]
                    report.block_lines_removed += 1
                    continue

            if _CONTACT.search(line):
                report.contact_lines_removed += 1
                continue
            is_edge_junk = i in edges and (
                _norm_key(line) in boilerplate or _PAGE_NUM.match(line) or _URL.search(line)
            )
            is_custom_junk = any(rx.search(line) for rx in custom)
            if is_edge_junk or is_custom_junk:
                report.boilerplate_lines_removed += 1
                if len(report.boilerplate_samples) < 5 and line.strip():
                    report.boilerplate_samples.append(line.strip()[:80])
                continue
            survivors.append(line)
        text = "\n".join(survivors)

        # 5. reference pages (for sources without a clear "References" heading)
        if cfg.detect_references and _is_reference_page(text):
            report.dropped_reference_pages.append(page_no)
            continue

        # 6. normalise   7. empty pages
        text = _normalise(text)
        if len(text) < MIN_PAGE_CHARS:
            report.dropped_empty_pages.append(page_no)
            continue

        kept.append(Document(page_content=text, metadata=dict(page.metadata)))

    report.pages_kept = len(kept)
    return kept, report