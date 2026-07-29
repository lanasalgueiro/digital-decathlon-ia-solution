import { mapPool } from '../lib/fs.js';

/**
 * Export prices (Pricing API host) + price tables list.
 */
export async function exportPrices(client, skuIds, { concurrency = 2, onProgress } = {}) {
  let tables = [];
  try {
    const { data } = await client.pricingGet('/pricing/tables');
    tables = Array.isArray(data) ? data : data?.items || [];
  } catch (err) {
    tables = { error: err.message };
  }

  const prices = [];
  await mapPool(skuIds, concurrency, async (skuId, i) => {
    if (onProgress && i % 50 === 0) onProgress(i, skuIds.length);
    try {
      const { data } = await client.pricingGet(`/pricing/prices/${skuId}`);
      prices.push({ skuId, price: data });
    } catch (err) {
      if (err.status === 404) {
        prices.push({ skuId, price: null });
      } else {
        prices.push({ skuId, price: null, error: err.message });
      }
    }
  });

  return { tables, prices };
}
