"""Gera fragmento TS dos itens 2025 limpos (exceto release_not_prod)."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "deploy_2025_critical_manage.json"
OUT = ROOT / "_seed_2025_fragment.ts"


def esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace("'", "\\'")


def main() -> None:
    data = json.loads(SRC.read_text(encoding="utf-8"))
    items = [i for i in data["items"] if not i.get("release_not_prod")]
    items = sorted(items, key=lambda x: x["created_iso"], reverse=True)

    lines: list[str] = [
        "  // Retroativos Jira 2025 (limpos em deploy_2025_critical_manage.json)"
    ]
    for i in items:
        know = i.get("priority") == "Know-Issues"
        title = esc(i["summary"])
        lines.append("  {")
        lines.append(f"    id: '{i['id']}',")
        if len(title) > 70:
            lines.append("    title:")
            lines.append(f"      '{title}',")
        else:
            lines.append(f"    title: '{title}',")
        lines.append(f"    date: '{i['date']}',")
        lines.append("    severity: 'crítica',")
        if know:
            lines.append("    priority: 'know-issues',")
        lines.append("    monitored: false,")
        lines.append("    alerted: false,")
        lines.append("    documented: true,")
        if not know:
            lines.append("    origin: 'deploy',")
        lines.append(f"    jiraKey: '{i['issue_key']}',")
        lines.append("  },")

    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"Wrote {OUT.name} ({len(items)} items)")


if __name__ == "__main__":
    main()
