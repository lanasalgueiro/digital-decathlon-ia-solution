import path from 'node:path';
import { exportBrands } from './brands.js';
import { exportCategories } from './categories.js';
import { exportSpecs } from './specs.js';
import { exportProducts } from './products.js';
import { exportSkus } from './skus.js';
import { exportPrices } from './prices.js';
import { exportInventory } from './inventory.js';
import { writeJson, timestampSlug, ensureDir } from '../lib/fs.js';
import { sanitizeSnapshot } from '../lib/sanitize.js';
import { recordExport, recordError } from '../lib/report.js';

export async function runExport(config, client, { entities, report }) {
  const snapDir = path.join(config.snapshotsDir, timestampSlug());
  await ensureDir(snapDir);

  const snapshot = {
    meta: {
      sourceAccount: config.prod.account,
      targetAccount: config.qa.account,
      exportedAt: new Date().toISOString(),
      entities,
    },
  };

  console.log(`Snapshot → ${snapDir}`);

  if (entities.includes('brands')) {
    console.log('Exportando brands...');
    try {
      snapshot.brands = await exportBrands(client);
      recordExport(report, 'brands', snapshot.brands.length);
      await writeJson(path.join(snapDir, 'brands.json'), snapshot.brands);
    } catch (err) {
      recordError(report, 'brands', err.message);
      throw err;
    }
  }

  if (entities.includes('categories')) {
    console.log('Exportando categories...');
    try {
      snapshot.categories = await exportCategories(client, config.categoryTreeLevels);
      recordExport(report, 'categories', snapshot.categories.flat.length);
      await writeJson(path.join(snapDir, 'categories.json'), snapshot.categories);
    } catch (err) {
      recordError(report, 'categories', err.message);
      throw err;
    }
  }

  if (entities.includes('specs')) {
    console.log('Exportando specs...');
    try {
      const categoryIds = (snapshot.categories?.flat || []).map((c) => c.id);
      if (!categoryIds.length && entities.includes('categories') === false) {
        const cats = await exportCategories(client, config.categoryTreeLevels);
        snapshot.categories = cats;
        categoryIds.push(...cats.flat.map((c) => c.id));
      }
      snapshot.specs = await exportSpecs(client, categoryIds, config.concurrency);
      recordExport(report, 'specs', {
        groups: snapshot.specs.groups.length,
        fields: snapshot.specs.fields.length,
        fieldValues: snapshot.specs.fieldValues.length,
      });
      await writeJson(path.join(snapDir, 'specs.json'), snapshot.specs);
    } catch (err) {
      recordError(report, 'specs', err.message);
      throw err;
    }
  }

  let skuIds = [];

  if (entities.includes('products') || entities.includes('skus') || entities.includes('prices') || entities.includes('inventory')) {
    console.log(
      `Exportando products + product specs (max ${config.maxProducts}, disponíveis com estoque, SC ${config.salesChannel})...`,
    );
    try {
      snapshot.products = await exportProducts(client, {
        concurrency: config.concurrency,
        maxProducts: config.maxProducts,
        salesChannel: config.salesChannel,
        onProgress: (i, total) => console.log(`  products ${i}/${total}`),
      });
      snapshot.meta.productFilter = snapshot.products.meta;
      recordExport(report, 'products', snapshot.products.products.length);
      await writeJson(path.join(snapDir, 'products.json'), snapshot.products);

      skuIds = [...new Set(Object.values(snapshot.products.productSkuMap).flat())];
      console.log(`  SKUs com estoque vinculados: ${skuIds.length}`);
    } catch (err) {
      recordError(report, 'products', err.message);
      throw err;
    }
  }

  if (entities.includes('skus')) {
    console.log(`Exportando ${skuIds.length} SKUs...`);
    try {
      snapshot.skus = await exportSkus(client, skuIds, {
        concurrency: config.concurrency,
        onProgress: (i, total) => console.log(`  skus ${i}/${total}`),
      });
      recordExport(report, 'skus', snapshot.skus.skus.length);
      await writeJson(path.join(snapDir, 'skus.json'), snapshot.skus);
    } catch (err) {
      recordError(report, 'skus', err.message);
      throw err;
    }
  }

  if (entities.includes('prices')) {
    console.log(`Exportando prices (${skuIds.length} SKUs)...`);
    try {
      snapshot.prices = await exportPrices(client, skuIds, {
        concurrency: config.concurrency,
        onProgress: (i, total) => console.log(`  prices ${i}/${total}`),
      });
      recordExport(report, 'prices', snapshot.prices.prices.length);
      await writeJson(path.join(snapDir, 'prices.json'), snapshot.prices);
    } catch (err) {
      recordError(report, 'prices', err.message);
      throw err;
    }
  }

  if (entities.includes('inventory')) {
    console.log(`Exportando inventory (${skuIds.length} SKUs)...`);
    try {
      snapshot.inventory = await exportInventory(client, skuIds, {
        concurrency: config.concurrency,
        onProgress: (i, total) => console.log(`  inventory ${i}/${total}`),
      });
      recordExport(report, 'inventory', snapshot.inventory.inventory.length);
      await writeJson(path.join(snapDir, 'inventory.json'), snapshot.inventory);
    } catch (err) {
      recordError(report, 'inventory', err.message);
      throw err;
    }
  }

  const sanitized = sanitizeSnapshot(snapshot, {
    prodAccount: config.prod.account,
    qaAccount: config.qa.account,
  });
  await writeJson(path.join(snapDir, 'snapshot.json'), sanitized);
  await writeJson(path.join(snapDir, 'meta.json'), sanitized.meta);

  console.log('Export concluído.');
  return { snapDir, snapshot: sanitized };
}
