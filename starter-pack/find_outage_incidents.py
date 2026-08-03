"""
Analisa export Jira (CSV) e sugere incidentes de indisponibilidade / queda de site.

Uso:
  python find_outage_incidents.py
  python find_outage_incidents.py --min-score 40
  python find_outage_incidents.py --approve SPDBR-1234,SPDBR-5678

Gera:
  - outage_candidates.json  (lista ranqueada para revisão)
  - outage_candidates.csv   (mesma lista em planilha)
  - outage_approved.json    (após --approve: prontos para o Ops Hub)
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from collections import Counter
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DEFAULT_CSV = ROOT / "Jira.csv"
OUT_JSON = ROOT / "outage_candidates.json"
OUT_CSV = ROOT / "outage_candidates.csv"
OUT_APPROVED = ROOT / "outage_approved.json"

# Colunas fixas do export Jira (índices da 1ª linha)
COL = {
    "summary": 0,
    "key": 1,
    "itype": 3,
    "status": 4,
    "project": 5,
    "priority": 11,
    "created": 19,
    "resolved": 22,
    "labels": (32, 33, 34, 35),
    "description": 36,
}

STRONG = re.compile(
    r"(queda\s+(no\s+)?site|"
    r"site\s+(fora(\s+do\s+ar)?|caiu|offline|down|indispon[ií]vel)|"
    r"indisponibilidade\s+(do\s+)?(site|plataforma|checkout|servi[cç]o|produ[cç][aã]o)|"
    r"fora\s+do\s+ar|"
    r"\boutage\b|\bblackout\b|"
    r"produ[cç][aã]o\s+(fora|indispon|offline|caiu)|"
    r"instabilidade\s+(no\s+)?(site|checkout|produ[cç][aã]o|funil|servi[cç]o)|"
    r"site\s+n[aã]o\s+(abre|carrega|acessa|sobe)|"
    r"plataforma\s+(fora|indispon|offline|caiu)|"
    r"erro\s+500\s+(em\s+massa|geral|no\s+site)|"
    r"crise\s+(no\s+)?(site|checkout|produ)|"
    r"incidente\s+cr[ií]tico|"
    r"post[\s\-]?mortem|"
    r"checkout\s+(fora|indispon|em\s+loop|loop\s+infinito|n[aã]o\s+est[aá]\s+carregando)|"
    r"pagamento\s+(pararam|n[aã]o\s+est[aá]\s+carregando|fora)|"
    r"loop(ing)?\s+(infinito|no\s+checkout)|"
    r"rnl\s+express\s+(fora|indispon|quebr)|"
    r"n[aã]o\s+foi\s+poss[ií]vel\s+finalizar\s+compra|"
    r"funil\s+de\s+convers[aã]o)",
    re.I,
)

# Evita falsos positivos comuns
FALSE_POSITIVE = re.compile(
    r"produto\s+indispon|"
    r"sku\s+indispon|"
    r"item\s+indispon|"
    r"cep\s+indispon|"
    r"frete\s+indispon|"
    r"informa[cç][aã]o\s+de\s+indispon|"
    r"persist[eê]ncia\s+da\s+informa|"
    r"recomenda[cç][aã]o\s+de\s+produtos|"
    r"remote\s+config\s+guest|"
    r"writing\s+guest|"
    r"par[aâ]metro\s+remote|"
    r"queda\s+(no|nos)\s+evento|"
    r"queda\s+nos\s+eventos|"
    r"alterar\s+link\s+de\s+logout|"
    r"starter\s+pack|"
    r"tradu[cç][aã]o|"
    r"categoryid|"
    r"amplitude",
    re.I,
)

MEDIUM = re.compile(
    r"fora do ar|\boutage\b|\bblackout\b|"
    r"queda\s+(no\s+)?site|"
    r"site\s+(offline|down|caiu)|"
    r"instabilidade\s+(no\s+)?(site|checkout)|"
    r"checkout\s+(fora|quebrado|loop|n[aã]o\s+est[aá]\s+carregando)|"
    r"pagamento\s+(pararam|n[aã]o\s+est[aá]\s+carregando)|"
    r"n[aã]o\s+foi\s+poss[ií]vel\s+finalizar|"
    r"loop(ing)?\s+infinito",
    re.I,
)

SKIP_TYPES = {
    "Story",
    "Epic",
    "Sub-task",
    "Task_Analytics",
    "Design activity",
    "Solution",
}

BUG_TYPES = {
    "Bug",
    "Bugs",
    "Prod Bug",
    "Release Bug",
    "Bug Correction Task",
}

MONTHS = {
    "jan": 1,
    "feb": 2,
    "mar": 3,
    "apr": 4,
    "may": 5,
    "jun": 6,
    "jul": 7,
    "aug": 8,
    "sep": 9,
    "oct": 10,
    "nov": 11,
    "dec": 12,
}


def parse_jira_date(value: str) -> datetime | None:
    """Ex.: '28/Jul/26 6:44 PM' ou '28/Jul/26'."""
    value = (value or "").strip()
    if not value:
        return None
    m = re.match(
        r"(\d{1,2})/([A-Za-z]{3})/(\d{2})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM))?",
        value,
    )
    if not m:
        return None
    day = int(m.group(1))
    month = MONTHS.get(m.group(2).lower())
    year = 2000 + int(m.group(3))
    if not month:
        return None
    hour = 0
    minute = 0
    if m.group(4):
        hour = int(m.group(4))
        minute = int(m.group(5))
        ampm = m.group(6).upper()
        if ampm == "PM" and hour != 12:
            hour += 12
        if ampm == "AM" and hour == 12:
            hour = 0
    return datetime(year, month, day, hour, minute)


def fmt_br(dt: datetime | None) -> str:
    if not dt:
        return ""
    return dt.strftime("%d/%m/%Y")


def score_row(row: list[str]) -> tuple[int, list[str]]:
    summary = row[COL["summary"]]
    itype = row[COL["itype"]]
    prio = row[COL["priority"]]
    labels = " ".join(row[i] for i in COL["labels"] if i < len(row))
    desc = row[COL["description"]] if len(row) > COL["description"] else ""
    text = f"{summary}\n{desc}\n{labels}"

    if FALSE_POSITIVE.search(summary) and not STRONG.search(summary):
        return 0, []

    score = 0
    reasons: list[str] = []

    if STRONG.search(summary):
        score += 55
        reasons.append("summary_forte")
    elif STRONG.search(text):
        score += 40
        reasons.append("texto_forte")

    if prio in ("Critical", "Blocker"):
        score += 25
        reasons.append(f"prio_{prio}")
    elif prio == "High" and MEDIUM.search(text):
        score += 12
        reasons.append("prio_High+keyword")

    if itype in ("Prod Bug", "Release Bug") and MEDIUM.search(text):
        score += 18
        reasons.append(f"tipo_{itype}")
    elif itype in BUG_TYPES and (STRONG.search(text) or MEDIUM.search(summary)):
        score += 8
        reasons.append("tipo_bug")

    # Critical/Blocker só entra se tiver sinal de outage/checkout quebrado
    if prio in ("Critical", "Blocker") and MEDIUM.search(text):
        score = max(score, 50)
        reasons.append("prio_critica+sintoma")

    if itype in SKIP_TYPES and score < 65:
        return 0, []

    if itype == "Task" and score < 55:
        return 0, []

    return score, reasons


def analyze(csv_path: Path, min_score: int) -> list[dict]:
    candidates: list[dict] = []
    stats = Counter()

    with csv_path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        next(reader)  # header
        for row in reader:
            stats["rows"] += 1
            if len(row) <= COL["description"]:
                continue
            score, reasons = score_row(row)
            if score < min_score:
                continue

            created = parse_jira_date(row[COL["created"]])
            resolved = parse_jira_date(row[COL["resolved"]])
            summary = row[COL["summary"]].strip()
            desc = (row[COL["description"]] or "").strip()
            if len(desc) > 500:
                desc = desc[:500] + "…"

            candidates.append(
                {
                    "score": score,
                    "reasons": reasons,
                    "issue_key": row[COL["key"]],
                    "summary": summary,
                    "issue_type": row[COL["itype"]],
                    "priority": row[COL["priority"]],
                    "status": row[COL["status"]],
                    "project": row[COL["project"]],
                    "created": row[COL["created"]],
                    "resolved": row[COL["resolved"]],
                    "created_br": fmt_br(created),
                    "resolved_br": fmt_br(resolved),
                    "year": created.year if created else None,
                    "description_excerpt": desc,
                    "approved": False,
                    # preview no formato do Ops Hub
                    "incident_preview": {
                        "id": f"jira-{row[COL['key']].lower()}",
                        "title": summary,
                        "date": fmt_br(created) or "01/01/2024",
                        "severity": "crítica",
                        "monitored": False,
                        "alerted": False,
                        "documented": False,
                        "origin": None,
                        "jiraKey": row[COL["key"]],
                        "source": "jira-retro",
                    },
                }
            )

    candidates.sort(key=lambda c: (-c["score"], c.get("created_br") or ""))
    stats["candidates"] = len(candidates)
    print(f"Linhas lidas: {stats['rows']}")
    print(f"Candidatos (score >= {min_score}): {len(candidates)}")
    by_year = Counter(c["year"] for c in candidates if c["year"])
    print("Por ano:", dict(sorted(by_year.items())))
    return candidates


def write_outputs(candidates: list[dict]) -> None:
    OUT_JSON.write_text(
        json.dumps(candidates, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    fields = [
        "approved",
        "score",
        "issue_key",
        "created_br",
        "resolved_br",
        "priority",
        "issue_type",
        "status",
        "summary",
        "reasons",
        "year",
    ]
    with OUT_CSV.open("w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction="ignore")
        w.writeheader()
        for c in candidates:
            row = {k: c.get(k) for k in fields}
            row["reasons"] = "|".join(c.get("reasons") or [])
            w.writerow(row)

    print(f"Escrito: {OUT_JSON.name}")
    print(f"Escrito: {OUT_CSV.name}")
    print()
    print("Top 20 para revisão:")
    for c in candidates[:20]:
        print(
            f"  [{c['score']:3d}] {c['issue_key']}  {c['created_br']}  "
            f"{c['priority']:8s}  {c['summary'][:80]}"
        )
    print()
    print("Próximo passo:")
    print("  1) Abra outage_candidates.csv e marque os que forem incidente real")
    print("  2) Rode: python find_outage_incidents.py --approve SPDBR-1,SPDBR-2")
    print("  3) Ou edite a coluna approved=true no JSON e use --from-json-approved")


def approve_keys(keys: list[str]) -> None:
    if not OUT_JSON.exists():
        raise SystemExit("Rode a análise antes (sem --approve).")
    candidates = json.loads(OUT_JSON.read_text(encoding="utf-8"))
    wanted = {k.strip().upper() for k in keys if k.strip()}
    approved = []
    for c in candidates:
        if c["issue_key"].upper() in wanted:
            c["approved"] = True
            preview = dict(c["incident_preview"])
            # se Critical/Blocker → documentado false ainda (retro)
            if c["priority"] in ("Critical", "Blocker"):
                preview["documented"] = False
            approved.append(
                {
                    **preview,
                    "jira": {
                        "key": c["issue_key"],
                        "priority": c["priority"],
                        "type": c["issue_type"],
                        "status": c["status"],
                        "created": c["created"],
                        "resolved": c["resolved"],
                        "score": c["score"],
                        "description_excerpt": c["description_excerpt"],
                    },
                }
            )

    missing = wanted - {a["jiraKey"].upper() for a in approved}
    if missing:
        print("Não encontrados na lista de candidatos:", ", ".join(sorted(missing)))

    OUT_JSON.write_text(
        json.dumps(candidates, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    OUT_APPROVED.write_text(
        json.dumps(approved, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"Aprovados: {len(approved)} -> {OUT_APPROVED.name}")
    for a in approved:
        print(f"  OK {a['jiraKey']}  {a['date']}  {a['title'][:70]}")


def approve_from_json_flags() -> None:
    candidates = json.loads(OUT_JSON.read_text(encoding="utf-8"))
    keys = [c["issue_key"] for c in candidates if c.get("approved")]
    if not keys:
        raise SystemExit("Nenhum item com approved=true no JSON.")
    approve_keys(keys)


def main() -> None:
    parser = argparse.ArgumentParser(description="Candidatos a incidentes de outage no Jira")
    parser.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    parser.add_argument("--min-score", type=int, default=40)
    parser.add_argument(
        "--approve",
        type=str,
        default="",
        help="Keys Jira aprovadas, separadas por vírgula",
    )
    parser.add_argument(
        "--from-json-approved",
        action="store_true",
        help="Usa approved=true já marcado em outage_candidates.json",
    )
    args = parser.parse_args()

    if args.from_json_approved:
        approve_from_json_flags()
        return

    if args.approve:
        approve_keys(args.approve.split(","))
        return

    if not args.csv.exists():
        raise SystemExit(f"CSV não encontrado: {args.csv}")

    candidates = analyze(args.csv, args.min_score)
    write_outputs(candidates)


if __name__ == "__main__":
    main()
