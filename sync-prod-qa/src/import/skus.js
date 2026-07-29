/**
 * Upsert SKUs by RefId + files/EANs.
 * Lookup: GET .../stockkeepingunitidbyrefid/{refId}
 */
export async function importSkus(client, skusPayload, idMap, { dryRun = false, reportError } = {}) {
  const stats = { created: 0, updated: 0, skipped: 0, failed: 0 };
  const skus = skusPayload?.skus || [];
  const filesBySku = new Map((skusPayload?.files || []).map((f) => [String(f.skuId), f.files || []]));

  for (const sku of skus) {
    if (sku._exportError) {
      stats.skipped += 1;
      continue;
    }

    const prodSkuId = sku.Id ?? sku.id;
    const refId = sku.RefId ?? sku.refId;
    const prodProductId = sku.ProductId ?? sku.productId;
    const qaProductId = idMap.get('products', prodProductId);

    if (!qaProductId) {
      stats.failed += 1;
      reportError?.('skus', 'Product QA não mapeado', { prodSkuId, prodProductId, refId });
      continue;
    }

    const payload = {
      ProductId: qaProductId,
      Name: sku.Name ?? sku.name,
      RefId: refId || null,
      IsActive: sku.IsActive ?? sku.isActive ?? true,
      ActivateIfPossible: sku.ActivateIfPossible ?? true,
      PackagedHeight: sku.PackagedHeight ?? sku.Height ?? 1,
      PackagedLength: sku.PackagedLength ?? sku.Length ?? 1,
      PackagedWidth: sku.PackagedWidth ?? sku.Width ?? 1,
      PackagedWeightKg: sku.PackagedWeightKg ?? sku.WeightKg ?? 1,
      Height: sku.Height ?? null,
      Length: sku.Length ?? null,
      Width: sku.Width ?? null,
      WeightKg: sku.WeightKg ?? null,
      CubicWeight: sku.CubicWeight ?? null,
      IsKit: sku.IsKit ?? false,
      CreationDate: undefined,
      ManufacturerCode: sku.ManufacturerCode ?? null,
      CommercialConditionId: sku.CommercialConditionId ?? 1,
      MeasurementUnit: sku.MeasurementUnit ?? 'un',
      UnitMultiplier: sku.UnitMultiplier ?? 1,
      ModalType: sku.ModalType ?? null,
    };

    try {
      let qaSkuId = null;
      if (refId) {
        try {
          const { data } = await client.get(
            `/api/catalog_system/pvt/sku/stockkeepingunitidbyrefid/${encodeURIComponent(refId)}`,
          );
          qaSkuId = typeof data === 'number' ? data : data?.Id ?? data?.id ?? Number(data);
          if (Number.isNaN(qaSkuId)) qaSkuId = null;
        } catch (err) {
          if (err.status !== 404) throw err;
        }
      }

      if (dryRun) {
        idMap.set('skus', prodSkuId, qaSkuId ?? `dry:s:${prodSkuId}`, { refId, productId: qaProductId });
        qaSkuId ? (stats.updated += 1) : (stats.created += 1);
        continue;
      }

      if (qaSkuId) {
        await client.put(`/api/catalog/pvt/stockkeepingunit/${qaSkuId}`, {
          ...payload,
          Id: qaSkuId,
        });
        idMap.set('skus', prodSkuId, qaSkuId, { refId, productId: qaProductId });
        stats.updated += 1;
      } else {
        const { data } = await client.post('/api/catalog/pvt/stockkeepingunit', payload);
        qaSkuId = data?.Id ?? data?.id;
        idMap.set('skus', prodSkuId, qaSkuId, { refId, productId: qaProductId });
        stats.created += 1;
      }

      // EANs
      const eans = sku._eans || [];
      for (const ean of eans) {
        const code = typeof ean === 'string' ? ean : ean?.Ean ?? ean?.ean;
        if (!code) continue;
        try {
          await client.post(`/api/catalog/pvt/stockkeepingunit/${qaSkuId}/ean/${encodeURIComponent(code)}`);
        } catch {
          // já existe
        }
      }

      // Files (imagens) — envia URL externa se disponível
      const files = filesBySku.get(String(prodSkuId)) || [];
      for (const file of files) {
        const url = file.Url ?? file.url ?? file.Path ?? file.path;
        if (!url) continue;
        try {
          await client.post(`/api/catalog/pvt/stockkeepingunit/${qaSkuId}/file`, {
            IsMain: file.IsMain ?? file.IsPrimary ?? false,
            Label: file.Label ?? file.Name ?? null,
            Name: file.Name ?? null,
            Text: null,
            Url: url.startsWith('http') ? url : null,
          });
        } catch (err) {
          reportError?.('skus', `file sku ${prodSkuId}: ${err.message}`);
        }
      }
    } catch (err) {
      stats.failed += 1;
      reportError?.('skus', err.message, { prodSkuId, refId });
    }
  }

  return stats;
}
