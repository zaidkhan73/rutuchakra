"""
app/rag/ingest/manifest.py
--------------------------
Optional per-PDF settings, read from data/kb_pdfs/manifest.json.
A PDF that is NOT listed still gets ingested with sensible defaults
(title taken from the file name). The manifest only exists so that you can
describe each source properly (title/type/year -> shown as citations later)
and tell the cleaner which pages/lines are junk.

Page numbers here are 1-based, exactly as you see them in a PDF viewer.
All *_pattern values are regular expressions matched against ONE LINE of
extracted text, case-insensitive (so "^Abstract" matches a line starting
with "Abstract").
"""

import json
import re
from pathlib import Path

from pydantic import BaseModel, Field


class SourceConfig(BaseModel):
    enabled: bool = True                 # false -> file is skipped completely
    title: str | None = None
    doc_type: str = "article"            # guideline | review | article | guide | traditional_medicine ...
    year: int | None = None

    # --- which part of the document to keep ---
    start_page: int | None = None        # skip front matter before this page
    end_page: int | None = None          # skip back matter after this page
    skip_pages: list[int] = Field(default_factory=list)
    start_at_pattern: str | None = None  # drop everything BEFORE the first line matching this (title/authors/affiliations)
    end_at_pattern: str | None = None    # drop everything FROM the first line matching this (to the end of the document)

    # --- junk removal ---
    drop_line_patterns: list[str] = Field(default_factory=list)  # any matching LINE is removed
    drop_blocks: list[list[str]] = Field(default_factory=list)   # [[start_regex, end_regex], ...]: lines from a start match up to
                                                                  # (not including) the next end match are removed, across pages
    cut_at_references: bool = True       # cut at a real "References" heading (one followed by numbered citation entries)
    detect_references: bool = True       # also drop whole pages that look like a bibliography


class Manifest(BaseModel):
    defaults: SourceConfig = Field(default_factory=SourceConfig)
    sources: dict[str, SourceConfig] = Field(default_factory=dict)

    def for_file(self, filename: str) -> SourceConfig:
        base = self.defaults.model_dump()
        override = self.sources.get(filename)
        merged = {**base, **(override.model_dump(exclude_unset=True) if override else {})}
        cfg = SourceConfig(**merged)
        if not cfg.title:
            cfg.title = _title_from_filename(filename)
        return cfg


def _title_from_filename(filename: str) -> str:
    stem = Path(filename).stem
    return re.sub(r"[_\-]+", " ", stem).strip().title()


def load_manifest(pdf_dir: Path) -> Manifest:
    path = pdf_dir / "manifest.json"
    if not path.exists():
        return Manifest()
    return Manifest.model_validate(json.loads(path.read_text(encoding="utf-8")))