from app.rag.retrieval.hybrid import apply_source_cap, build_tsquery
from app.rag.retrieval.schemas import RetrievedChunk


def _chunk(**kw):
    base = dict(id="1", text="t", source="a.pdf", doc_title="Title", doc_type="article",
                similarity=0.8, rrf=0.03)
    return RetrievedChunk(**{**base, **kw})


def test_tsquery_expands_pcod_synonyms_and_drops_stopwords():
    q = build_tsquery("What is the diet for PCOD?")
    terms = q.split(" | ")
    assert "pcod" in terms and "pcos" in terms and "pmos" in terms
    assert "diet" in terms
    assert "what" not in terms and "the" not in terms


def test_tsquery_is_injection_safe():
    q = build_tsquery("metformin'; DROP TABLE x; -- & ! ( )")
    assert set(q.replace(" | ", " ").split()) <= set("metformin drop table".split())


def test_tsquery_extra_keywords_and_empty():
    assert "insulin" in build_tsquery("help", ["insulin"]).split(" | ")
    assert build_tsquery("??? !!!") == ""


def test_tsquery_caps_length():
    assert len(build_tsquery(" ".join(f"term{i}" for i in range(50))).split(" | ")) <= 14


def test_source_cap_keeps_order_and_limits_per_source():
    rows = [{"source": "g.pdf", "n": i} for i in range(5)] + [{"source": "x.pdf", "n": 9}]
    out = apply_source_cap(rows, top_k=5, max_per_source=2)
    assert [r["n"] for r in out] == [0, 1, 9]


def test_source_cap_respects_top_k():
    rows = [{"source": f"s{i}.pdf"} for i in range(10)]
    assert len(apply_source_cap(rows, top_k=4, max_per_source=3)) == 4


def test_citation_formats():
    assert _chunk(year=2026, page=45, page_end=46).citation == "Title (2026), pp. 45-46"
    assert _chunk(year=2021, page=7).citation == "Title (2021), p. 7"
    assert _chunk(page=3, page_end=3).citation == "Title, p. 3"
    assert _chunk().citation == "Title"