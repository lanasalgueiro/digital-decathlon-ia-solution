# syncprod

CLI local (Node.js) para sincronizar pontualmente o catálogo VTEX de **Prod** (`decathlonstore`) para **QA** (`decathlonproqa`).

Escopo MVP: brands, categories, specs, products, SKUs (+ files/EAN), prices e inventory.

Fora do escopo: docks, shipping-policies, orderForm, gateways de pagamento, webhooks, Master Data CL.

## Pré-requisitos

1. Node.js 18+
2. App Keys no License Manager (role SyncBot least-privilege):
   - Prod: leitura Catalog / Logistics / Pricing
   - QA: save/edit nos mesmos módulos
3. Em QA, **warehouses** e trade policies / price tables já criados no Admin (não há REST para criar warehouse)
4. Produtos/SKUs com **RefId** estável (âncora de upsert)

## Setup

```bash
npm install
cp .env.example .env
```

Preencha no `.env`:

```
PROD_ACCOUNT=decathlonstore
PROD_APPKEY=...
PROD_APPTOKEN=...
QA_ACCOUNT=decathlonproqa
QA_APPKEY=...
QA_APPTOKEN=...
```

Opcional:

```
MAX_PRODUCTS=5000
SALES_CHANNEL=1
WAREHOUSE_MAP=1_1:1_1,2_1:2_1
```

Produtos: só **disponíveis para venda com estoque** (Catalog Search + `AvailableQuantity > 0`), com limite padrão de **5000** (`MAX_PRODUCTS`). Não varre os ~400k IDs.

Nunca versionar o `.env`.

## Uso

```bash
# Exporta snapshot de Prod → data/snapshots/{timestamp}/
npm run export

# Só marcas e categorias
npm run export -- --entities=brands,categories

# Importa o último snapshot para QA (idempotente)
npm run import

# Simula import (consultas de lookup, sem escrita)
npm run import -- --dry-run

# Export + import + relatório
npm run sync

# Sync parcial
npm run sync -- --entities=brands,categories,products,skus,prices

# Estoque genérico em TODOS os SKUs da QA (não toca Prod)
npm run stock
npm run stock -- --qty=999
npm run stock -- --warehouse=1_1 --qty=100
npm run stock -- --dry-run
```

Flags:

| Flag | Descrição |
|------|-----------|
| `--entities=a,b` | `brands`, `categories`, `specs`, `products`, `skus`, `prices`, `inventory` |
| `--dry-run` | Import/stock sem escrita |
| `--snapshot=PATH` | Pasta de snapshot específica no import |
| `--qty=N` | Quantidade genérica no `stock` (padrão 100) |
| `--warehouse=ID` | Warehouse QA no `stock` (senão usa o primeiro ativo) |

## Ordem de importação

1. Brands  
2. Categories (pai antes do filho)  
3. Spec Groups → Fields → Field Values  
4. Products (+ product specs)  
5. SKUs (+ files / EANs)  
6. Prices  
7. Inventory (exige warehouse pré-existente em QA)

IDs numéricos **não** são preservados. O mapa `data/id-map.json` traduz Prod → QA usando RefId (produto/SKU) ou Name (brand/category/specs).

## Artefatos

```
data/
  snapshots/{timestamp}/
    brands.json
    categories.json
    specs.json
    products.json
    skus.json
    prices.json
    inventory.json
    snapshot.json
    report.json
  id-map.json
```

## Rate limit

Concorrência padrão: `2` (`CONCURRENCY` no `.env`). Retry com backoff em 429/5xx.

## Validação sugerida

- Conferir contagens no `report.json`
- Em QA, buscar 1 SKU por RefId e checar preço/estoque
- Se inventory falhar com “Warehouse QA inexistente”, criar o warehouse no Admin ou ajustar `WAREHOUSE_MAP`
