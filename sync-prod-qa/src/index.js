#!/usr/bin/env node
import path from 'node:path';
import { ALL_ENTITIES, loadConfig } from './config.js';
import { createProdClient, createQaClient } from './http/client.js';
import { runExport } from './export/index.js';
import { runImport } from './import/index.js';
import { runStock } from './commands/stock.js';
import { createReport, writeReport, printReport, recordError } from './lib/report.js';

function printHelp() {
  console.log(`
Uso:
  npm run export -- [opções]
  npm run import -- [opções]
  npm run sync   -- [opções]
  npm run stock  -- [opções]

  node src/index.js <export|import|sync|stock> [opções]

Opções gerais:
  --entities=a,b,c   Subconjunto: ${ALL_ENTITIES.join(', ')}
                     (padrão: todas)
  --dry-run          Sem escrita (import/stock)
  --snapshot=PATH    Pasta de snapshot para import (padrão: último em data/snapshots)
  --help             Esta ajuda

Opções stock (só QA — nunca altera Prod):
  --qty=100          Quantidade genérica por SKU (padrão: 100 ou STOCK_QUANTITY)
  --warehouse=ID     Warehouse QA (padrão: QA_WAREHOUSE_ID ou o primeiro ativo)

Exemplos:
  npm run export
  npm run export -- --entities=brands,categories
  npm run import -- --dry-run
  npm run sync -- --entities=brands,categories,products,skus,prices
  npm run stock
  npm run stock -- --qty=999
  npm run stock -- --warehouse=1_1 --qty=100
  npm run stock -- --dry-run
`);
}

function parseArgs(argv) {
  const args = {
    command: null,
    entities: [...ALL_ENTITIES],
    dryRun: false,
    snapshot: null,
    help: false,
    qty: null,
    warehouse: null,
  };

  const positional = [];
  for (const raw of argv) {
    if (raw === '--help' || raw === '-h') {
      args.help = true;
    } else if (raw === '--dry-run') {
      args.dryRun = true;
    } else if (raw.startsWith('--entities=')) {
      const list = raw
        .slice('--entities='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const invalid = list.filter((e) => !ALL_ENTITIES.includes(e));
      if (invalid.length) {
        throw new Error(`Entidades inválidas: ${invalid.join(', ')}. Válidas: ${ALL_ENTITIES.join(', ')}`);
      }
      args.entities = list;
    } else if (raw.startsWith('--snapshot=')) {
      args.snapshot = raw.slice('--snapshot='.length);
    } else if (raw.startsWith('--qty=')) {
      args.qty = Number(raw.slice('--qty='.length));
      if (Number.isNaN(args.qty) || args.qty < 0) {
        throw new Error('--qty deve ser um número >= 0');
      }
    } else if (raw.startsWith('--warehouse=')) {
      args.warehouse = raw.slice('--warehouse='.length).trim();
    } else if (raw.startsWith('-')) {
      throw new Error(`Flag desconhecida: ${raw}`);
    } else {
      positional.push(raw);
    }
  }

  args.command = positional[0] || null;
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.command) {
    printHelp();
    process.exit(args.help ? 0 : 1);
  }

  const command = args.command;
  if (!['export', 'import', 'sync', 'stock'].includes(command)) {
    console.error(`Comando inválido: ${command}`);
    printHelp();
    process.exit(1);
  }

  const needProd = command === 'export' || command === 'sync';
  const needQa = command === 'import' || command === 'sync' || command === 'stock';
  const config = loadConfig({ requireProd: needProd, requireQa: needQa });
  const report = createReport();

  let snapDir = args.snapshot;

  try {
    if (command === 'export' || command === 'sync') {
      const prod = createProdClient(config);
      const result = await runExport(config, prod, { entities: args.entities, report });
      snapDir = result.snapDir;
    }

    if (command === 'import' || command === 'sync') {
      const qa = createQaClient(config);
      const result = await runImport(config, qa, {
        entities: args.entities,
        report,
        dryRun: args.dryRun,
        snapshotDir: snapDir,
      });
      snapDir = result.snapDir;
    }

    if (command === 'stock') {
      console.log(`Aplicando estoque genérico em QA (${config.qa.account}) — Prod não é tocado.`);
      const qa = createQaClient(config);
      const stats = await runStock(config, qa, {
        quantity: args.qty ?? config.stockQuantity,
        warehouseId: args.warehouse,
        dryRun: args.dryRun,
        onProgress: (i, total) => console.log(`  stock ${i}/${total}`),
      });
      report.import.stock = {
        updated: stats.updated,
        failed: stats.failed,
        skipped: stats.skipped,
        skuIds: stats.skuIds,
        quantity: stats.quantity,
        warehouse: stats.warehouse,
      };
      for (const err of stats.errors || []) {
        recordError(report, 'stock', err.message, { skuId: err.skuId });
      }
      console.log('Stock:', stats);
    }
  } catch (err) {
    console.error('\nFalha:', err.message);
    if (process.env.DEBUG) console.error(err);
    report.errors.push({ at: new Date().toISOString(), entity: 'fatal', message: err.message });
    const outDir = snapDir || path.join(config.dataDir, 'reports');
    await writeReport(report, outDir);
    printReport(report);
    process.exit(1);
  }

  const outDir = snapDir || path.join(config.dataDir, 'reports');
  const reportFile = await writeReport(report, outDir);
  printReport(report);
  console.log(`\nRelatório salvo em ${reportFile}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
