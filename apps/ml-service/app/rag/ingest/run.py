"""
app/rag/ingest/run.py
---------------------
Command-line entry point for building the knowledge base.

Run from apps/ml-service with the venv active:

    python -m app.rag.ingest.run --dry-run             # clean + chunk only, nothing written, prints a report
    python -m app.rag.ingest.run --dry-run --preview 5 # also print 5 sample chunks
    python -m app.rag.ingest.run --dry-run --dump out/chunks.jsonl   # save every chunk to review in an editor
    python -m app.rag.ingest.run                       # embed + store (only new/changed chunks)
    python -m app.rag.ingest.run --only guideline.pdf  # just one file
    python -m app.rag.ingest.run --reset               # drop the KB table and rebuild from scratch
                                                      # (needed if you change the embedding model/dimension)

ALWAYS do a --dry-run first and read the report: it lists which pages were
dropped as references / empty and which header-footer lines were removed.
"""

import argparse
import json
import logging
import random
import sys
from pathlib import Path

from app.core.config import get_settings
from app.core.logging import setup_logging
from app.llm.embeddings import get_embeddings
from app.rag.ingest.manifest import load_manifest
from app.rag.ingest.pipeline import build_source_chunks, sync_source
from app.rag.vectorstore import build_engine, init_table, open_store, prepare_database

_ROOT = Path(__file__).resolve().parents[3]  # apps/ml-service


def _ranges(pages: list[int]) -> str:
    """[12,13,14,16] -> '12-14, 16'"""
    out, start, prev = [], None, None
    for p in sorted(pages):
        if start is None:
            start = prev = p
        elif p == prev + 1:
            prev = p
        else:
            out.append(f"{start}-{prev}" if start != prev else str(start))
            start = prev = p
    if start is not None:
        out.append(f"{start}-{prev}" if start != prev else str(start))
    return ", ".join(out)


def _print_report(r, n_chunks: int) -> None:
    print(f"\n=== {r.source}")
    print(f"  pages: total={r.pages_total} selected={r.pages_selected} kept={r.pages_kept}  -> chunks={n_chunks}")
    if r.cut_at_page:
        print(f"  content ends on page {r.cut_at_page} (references/end marker); pages dropped after it: "
              f"{_ranges(r.dropped_after_end_pages) or 'none'}")
    if r.lines_before_start:
        print(f"  lines dropped before start marker (title/authors/affiliations): {r.lines_before_start}")
    if r.dropped_reference_pages:
        print(f"  dropped as reference pages: {_ranges(r.dropped_reference_pages)}")
    if r.dropped_empty_pages:
        print(f"  dropped as empty/too short: {_ranges(r.dropped_empty_pages)}")
    if r.block_lines_removed:
        print(f"  lines removed by drop_blocks: {r.block_lines_removed}")
    if r.contact_lines_removed:
        print(f"  e-mail/phone/fax lines removed: {r.contact_lines_removed}")
    print(f"  header/footer/junk lines removed: {r.boilerplate_lines_removed}")
    for sample in r.boilerplate_samples:
        print(f"     e.g. {sample!r}")
    for note in r.notes:
        print(f"  NOTE: {note}")


def main(argv: list[str] | None = None) -> int:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # Windows consoles choke on unicode otherwise
    ap = argparse.ArgumentParser(description="Build the RutuChakra knowledge base from PDFs")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--reset", action="store_true")
    ap.add_argument("--only", help="ingest only this PDF file name")
    ap.add_argument("--preview", type=int, default=0, help="print N random sample chunks")
    ap.add_argument("--dump", help="write all chunks to this .jsonl file")
    args = ap.parse_args(argv)

    s = get_settings()
    setup_logging(s.log_level)
    log = logging.getLogger("ingest")

    pdf_dir = (_ROOT / s.kb_pdf_dir).resolve()
    pdfs = sorted(pdf_dir.glob("*.pdf"))
    if args.only:
        pdfs = [p for p in pdfs if p.name == args.only]
    if not pdfs:
        print(f"No PDFs found in {pdf_dir}")
        return 1

    manifest = load_manifest(pdf_dir)
    on_disk = {p.name for p in pdf_dir.glob("*.pdf")}
    for key in manifest.sources:
        if key not in on_disk:
            print(f"WARNING: manifest.json has an entry for '{key}' but no PDF with exactly that name exists "
                  f"in {pdf_dir}. Its settings are NOT being applied (check spelling, commas, + signs).")
    built = []
    for pdf in pdfs:
        cfg = manifest.for_file(pdf.name)
        if not cfg.enabled:
            print(f"\n=== {pdf.name}\n  SKIPPED (enabled=false in manifest.json)")
            continue
        chunks, ids, report = build_source_chunks(pdf, cfg, s)
        _print_report(report, len(chunks))
        built.append((pdf.name, chunks, ids))

    all_chunks = [c for _, chunks, _ in built for c in chunks]
    print(f"\nTOTAL: {len(all_chunks)} chunks from {len(built)} PDFs")

    if args.preview:
        for c in random.sample(all_chunks, min(args.preview, len(all_chunks))):
            m = c.metadata
            print(f"\n--- [{m['source']} p.{m['page']} #{m['chunk_index']}] ({len(c.page_content)} chars)\n{c.page_content}")

    if args.dump:
        out = Path(args.dump)
        out.parent.mkdir(parents=True, exist_ok=True)
        with out.open("w", encoding="utf-8") as f:
            for c in all_chunks:
                f.write(json.dumps({**c.metadata, "text": c.page_content}, ensure_ascii=False) + "\n")
        print(f"\nDumped chunks to {out}")

    if args.dry_run:
        print("\n(dry run: nothing was written to the database)")
        return 0

    s.validate()  # needs DATABASE_URL + GEMINI_API_KEY
    table_exists = prepare_database(s)
    engine = build_engine(s)
    if args.reset or not table_exists:
        log.info("creating table %s.%s (reset=%s)", s.kb_schema, s.kb_table, args.reset)
        init_table(engine, s, overwrite=args.reset)
    store = open_store(engine, get_embeddings(s), s)

    for name, chunks, ids in built:
        result = sync_source(store, name, chunks, ids)
        print(f"{name}: added={result['added']} unchanged={result['unchanged']} deleted={result['deleted']}")
    print("\nDone.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())