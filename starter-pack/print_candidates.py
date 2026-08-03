"""Imprime detalhes de candidatos chave 2025."""
import json
from pathlib import Path

items = {c["issue_key"]: c for c in json.loads(Path("deploy_2025_candidates.json").read_text(encoding="utf-8"))}
app = json.loads(Path("outage_approved.json").read_text(encoding="utf-8"))

keys = [
    "SPDBR-2246",
    "SPDBR-3422",
    "SPDBR-3421",
    "SPDBR-3433",
    "SPDBR-3434",
    "SPDBR-3435",
    "SPDBR-3462",
    "SPDBR-3460",
    "SPDBR-3481",
    "SPDBR-3549",
    "SPDBR-3569",
    "SPDBR-3663",
    "SPDBR-3660",
    "SPDBR-3318",
    "SPDBR-3713",
    "SPDBR-3972",
    "SPDBR-3971",
    "SPDBR-3993",
    "SPDBR-4145",
]

print("=== Já aprovados antes ===")
for a in app:
    print(f"{a['jiraKey']} | {a['date']} | {a['title'][:90]}")

print("\n=== Detalhe candidatos ===")
for k in keys:
    c = items.get(k)
    if c:
        print(f"\n{c['issue_key']} | {c['created_br']} | {c['priority']} | {c['issue_type']}")
        print(f"  {c['summary']}")
        print(f"  {c['description_excerpt'][:350]}")
        continue
    a = next((x for x in app if x["jiraKey"] == k), None)
    if a:
        print(f"\n{k} | {a['date']} | (só em approved)")
        print(f"  {a['title']}")
        print(f"  {a['jira'].get('description_excerpt','')[:350]}")
    else:
        print(f"\n{k} NOT FOUND")
