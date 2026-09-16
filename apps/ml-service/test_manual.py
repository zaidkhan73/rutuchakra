from app.rag.retriever import retrieve
from app.rag.planner import classify

# Test 1: planner classification
print("=== Planner ===")
for msg in ["hi there", "why is my cycle irregular", "what's the weather today"]:
    print(f"{msg!r} -> {classify(msg)}")

# Test 2: retriever
print("\n=== Retriever ===")
results = retrieve("what foods should I avoid with PCOD")
for r in results:
    print(f"[{r['similarity']:.2f}] {r['title']}")