"""
Run from apps/ml-service with venv active:
    python -m scripts.kb_smoke                       # built-in PCOD queries + off-topic controls
    python -m scripts.kb_smoke -q "metformin dose in PCOS"
    python -m scripts.kb_smoke -q "diet for PCOS" --doc-types review guide --top-k 6

Shows, per query: which chunks come back, their cosine similarity, and which retrieval
leg found them (dense rank / keyword rank). Use the OFF-TOPIC control lines to pick
RAG_MIN_SIMILARITY: it must sit ABOVE the off-topic similarities and BELOW the
relevant ones.
"""
import argparse
import asyncio

from app.rag.retrieval import get_retriever

# (query, substring we expect in a top source)  -- None = off-topic control
CASES = [
    ("What is the first line treatment for irregular periods in PCOS?", "Guideline"),
    ("PCOD me kya khana chahiye? diet advice", None),
    ("Does metformin improve ovulation compared to clomiphene alone?", "Professional_Med_J"),
    ("Ayurvedic management of PCOS, panchakarma and herbs", "jaims"),
    ("What lifestyle changes help insulin resistance in PCOS?", None),
    ("How is PCOS diagnosed? Rotterdam criteria", "Guideline"),
    ("prevalence of PCOS in Vidarbha women", "IJRCOG"),
    ("who won the IPL final?", "OFFTOPIC"),
    ("how to bake a chocolate cake", "OFFTOPIC"),
    ("what is the treatment for dengue fever?", "OFFTOPIC"),
    ("best exercises for lower back pain", "OFFTOPIC"),
    ("how to control blood sugar in type 2 diabetes", None),  # adjacent topic: sirf similarity dekhni hai
]


def _show(res, expect):
    print(f"\n=== {res.query}")
    print(f"    tsquery: {res.tsquery}")
    print(f"    candidates={res.n_candidates} dropped_low_sim={res.n_dropped_low_similarity} "
          f"top_sim={res.top_similarity if res.top_similarity is None else round(res.top_similarity, 3)} "
          f"evidence={res.has_evidence}")
    for i, c in enumerate(res.chunks, 1):
        snippet = c.text.replace("\n", " ")[:110]
        print(f"  {i}. sim={c.similarity:.3f} dense#{c.dense_rank} kw#{c.sparse_rank} | {c.citation}")
        print(f"       {snippet}...")
    if expect == "OFFTOPIC":
        print("    -> expected: NO evidence" + ("  [OK]" if not res.has_evidence else "  [FAIL: raise RAG_MIN_SIMILARITY]"))
    elif expect:
        hit = any(expect.lower() in c.source.lower() or expect.lower() in c.doc_title.lower() for c in res.chunks)
        print(f"    -> expected a source matching {expect!r}: {'OK' if hit else 'MISSING'}")


async def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("-q", "--query")
    ap.add_argument("--top-k", type=int)
    ap.add_argument("--doc-types", nargs="*")
    ap.add_argument("--min-year", type=int)
    ap.add_argument("--min-similarity", type=float)
    a = ap.parse_args()

    r = get_retriever()
    cases = [(a.query, None)] if a.query else CASES
    for q, expect in cases:
        res = await r.retrieve(q, top_k=a.top_k, doc_types=a.doc_types, min_year=a.min_year,
                               min_similarity=a.min_similarity)
        _show(res, expect)


if __name__ == "__main__":
    asyncio.run(main())