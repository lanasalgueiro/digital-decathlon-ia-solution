/**
 * Upsert prices via Pricing API: PUT /pricing/prices/{skuId}
 * SKU id must be the QA sku id.
 */
export async function importPrices(client, pricesPayload, idMap, { dryRun = false, reportError } = {}) {
  const stats = { created: 0, updated: 0, skipped: 0, failed: 0 };
  const prices = pricesPayload?.prices || [];

  for (const entry of prices) {
    const prodSkuId = entry.skuId;
    const price = entry.price;
    if (!price) {
      stats.skipped += 1;
      continue;
    }

    const qaSkuId = idMap.get('skus', prodSkuId);
    if (!qaSkuId || String(qaSkuId).startsWith('dry:')) {
      stats.failed += 1;
      reportError?.('prices', 'SKU QA não mapeado', { prodSkuId });
      continue;
    }

    const payload = {
      markup: price.markup ?? price.Markup ?? 0,
      basePrice: price.basePrice ?? price.BasePrice ?? price.listPrice ?? null,
      costPrice: price.costPrice ?? price.CostPrice ?? null,
      listPrice: price.listPrice ?? price.ListPrice ?? null,
    };

    // fixedPrices se existirem
    if (Array.isArray(price.fixedPrices) && price.fixedPrices.length) {
      payload.fixedPrices = price.fixedPrices.map((fp) => ({
        tradePolicyId: String(fp.tradePolicyId ?? fp.TradePolicyId ?? ''),
        value: fp.value ?? fp.Value,
        listPrice: fp.listPrice ?? fp.ListPrice ?? null,
        minQuantity: fp.minQuantity ?? fp.MinQuantity ?? 1,
        dateRange: fp.dateRange ?? undefined,
      }));
    }

    if (payload.basePrice == null && !payload.fixedPrices?.length) {
      stats.skipped += 1;
      continue;
    }

    try {
      if (dryRun) {
        stats.updated += 1;
        continue;
      }
      await client.pricingPut(`/pricing/prices/${qaSkuId}`, payload);
      stats.updated += 1;
    } catch (err) {
      stats.failed += 1;
      reportError?.('prices', err.message, { prodSkuId, qaSkuId });
    }
  }

  return stats;
}
