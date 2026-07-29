import fs from 'node:fs/promises';
import path from 'node:path';

export function createReport() {
  return {
    startedAt: new Date().toISOString(),
    finishedAt: null,
    export: {},
    import: {},
    errors: [],
  };
}

export function recordExport(report, entity, count) {
  report.export[entity] = { count };
}

export function recordImport(report, entity, stats) {
  report.import[entity] = {
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    ...stats,
  };
}

export function recordError(report, entity, message, meta = {}) {
  report.errors.push({
    at: new Date().toISOString(),
    entity,
    message,
    ...meta,
  });
}

export async function writeReport(report, dir) {
  report.finishedAt = new Date().toISOString();
  await fs.mkdir(dir, { recursive: true });
  const file = path.join(dir, 'report.json');
  await fs.writeFile(file, JSON.stringify(report, null, 2), 'utf8');
  return file;
}

export function printReport(report) {
  console.log('\n=== Relatório ===');
  console.log('Export:', JSON.stringify(report.export, null, 2));
  console.log('Import:', JSON.stringify(report.import, null, 2));
  if (report.errors.length) {
    console.log(`Erros (${report.errors.length}):`);
    for (const err of report.errors.slice(0, 30)) {
      console.log(`  - [${err.entity}] ${err.message}`);
    }
    if (report.errors.length > 30) {
      console.log(`  ... e mais ${report.errors.length - 30}`);
    }
  } else {
    console.log('Erros: nenhum');
  }
}
