#!/usr/bin/env python3
"""
Lê products.csv, consulta a API pública de catálogo VTEX por ProductIdVTEX
e preenche a coluna ImageUrl (URL principal do packshot).

Uso típico (só linhas sem ImageUrl, com backup):
  python enrich_products_image_url.py --backup

Regerar os JSON de kits após enriquecer o CSV (saída em candidates/):
  python build_kit_candidates.py --sport fitness
  python build_kit_candidates.py --sport trilhas
  python build_kit_candidates.py --sport camping
"""

from __future__ import annotations

import argparse
import csv
import json
import shutil
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DEFAULT_CSV = ROOT / "products.csv"
VTEX_SEARCH = (
    "https://decathlonstore.vtexcommercestable.com.br/api/catalog_system/pub/products/search"
    "?fq=productId:"
)
USER_AGENT = "starter-pack-enrich-products/1.0"


def parse_first_image_url(data: object) -> str:
    if not isinstance(data, list) or not data:
        return ""
    first = data[0]
    if not isinstance(first, dict):
        return ""
    items = first.get("items")
    if not isinstance(items, list) or not items:
        return ""
    item0 = items[0]
    if not isinstance(item0, dict):
        return ""
    images = item0.get("images")
    if not isinstance(images, list):
        return ""
    for im in images:
        if isinstance(im, dict):
            u = (im.get("imageUrl") or "").strip()
            if u:
                return u
    return ""


def fetch_image_url(product_id: str, *, timeout: float) -> str:
    q = urllib.parse.quote(product_id, safe="")
    url = VTEX_SEARCH + q
    req = urllib.request.Request(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        raw = resp.read().decode("utf-8", errors="replace")
    data = json.loads(raw)
    return parse_first_image_url(data)


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description="Preenche ImageUrl em products.csv via API VTEX.")
    p.add_argument("--csv", type=Path, default=DEFAULT_CSV, help="Caminho do CSV (default: products.csv na raiz do projeto).")
    p.add_argument(
        "--output",
        type=Path,
        default=None,
        help="CSV de saída (default: mesmo arquivo que --csv).",
    )
    p.add_argument("--sleep", type=float, default=0.12, help="Pausa em segundos entre requisições (default: 0.12).")
    p.add_argument("--timeout", type=float, default=30.0, help="Timeout HTTP por produto (default: 30).")
    p.add_argument(
        "--no-skip",
        action="store_true",
        help="Buscar de novo mesmo quando ImageUrl já estiver preenchida.",
    )
    p.add_argument("--limit", type=int, default=0, help="Processar no máximo N linhas com ProductIdVTEX (0 = todas).")
    p.add_argument("--backup", action="store_true", help="Antes de gravar, copia o CSV para .bak.")
    p.add_argument("--dry-run", action="store_true", help="Não grava o arquivo; só imprime estatísticas.")
    args = p.parse_args(argv)

    csv_path: Path = args.csv
    out_path: Path = args.output or csv_path
    if not csv_path.is_file():
        print(f"Arquivo não encontrado: {csv_path}", file=sys.stderr)
        return 1

    with csv_path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        fieldnames = list(reader.fieldnames or [])
        rows = list(reader)

    if "ImageUrl" not in fieldnames:
        fieldnames.append("ImageUrl")

    filled = 0
    skipped = 0
    errors = 0
    fetched = 0
    remaining = args.limit if args.limit > 0 else None

    for row in rows:
        pid = (row.get("ProductIdVTEX") or "").strip()
        if not pid:
            continue
        current = (row.get("ImageUrl") or "").strip()
        if current and not args.no_skip:
            skipped += 1
            continue
        if remaining is not None and remaining <= 0:
            break
        if args.dry_run:
            fetched += 1
            if remaining is not None:
                remaining -= 1
            continue
        try:
            url = fetch_image_url(pid, timeout=args.timeout)
            row["ImageUrl"] = url
            if url:
                filled += 1
            else:
                errors += 1
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, json.JSONDecodeError, OSError) as e:
            row["ImageUrl"] = ""
            errors += 1
            print(f"aviso: {pid}: {e}", file=sys.stderr)
        fetched += 1
        if remaining is not None:
            remaining -= 1
        time.sleep(max(0.0, args.sleep))

    if args.dry_run:
        print(f"dry-run: buscas que seriam feitas={fetched} | já com ImageUrl (pulados)={skipped}")
        return 0

    if args.backup and out_path == csv_path:
        bak = csv_path.with_suffix(csv_path.suffix + ".bak")
        shutil.copy2(csv_path, bak)
        print(f"Backup: {bak}")

    with out_path.open("w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        w.writeheader()
        for row in rows:
            w.writerow({k: row.get(k, "") for k in fieldnames})

    print(
        f"Gravado: {out_path} | preenchidos={filled} | vazios/erro={errors} | "
        f"pulados (já tinham URL)={skipped} | buscas feitas={fetched}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
