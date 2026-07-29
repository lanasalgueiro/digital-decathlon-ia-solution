/**
 * Upsert products by RefId.
 * GET productgetbyrefid → PUT ou POST.
 */
export async function importProducts(client, productsPayload, idMap, { dryRun = false, reportError } = {}) {
  const stats = { created: 0, updated: 0, skipped: 0, failed: 0 };
  const products = productsPayload?.products || [];
  const productSpecs = productsPayload?.productSpecs || [];

  for (const product of products) {
    if (product._exportError) {
      stats.skipped += 1;
      continue;
    }

    const prodId = product.Id ?? product.id;
    const refId = product.RefId ?? product.refId;
    const name = product.Name ?? product.name;

    if (!refId && !name) {
      stats.skipped += 1;
      reportError?.('products', 'Produto sem RefId e sem Name', { prodId });
      continue;
    }

    const qaCategoryId = idMap.get('categories', product.CategoryId ?? product.categoryId);
    const qaBrandId = idMap.get('brands', product.BrandId ?? product.brandId);

    if (qaCategoryId == null || qaBrandId == null) {
      stats.failed += 1;
      reportError?.('products', `Category/Brand não mapeados`, {
        prodId,
        refId,
        categoryId: product.CategoryId,
        brandId: product.BrandId,
        qaCategoryId,
        qaBrandId,
      });
      continue;
    }

    const payload = {
      Name: name,
      CategoryId: qaCategoryId,
      BrandId: qaBrandId,
      RefId: refId || null,
      Title: product.Title ?? product.title ?? name,
      Description: product.Description ?? product.description ?? '',
      DescriptionShort: product.DescriptionShort ?? product.descriptionShort ?? '',
      LinkId: product.LinkId ?? product.linkId ?? null,
      KeyWords: product.KeyWords ?? product.keyWords ?? null,
      IsVisible: product.IsVisible ?? product.isVisible ?? true,
      IsActive: product.IsActive ?? product.isActive ?? true,
      MetaTagDescription: product.MetaTagDescription ?? '',
      ShowWithoutStock: product.ShowWithoutStock ?? true,
      Score: product.Score ?? null,
      TaxCode: product.TaxCode ?? null,
    };

    try {
      let qaId = null;
      if (refId) {
        try {
          const { data } = await client.get(
            `/api/catalog_system/pvt/products/productgetbyrefid/${encodeURIComponent(refId)}`,
          );
          qaId = data?.Id ?? data?.id ?? (typeof data === 'number' ? data : null);
        } catch (err) {
          if (err.status !== 404) throw err;
        }
      }

      if (dryRun) {
        idMap.set('products', prodId, qaId ?? `dry:p:${prodId}`, { refId, name });
        qaId ? (stats.updated += 1) : (stats.created += 1);
        continue;
      }

      if (qaId) {
        await client.put(`/api/catalog/pvt/product/${qaId}`, { ...payload, Id: qaId });
        idMap.set('products', prodId, qaId, { refId, name });
        stats.updated += 1;
      } else {
        const { data } = await client.post('/api/catalog/pvt/product', payload);
        qaId = data?.Id ?? data?.id;
        idMap.set('products', prodId, qaId, { refId, name });
        stats.created += 1;
      }
    } catch (err) {
      stats.failed += 1;
      reportError?.('products', err.message, { prodId, refId, name });
    }
  }

  // Product specifications
  for (const entry of productSpecs) {
    const qaProductId = idMap.get('products', entry.productId);
    if (!qaProductId || String(qaProductId).startsWith('dry:')) continue;

    for (const spec of entry.specs || []) {
      const fieldId = spec.Id ?? spec.FieldId;
      const qaFieldId = idMap.get('specFields', fieldId);
      if (!qaFieldId) continue;

      const value = spec.Value ?? spec.Text ?? spec.Name;
      try {
        if (dryRun) continue;
        // Associate product specification
        await client.post(`/api/catalog_system/pvt/products/${qaProductId}/specification`, {
          FieldId: qaFieldId,
          Text: Array.isArray(value) ? value.join(',') : String(value ?? ''),
        });
      } catch (err) {
        // tenta PUT se já existir
        try {
          await client.post(`/api/catalog/pvt/product/${qaProductId}/specification`, [
            { Id: qaFieldId, Value: Array.isArray(value) ? value : [String(value ?? '')] },
          ]);
        } catch (err2) {
          reportError?.('products', `spec product ${entry.productId}: ${err2.message}`);
        }
      }
    }
  }

  return stats;
}
