import path from 'node:path';
import { importBrands } from './brands.js';
import { importCategories } from './categories.js';
import { importSpecs } from './specs.js';
import { importProducts } from './products.js';
import { importSkus } from './skus.js';
import { importPrices } from './prices.js';
import { importInventory } from './inventory.js';
import { IdMap } from '../lib/idMap.js';
import { readJson, findLatestSnapshot } from '../lib/fs.js';
import { recordImport, recordError } from '../lib/report.js';

async function loadEntity(snapDir, name) {
  try {
    return await readJson(path.join(snapDir, `${name}.json`));
  } catch (err) {
    if (err.code === 'ENOENT') return null;
    throw err;
  }
}

export async function runImport(config, client, { entities, report, dryRun = false, snapshotDir = null }) {
  const snapDir = snapshotDir || (await findLatestSnapshot(config.snapshotsDir));
  if (!snapDir) {
    throw new Error('Nenhum snapshot encontrado. Rode npm run export antes.');
  }

  console.log(`Importando de ${snapDir}${dryRun ? ' (dry-run)' : ''}...`);

  const idMap = await IdMap.load(config.idMapPath);
  const reportError = (entity, message, meta) => recordError(report, entity, message, meta);

  if (entities.includes('brands')) {
    console.log('Importando brands...');
    const brands = await loadEntity(snapDir, 'brands');
    if (!brands) {
      recordError(report, 'brands', 'brands.json ausente no snapshot');
    } else {
      const stats = await importBrands(client, brands, idMap, { dryRun, reportError });
      recordImport(report, 'brands', stats);
      await idMap.save();
      console.log('  brands:', stats);
    }
  }

  if (entities.includes('categories')) {
    console.log('Importando categories...');
    const categories = await loadEntity(snapDir, 'categories');
    if (!categories?.flat) {
      recordError(report, 'categories', 'categories.json ausente/ incompleto');
    } else {
      const stats = await importCategories(client, categories.flat, idMap, { dryRun, reportError });
      recordImport(report, 'categories', stats);
      await idMap.save();
      console.log('  categories:', stats);
    }
  }

  if (entities.includes('specs')) {
    console.log('Importando specs...');
    const specs = await loadEntity(snapDir, 'specs');
    if (!specs) {
      recordError(report, 'specs', 'specs.json ausente');
    } else {
      const stats = await importSpecs(client, specs, idMap, { dryRun, reportError });
      recordImport(report, 'specs', stats);
      await idMap.save();
      console.log('  specs:', stats);
    }
  }

  if (entities.includes('products')) {
    console.log('Importando products...');
    const products = await loadEntity(snapDir, 'products');
    if (!products) {
      recordError(report, 'products', 'products.json ausente');
    } else {
      const stats = await importProducts(client, products, idMap, { dryRun, reportError });
      recordImport(report, 'products', stats);
      await idMap.save();
      console.log('  products:', stats);
    }
  }

  if (entities.includes('skus')) {
    console.log('Importando skus...');
    const skus = await loadEntity(snapDir, 'skus');
    if (!skus) {
      recordError(report, 'skus', 'skus.json ausente');
    } else {
      const stats = await importSkus(client, skus, idMap, { dryRun, reportError });
      recordImport(report, 'skus', stats);
      await idMap.save();
      console.log('  skus:', stats);
    }
  }

  if (entities.includes('prices')) {
    console.log('Importando prices...');
    const prices = await loadEntity(snapDir, 'prices');
    if (!prices) {
      recordError(report, 'prices', 'prices.json ausente');
    } else {
      const stats = await importPrices(client, prices, idMap, { dryRun, reportError });
      recordImport(report, 'prices', stats);
      await idMap.save();
      console.log('  prices:', stats);
    }
  }

  if (entities.includes('inventory')) {
    console.log('Importando inventory...');
    const inventory = await loadEntity(snapDir, 'inventory');
    if (!inventory) {
      recordError(report, 'inventory', 'inventory.json ausente');
    } else {
      const stats = await importInventory(client, inventory, idMap, config, { dryRun, reportError });
      recordImport(report, 'inventory', stats);
      await idMap.save();
      console.log('  inventory:', stats);
    }
  }

  await idMap.save();
  console.log('Import concluído. id-map →', config.idMapPath);
  return { snapDir, idMap };
}
