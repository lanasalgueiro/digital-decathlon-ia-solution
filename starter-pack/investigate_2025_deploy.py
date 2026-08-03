"""
Investiga bugs/incidentes 2025 no Jira.csv com sinal de impacto em prod
e/ou origem pós-deploy (regressão, release, hotfix, etc.).

Saída: deploy_2025_candidates.json + resumo no stdout.
"""

from __future__ import annotations

import csv
import json
import re
from collections import Counter
from datetime import datetime
from pathlib import Path

from find_outage_incidents import (
    COL,
    FALSE_POSITIVE,
    MEDIUM,
    MONTHS,
    STRONG,
    parse_jira_date,
    fmt_br,
)

ROOT = Path(__file__).resolve().parent
CSV_PATH = ROOT / "Jira.csv"
OUT = ROOT / "deploy_2025_candidates.json"

DEPLOY_HINT = re.compile(
    r"\bdeploy\b|"
    r"ap[oó]s\s+(o\s+)?(deploy|release|release\s+notes|atualiza[cç][aã]o|subida)|"
    r"depois\s+do\s+(deploy|release)|"
    r"regress[aã]o|"
    r"\bhotfix\b|"
    r"release\s+bug|"
    r"quebra(da)?\s+(em\s+)?produ|"
    r"em\s+produ[cç][aã]o|"
    r"ambiente\s+de\s+produ|"
    r"foi\s+(para|pra)\s+produ|"
    r"subiu\s+(para|pra|em)\s+produ|"
    r"p[oó]s[\-\s]?deploy|"
    r"p[oó]s[\-\s]?release|"
    r"rollback|"
    r"feature\s+flag|"
    r"vtex\s+io|"
    r"link\s+de\s+produ",
    re.I,
)

CHECKOUT_IMPACT = re.compile(
    r"checkout|pagamento|payment|orderplaced|order\s*form|"
    r"finalizar\s+compra|carrinho|funil|login|rnl|"
    r"site\s+(fora|caiu|down|offline)|"
    r"indisponib|instabilidad|loop(ing)?|"
    r"n[aã]o\s+(carrega|funciona|abre)|erro\s+500|"
    r"boleto|cart[aã]o|pix|frete|shipping",
    re.I,
)

ALREADY = {"SPDBR-3662", "SPDBR-3478", "SPDBR-2555", "SPDBR-3422", "SPDBR-2246"}


def year_of(dt: datetime | None) -> int | None:
    return dt.year if dt else None


def analyze() -> list[dict]:
    rows_out: list[dict] = []
    stats = Counter()

    with CSV_PATH.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.reader(f)
        header = next(reader)
        stats["cols"] = len(header)

        for row in reader:
            stats["rows"] += 1
            if len(row) <= COL["description"]:
                continue

            created = parse_jira_date(row[COL["created"]])
            if year_of(created) != 2025:
                continue
            stats["y2025"] += 1

            summary = (row[COL["summary"]] or "").strip()
            itype = row[COL["itype"]]
            prio = row[COL["priority"]]
            status = row[COL["status"]]
            key = row[COL["key"]]
            desc = row[COL["description"]] if len(row) > COL["description"] else ""
            labels = " ".join(row[i] for i in COL["labels"] if i < len(row))
            text = f"{summary}\n{desc}\n{labels}"

            if FALSE_POSITIVE.search(summary) and not STRONG.search(summary):
                continue

            # Filtro de severidade / tipo
            is_crit = prio in ("Critical", "Blocker")
            is_high = prio == "High"
            is_prod_type = itype in ("Prod Bug", "Release Bug", "Bug Correction Task")
            is_bug = itype in ("Bug", "Bugs", "Prod Bug", "Release Bug", "Bug Correction Task")

            if not is_bug and not (is_crit and STRONG.search(text)):
                continue

            has_outage = bool(STRONG.search(text) or MEDIUM.search(text))
            has_deploy = bool(DEPLOY_HINT.search(text))
            has_impact = bool(CHECKOUT_IMPACT.search(text))

            # Precisa de impacto em checkout/site OU keyword forte de outage
            if not (has_outage or (has_impact and (is_crit or is_prod_type))):
                continue

            # Prioriza críticos; High só com outage ou deploy hint
            if not is_crit and not (is_high and (has_outage or has_deploy)):
                if not (is_prod_type and has_outage):
                    continue

            score = 0
            reasons: list[str] = []
            if is_crit:
                score += 30
                reasons.append(f"prio_{prio}")
            elif is_high:
                score += 12
                reasons.append("prio_High")
            if is_prod_type:
                score += 20
                reasons.append(f"tipo_{itype}")
            if has_outage:
                score += 35
                reasons.append("sintoma_outage")
            if has_deploy:
                score += 25
                reasons.append("hint_deploy")
            if has_impact:
                score += 10
                reasons.append("impacto_checkout_site")
            if key in ALREADY:
                score += 5
                reasons.append("ja_aprovado_antes")

            excerpt = desc.strip().replace("\r", "")
            if len(excerpt) > 400:
                excerpt = excerpt[:400] + "…"

            rows_out.append(
                {
                    "score": score,
                    "reasons": reasons,
                    "issue_key": key,
                    "summary": summary,
                    "issue_type": itype,
                    "priority": prio,
                    "status": status,
                    "created": created.strftime("%d/%b/%y %I:%M %p") if created else "",
                    "created_br": fmt_br(created),
                    "resolved_br": fmt_br(parse_jira_date(row[COL["resolved"]])),
                    "has_outage": has_outage,
                    "has_deploy_hint": has_deploy,
                    "has_impact": has_impact,
                    "already_in_approved": key in ALREADY,
                    "description_excerpt": excerpt,
                }
            )

    rows_out.sort(key=lambda x: (-x["score"], x["created_br"]))
    print(f"rows={stats['rows']} y2025={stats['y2025']} candidatos={len(rows_out)}")
    return rows_out


def main() -> None:
    items = analyze()
    OUT.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")

    print("\n=== TOP candidatos 2025 (possível origem deploy / crítico prod) ===\n")
    for c in items[:40]:
        flags = []
        if c["already_in_approved"]:
            flags.append("APROVADO_ANTES")
        if c["has_deploy_hint"]:
            flags.append("DEPLOY_HINT")
        if c["has_outage"]:
            flags.append("OUTAGE")
        flag = " | ".join(flags) if flags else "-"
        print(
            f"{c['score']:3} {c['issue_key']:12} {c['created_br']} "
            f"{c['priority']:8} {c['issue_type']:22} [{flag}]"
        )
        print(f"    {c['summary'][:100]}")
        print(f"    reasons: {', '.join(c['reasons'])}")
        print()

    # Resumo mensal só Critical/Blocker com outage
    by_month: Counter[str] = Counter()
    crit_outage = [
        c
        for c in items
        if c["priority"] in ("Critical", "Blocker") and c["has_outage"]
    ]
    for c in crit_outage:
        # created_br DD/MM/YYYY
        parts = c["created_br"].split("/")
        if len(parts) == 3:
            by_month[parts[1]] += 1
    print("=== Critical/Blocker + outage por mês 2025 ===")
    for m in sorted(by_month):
        print(f"  mês {m}: {by_month[m]}")
    print(f"  TOTAL: {len(crit_outage)}")

    deploy_hint = [c for c in items if c["has_deploy_hint"]]
    print(f"\nCom hint explícito de deploy/regressão/release: {len(deploy_hint)}")
    for c in deploy_hint[:25]:
        print(f"  {c['issue_key']} {c['created_br']} · {c['summary'][:70]}")


if __name__ == "__main__":
    main()
