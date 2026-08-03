"""
Exporta os 53 Critical/Blocker bugs 2025 (Bug / Prod Bug / Release Bug /
Bug Correction Task) em JSON gerenciável para aprovação no OKR pós-deploy.
"""

from __future__ import annotations

import csv
import json
from collections import defaultdict
from pathlib import Path

from find_outage_incidents import COL, parse_jira_date, fmt_br

ROOT = Path(__file__).resolve().parent
CSV_PATH = ROOT / "Jira.csv"
OUT = ROOT / "deploy_2025_critical_manage.json"

BUG_TYPES = {
    "Bug",
    "Bugs",
    "Prod Bug",
    "Release Bug",
    "Bug Correction Task",
}

# Já no seed do Ops Hub como origem deploy
IN_SEED = {"SPDBR-3662", "SPDBR-3478", "SPDBR-2555"}

# Aprovados antes mas removidos do seed (QA de release, não produção)
RELEASE_NOT_PROD = {"SPDBR-3422", "SPDBR-2246"}


def main() -> None:
    items: list[dict] = []
    by_day: dict[str, list[str]] = defaultdict(list)

    with CSV_PATH.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            if len(row) <= COL["description"]:
                continue
            created = parse_jira_date(row[COL["created"]])
            if not created or created.year != 2025:
                continue
            prio = row[COL["priority"]]
            itype = row[COL["itype"]]
            if prio not in ("Critical", "Blocker"):
                continue
            if itype not in BUG_TYPES:
                continue

            key = row[COL["key"]]
            day = created.strftime("%Y-%m-%d")
            by_day[day].append(key)

            desc = (row[COL["description"]] or "").strip().replace("\r", "")
            excerpt = desc[:500] + ("…" if len(desc) > 500 else "")

            notes = []
            if key in IN_SEED:
                notes.append("já no seed (origem deploy)")
            if key in RELEASE_NOT_PROD:
                notes.append("removido: QA de release, não produção")

            # default: seed já aprovado = true; release-not-prod = false; resto false
            if key in IN_SEED:
                approved = True
            else:
                approved = False

            items.append(
                {
                    "approved": approved,
                    "issue_key": key,
                    "summary": (row[COL["summary"]] or "").strip(),
                    "date": fmt_br(created),
                    "created_iso": day,
                    "priority": prio,
                    "issue_type": itype,
                    "status": row[COL["status"]],
                    "resolved": fmt_br(parse_jira_date(row[COL["resolved"]])),
                    "in_seed": key in IN_SEED,
                    "release_not_prod": key in RELEASE_NOT_PROD,
                    "cluster_size": 0,  # preenchido depois
                    "notes": notes,
                    "description_excerpt": excerpt,
                    # id pronto se for aprovado para o Ops Hub
                    "id": f"jira-{key.lower()}",
                }
            )

    # cluster size por dia
    cluster_map = {day: len(keys) for day, keys in by_day.items()}
    for item in items:
        item["cluster_size"] = cluster_map.get(item["created_iso"], 1)

    items.sort(key=lambda x: (x["created_iso"], x["issue_key"]))

    payload = {
        "meta": {
            "year": 2025,
            "source": "Jira.csv",
            "filter": "priority in Critical|Blocker AND type in Bug|Prod Bug|Release Bug|Bug Correction Task",
            "total": len(items),
            "how_to_use": (
                "Marque approved=true nos que forem incidente real de PRODUÇÃO "
                "(origem deploy). Deixe false para QA de release / falso positivo. "
                "Depois peça para subir os approved=true no seed do Ops Hub."
            ),
            "already_in_seed_critical_blocker": sorted(
                k for k in IN_SEED if any(i["issue_key"] == k for i in items)
            ),
            "also_in_seed_but_high_priority": ["SPDBR-2555"],
            "excluded_release_qa": sorted(RELEASE_NOT_PROD),
            "approved_count": sum(1 for i in items if i["approved"]),
            "pending_count": sum(1 for i in items if not i["approved"]),
        },
        "items": items,
    }

    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {OUT.name}: {len(items)} items")
    print(f"  approved (seed): {payload['meta']['approved_count']}")
    print(f"  pending: {payload['meta']['pending_count']}")


if __name__ == "__main__":
    main()
