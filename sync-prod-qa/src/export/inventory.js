import { mapPool } from '../lib/fs.js';

/**
 * Export inventory per SKU + warehouse list.
 * Warehouses cannot be created via REST — only listed for mapping.
 */
export async function exportInventory(client, skuIds, { concurrency = 2, onProgress } = {}) {
  let warehouses = [];
  try {
    const { data } = await client.get('/api/logistics/pvt/configuration/warehouses');
    warehouses = Array.isArray(data) ? data : data?.items || [];
  } catch (err) {
    warehouses = { error: err.message };
  }

  const inventory = [];
  await mapPool(skuIds, concurrency, async (skuId, i) => {
    if (onProgress && i % 50 === 0) onProgress(i, skuIds.length);
    try {
      const { data } = await client.get(`/api/logistics/pvt/inventory/skus/${skuId}`);
      inventory.push({
        skuId,
        balance: Array.isArray(data) ? data : data?.balance || data || [],
      });
    } catch (err) {
      inventory.push({ skuId, balance: [], error: err.message });
    }
  });

  return { warehouses, inventory };
}
