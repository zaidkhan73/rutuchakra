"""
app/rag/ingest/splitter.py
--------------------------
Cleaned pages -> overlapping chunks (RecursiveCharacterTextSplitter), with
metadata and a deterministic id per chunk.

Pages are first MERGED into one continuous text per document, then split.
Reason: a sentence that runs across a page break ("... PUFAs enhance" | "the
reproductive performance ...") must stay in ONE chunk. Splitting page by page
cut a sentence in two at every page boundary (up to ~2 broken chunks per page).
Each chunk still records exact page numbers: `page` (where it starts) and
`page_end` (where it ends), found by tracking character offsets.

Tiny pieces (a heading line, a one-sentence paragraph) are merged into the next
chunk instead of being dropped, so headings survive.

Why deterministic ids: id = uuid5(source | page | sha1(text)). Re-running
ingestion on an unchanged PDF produces the same ids, so unchanged chunks are
skipped (no repeat embedding calls = no wasted free quota), and chunks that
disappeared after you edit the manifest/PDF can be found and deleted.
"""

import hashlib
import re
import uuid
from bisect import bisect_right

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.core.config import Settings

_NAMESPACE = uuid.uuid5(uuid.NAMESPACE_URL, "rutuchakra-kb")


def chunk_id(source: str, page: int, text: str) -> str:
    digest = hashlib.sha1(text.encode("utf-8")).hexdigest()
    return str(uuid.uuid5(_NAMESPACE, f"{source}|{page}|{digest}"))


def _merge_pages(pages: list[Document]) -> tuple[str, list[int], list[int]]:
    """
    Join cleaned pages into one text. Returns (text, page_start_offsets, page_numbers).
    If a page ends mid-sentence and the next consecutive page continues it
    (starts lowercase), the two are joined seamlessly (and a trailing hyphen is removed).
    """
    merged = ""
    offsets: list[int] = []
    numbers: list[int] = []
    prev_page: int | None = None
    for p in pages:
        text, page = p.page_content, p.metadata["page"]
        if merged:
            sep = "\n\n"
            if prev_page is not None and page == prev_page + 1 and text[:1].islower():
                if re.search(r"[A-Za-z]-$", merged):
                    merged, sep = merged[:-1], ""          # "inflam-" + "mation"
                elif merged[-1] not in ".!?:;)\"”":
                    sep = " "                              # sentence continues on the next page
            merged += sep
        offsets.append(len(merged))
        numbers.append(page)
        merged += text
        prev_page = page
    return merged, offsets, numbers


def split_pages(pages: list[Document], s: Settings) -> tuple[list[Document], list[str]]:
    if not pages:
        return [], []
    merged, offsets, numbers = _merge_pages(pages)

    def page_at(pos: int) -> int:
        return numbers[max(0, bisect_right(offsets, pos) - 1)]

    splitter = RecursiveCharacterTextSplitter(
        chunk_size=s.kb_chunk_size,
        chunk_overlap=s.kb_chunk_overlap,
        separators=["\n\n", "\n", ". ", " ", ""],
        keep_separator="end",   # keep the full stop with the sentence it ends
        add_start_index=True,
    )
    base = {k: v for k, v in pages[0].metadata.items() if k != "page"}

    # Tiny pieces (a heading line, a one-sentence paragraph) are merged into the NEXT chunk
    # instead of being dropped, so headings like "1.2 Biochemical hyperandrogenism" survive.
    pieces: list[tuple[int, str]] = []          # (start offset, text)
    carry: tuple[int, str] | None = None
    for doc in splitter.create_documents([merged], metadatas=[base]):
        text = doc.page_content.strip()
        start = doc.metadata.get("start_index", 0)
        if carry:
            start, text = carry[0], carry[1] + "\n\n" + text
            carry = None
        if len(text) < s.kb_min_chunk_chars:
            carry = (start, text)
            continue
        pieces.append((start, text))
    if carry:                                    # leftover tail: attach to the previous chunk (or keep if it is all there is)
        if pieces:
            start, text = pieces[-1]
            pieces[-1] = (start, text + "\n\n" + carry[1])
        else:
            pieces.append(carry)

    chunks: list[Document] = []
    ids: list[str] = []
    for start, text in pieces:
        meta = dict(base)
        meta["page"] = page_at(start)
        meta["page_end"] = page_at(start + len(text) - 1)
        meta["chunk_index"] = len(chunks)
        chunks.append(Document(page_content=text, metadata=meta))
        ids.append(chunk_id(meta["source"], meta["page"], text))
    return chunks, ids 