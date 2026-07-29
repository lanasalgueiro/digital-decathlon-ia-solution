import { mapPool } from '../lib/fs.js';

/**
 * Export SKU details + files for each skuId.
 */
export async function exportSkus(client, skuIds, { concurrency = 2, onProgress } = {}) {
  const skus = [];
  const files = [];

  await mapPool(skuIds, concurrency, async (skuId, i) => {
    if (onProgress && i % 50 === 0) onProgress(i, skuIds.length);
    try {
      const { data: sku } = await client.get(`/api/catalog/pvt/stockkeepingunit/${skuId}`);
      skus.push(sku);

      try {
        const { data: skuFiles } = await client.get(
          `/api/catalog/pvt/stockkeepingunit/${skuId}/file`,
        );
        files.push({
          skuId,
          files: Array.isArray(skuFiles) ? skuFiles : [],
        });
      } catch {
        files.push({ skuId, files: [] });
      }

      try {
        const { data: eans } = await client.get(
          `/api/catalog/pvt/stockkeepingunit/${skuId}/ean`,
        );
        sku._eans = Array.isArray(eans) ? eans : eans ? [eans] : [];
      } catch {
        sku._eans = [];
      }
    } catch (err) {
      skus.push({ Id: skuId, _exportError: err.message });
    }
  });

  return { skus, files };
}
