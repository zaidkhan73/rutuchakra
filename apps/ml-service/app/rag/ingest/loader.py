"""
app/rag/ingest/loader.py
------------------------
Loads one PDF with LangChain's PyMuPDFLoader (one Document per page) and
attaches only the metadata we actually want to keep. Page numbers are
converted to 1-based so they match what a human sees in a PDF viewer.
"""

import re
from pathlib import Path

from langchain_community.document_loaders import PyMuPDFLoader
from langchain_core.documents import Document

from app.rag.ingest.manifest import SourceConfig


# Some PDF link annotations come out as markdown: [www.site.com](https://www.site.com) -> keep only the visible text
_MD_LINK = re.compile(r"\[([^\]]+)\]\((?:https?://|mailto:)[^)\s]+\)")


def load_pdf_pages(path: Path, cfg: SourceConfig) -> list[Document]:
    docs = PyMuPDFLoader(str(path)).load()
    pages = []
    for d in docs:
        pages.append(Document(
            page_content=_MD_LINK.sub(r"\1", d.page_content),
            metadata={
                "source": path.name,
                "doc_title": cfg.title,
                "doc_type": cfg.doc_type,
                "year": cfg.year,
                "page": int(d.metadata.get("page", 0)) + 1,
            },
        ))
    return pages