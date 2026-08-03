"""
Exporta Critical/Blocker bugs de um ano (Bug / Prod Bug / Release Bug /
Bug Correction Task) em JSON gerenciável — mesmo fluxo do 2025.

Uso:
  python export_year_critical_manage.py
  python export_year_critical_manage.py --year 2026
"""

from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from pathlib import Path

from find_outage_incidents import COL, parse_jira_date, fmt_br

ROOT = Path(__file__).resolve().parent
CSV_PATH = ROOT / "Jira.csv"

BUG_TYPES = {
    "Bug",
    "Bugs",
    "Prod Bug",
    "Release Bug",
    "Bug Correction Task",
}

# Já no seed Ops Hub (chaves Jira). Atualizar se subir mais.
IN_SEED_BY_YEAR: dict[int, set[str]] = {
    2025: {
        "SPDBR-2605",
        "SPDBR-2771",
        "SPDBR-2900",
        "SPDBR-3305",
        "SPDBR-3318",
        "SPDBR-3421",
        "SPDBR-3434",
        "SPDBR-3435",
        "SPDBR-3462",
        "SPDBR-3500",
        "SPDBR-3549",
        "SPDBR-3660",
        "SPDBR-3662",
        "SPDBR-3663",
        "SPDBR-3713",
        "SPDBR-3948",
        "SPDBR-3960",
        "SPDBR-3971",
        "SPDBR-3972",
        "SPDBR-3981",
        "SPDBR-4013",
        "SPDBR-4145",
        "SPDBR-4211",
        "SPDBR-4274",
    },
    2026: set(),  # 2026 no seed hoje é ops/post-mortem sem jiraKey
}

# Seed 2026 sem Jira (post-mortems / lista ops) — só referência no meta
SEED_2026_NO_JIRA = [
    {
        "id": "rnl-express-site",
        "date": "01/07/2026",
        "title": "Instabilidade no Serviço RNL Express",
        "origin": "deploy",
    },
    {
        "id": "checkout-guest-loop-2026-06",
        "date": "09/06/2026",
        "title": "Instabilidade no Funil – Loop Checkout (Guest)",
        "origin": "deploy",
    },
    {
        "id": "checkout-vtex-config-conflict-2026-03",
        "date": "23/04/2026",
        "title": "Conflito de Configuração VTEX (Checkout)",
        "origin": "deploy",
    },
    {
        "id": "gi-2026-07-25",
        "date": "25/07/2026",
        "title": "Falha com pagamentos à vista cartão Visa",
        "origin": None,
    },
    {
        "id": "gi-2026-04-28",
        "date": "28/04/2026",
        "title": "Valor à vista igual ao parcelado na modal",
        "origin": None,
    },
    {
        "id": "gi-2026-03-26",
        "date": "26/03/2026",
        "title": "Aumento de erro 500 na rota api/getorderlist",
        "origin": None,
    },
    {
        "id": "gi-2026-03-24",
        "date": "24/03/2026",
        "title": "Correção no indicador de StartOrder",
        "origin": None,
    },
    {
        "id": "gi-2026-03-16",
        "date": "16/03/2026",
        "title": "Queda no site",
        "origin": None,
    },
    {
        "id": "gi-2026-01-13",
        "date": "13/01/2026",
        "title": "Instabilidade Checkout - 13/01/26",
        "origin": None,
    },
    {
        "id": "gi-2026-01-06",
        "date": "06/01/2026",
        "title": "Falha na integração de pedidos",
        "origin": None,
    },
]


def export_year(year: int) -> Path:
    out = ROOT / f"deploy_{year}_critical_manage.json"
    in_seed = IN_SEED_BY_YEAR.get(year, set())
    items: list[dict] = []
    by_day: dict[str, list[str]] = defaultdict(list)

    with CSV_PATH.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        next(reader)
        for row in reader:
            if len(row) <= COL["description"]:
                continue
            created = parse_jira_date(row[COL["created"]])
            if not created or created.year != year:
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

            notes: list[str] = []
            if key in in_seed:
                notes.append("já no seed (origem deploy)")

            items.append(
                {
                    "approved": key in in_seed,
                    "issue_key": key,
                    "summary": (row[COL["summary"]] or "").strip(),
                    "date": fmt_br(created),
                    "created_iso": day,
                    "priority": prio,
                    "issue_type": itype,
                    "status": row[COL["status"]],
                    "resolved": fmt_br(parse_jira_date(row[COL["resolved"]])),
                    "in_seed": key in in_seed,
                    "release_not_prod": False,
                    "cluster_size": 0,
                    "notes": notes,
                    "description_excerpt": excerpt,
                    "id": f"jira-{key.lower()}",
                }
            )

    cluster_map = {day: len(keys) for day, keys in by_day.items()}
    for item in items:
        item["cluster_size"] = cluster_map.get(item["created_iso"], 1)

    items.sort(key=lambda x: (x["created_iso"], x["issue_key"]))

    meta: dict = {
        "year": year,
        "source": "Jira.csv",
        "filter": (
            "priority in Critical|Blocker AND type in "
            "Bug|Prod Bug|Release Bug|Bug Correction Task"
        ),
        "total": len(items),
        "how_to_use": (
            "Mesmo fluxo do 2025: apague falsos positivos / QA de release. "
            "Marque approved=true nos de PRODUÇÃO (origem deploy). "
            "priority Know-Issues = backlog consciente. "
            "Depois peça para subir os approved=true no seed."
        ),
        "already_in_seed_jira": sorted(
            k for k in in_seed if any(i["issue_key"] == k for i in items)
        ),
        "approved_count": sum(1 for i in items if i["approved"]),
        "pending_count": sum(1 for i in items if not i["approved"]),
    }
    if year == 2026:
        meta["already_in_seed_ops_no_jira"] = SEED_2026_NO_JIRA

    payload = {"meta": meta, "items": items}
    out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return out


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--year", type=int, default=2026)
    args = parser.parse_args()
    out = export_year(args.year)
    data = json.loads(out.read_text(encoding="utf-8"))
    print(f"Wrote {out.name}: {data['meta']['total']} items")
    print(f"  approved: {data['meta']['approved_count']}")
    print(f"  pending:  {data['meta']['pending_count']}")
    if data["meta"].get("already_in_seed_ops_no_jira"):
        print(
            f"  ops seed sem Jira: {len(data['meta']['already_in_seed_ops_no_jira'])}"
        )


if __name__ == "__main__":
    main()
