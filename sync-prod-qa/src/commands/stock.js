import { mapPool } from '../lib/fs.js';

/**
 * Lista todos os SKU IDs da conta QA (paginado).
 */
async function listAllSkuIds(client) {
  const skuIds = [];
  let page = 1;
  const pageSize = 1000;

  while (true) {
    const { data } = await client.get('/api/catalog_system/pvt/sku/stockkeepingunitids', {
      query: { page, pagesize: pageSize },
    });

    const batch = Array.isArray(data) ? data : data?.data || [];
    if (!batch.length) break;

    for (const id of batch) {
      const n = Number(id);
      if (!Number.isNaN(n)) skuIds.push(n);
    }

    if (batch.length < pageSize) break;
    page += 1;
  }

  return skuIds;
}

/**
 * Resolve warehouse QA: --warehouse, QA_WAREHOUSE_ID, ou o primeiro ativo da conta.
 */
async function resolveWarehouse(client, warehouseId) {
  const { data } = await client.get('/api/logistics/pvt/configuration/warehouses');
  const warehouses = Array.isArray(data) ? data : data?.items || [];

  if (!warehouses.length) {
    throw new Error(
      'Nenhum warehouse em QA. Crie um no Admin de Logística antes de rodar stock.',
    );
  }

  if (warehouseId) {
    const found = warehouses.find((w) => String(w.id ?? w.Id) === String(warehouseId));
    if (!found) {
      const available = warehouses.map((w) => `${w.id ?? w.Id} (${w.name ?? w.Name})`).join(', ');
      throw new Error(`Warehouse "${warehouseId}" não encontrado. Disponíveis: ${available}`);
    }
    return { id: found.id ?? found.Id, name: found.name ?? found.Name };
  }

  const active = warehouses.find((w) => w.isActive !== false && w.IsActive !== false) || warehouses[0];
  return { id: active.id ?? active.Id, name: active.name ?? active.Name };
}

/**
 * Aplica estoque genérico em todos os SKUs da QA.
 * Só escreve na conta QA — nunca em Prod.
 */
export async function runStock(config, client, {
  quantity = 100,
  warehouseId = null,
  dryRun = false,
  onProgress,
} = {}) {
  const warehouse = await resolveWarehouse(client, warehouseId || config.qaWarehouseId || null);
  console.log(`Warehouse QA: ${warehouse.id} (${warehouse.name})`);
  console.log(`Quantidade genérica: ${quantity}${dryRun ? ' [dry-run]' : ''}`);

  console.log('Listando SKUs em QA...');
  const skuIds = await listAllSkuIds(client);
  console.log(`  ${skuIds.length} SKUs encontrados`);

  if (!skuIds.length) {
    return { updated: 0, failed: 0, skipped: 0, warehouse, quantity, skuIds: 0 };
  }

  const stats = { updated: 0, failed: 0, skipped: 0, errors: [] };
  const payload = {
    unlimitedQuantity: false,
    quantity: Number(quantity),
    dateUtcOnBalanceSystem: null,
  };

  await mapPool(skuIds, config.concurrency, async (skuId, i) => {
    if (onProgress && i % 50 === 0) onProgress(i, skuIds.length);
    try {
      if (dryRun) {
        stats.updated += 1;
        return;
      }
      await client.put(
        `/api/logistics/pvt/inventory/skus/${skuId}/warehouses/${warehouse.id}`,
        payload,
      );
      stats.updated += 1;
    } catch (err) {
      stats.failed += 1;
      if (stats.errors.length < 50) {
        stats.errors.push({ skuId, message: err.message });
      }
    }
  });

  if (onProgress) onProgress(skuIds.length, skuIds.length);

  return {
    ...stats,
    warehouse,
    quantity,
    skuIds: skuIds.length,
  };
}
