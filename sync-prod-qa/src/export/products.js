import { mapPool } from '../lib/fs.js';

function skuIdsWithStock(product) {
  const skuIds = [];
  for (const item of product.items || []) {
    if (item.isActive === false) continue;
    const hasStock = (item.sellers || []).some((s) => {
      const offer = s.commertialOffer || {};
      return (offer.AvailableQuantity || 0) > 0 || offer.IsAvailable === true;
    });
    if (!hasStock) continue;
    const skuId = Number(item.itemId);
    if (!Number.isNaN(skuId)) skuIds.push(skuId);
  }
  return skuIds;
}

/**
 * Completa o mapa buscando por categoria (contorna o cap ~2500 do search global).
 */
async function collectByCategory(client, productSkuMap, { maxProducts, onProgress }) {
  const pageSize = 50;
  const hardFromCap = 2500;

  let categoryIds = [];
  try {
    const { data: tree } = await client.get('/api/catalog_system/pub/category/tree/10');
    const walk = (nodes) => {
      for (const n of nodes || []) {
        const id = n.id ?? n.Id;
        if (id != null) categoryIds.push(id);
        walk(n.children ?? n.Children ?? []);
      }
    };
    walk(Array.isArray(tree) ? tree : []);
  } catch {
    return;
  }

  for (const categoryId of categoryIds) {
    if (Object.keys(productSkuMap).length >= maxProducts) break;

    for (let from = 0; from < hardFromCap && Object.keys(productSkuMap).length < maxProducts; from += pageSize) {
      const to = from + pageSize - 1;
      let data;
      try {
        const res = await client.get('/api/catalog_system/pub/products/search', {
          query: {
            fq: `C:${categoryId}`,
            _from: from,
            _to: to,
            O: 'OrderByTopSaleDESC',
          },
        });
        data = res.data;
      } catch {
        break;
      }

      if (!Array.isArray(data) || data.length === 0) break;

      let added = 0;
      for (const p of data) {
        if (Object.keys(productSkuMap).length >= maxProducts) break;
        const productId = String(p.productId ?? '');
        if (!productId || productSkuMap[productId]) continue;
        const skuIds = skuIdsWithStock(p);
        if (!skuIds.length) continue;
        productSkuMap[productId] = skuIds;
        added += 1;
      }

      if (onProgress && added) {
        onProgress(Object.keys(productSkuMap).length, maxProducts);
      }
      if (data.length < pageSize) break;
    }
  }
}

/**
 * Exporta até maxProducts disponíveis para venda com estoque.
 * Usa Catalog Search (não varre os ~400k IDs).
 */
export async function exportProducts(client, {
  concurrency = 2,
  maxProducts = 5000,
  salesChannel = 1,
  onProgress,
} = {}) {
  const productSkuMap = {};
  const pageSize = 50;
  const hardFromCap = 2500;

  console.log(`  coletando até ${maxProducts} produtos disponíveis com estoque (SC ${salesChannel})...`);

  for (let from = 0; from < hardFromCap && Object.keys(productSkuMap).length < maxProducts; from += pageSize) {
    const to = from + pageSize - 1;
    let data;
    try {
      const res = await client.get('/api/catalog_system/pub/products/search', {
        query: {
          fq: `isAvailablePerSalesChannel_${salesChannel}:1`,
          _from: from,
          _to: to,
          O: 'OrderByTopSaleDESC',
        },
      });
      data = res.data;
    } catch (err) {
      console.warn(`  search global falhou em _from=${from}: ${err.message}`);
      break;
    }

    if (!Array.isArray(data) || data.length === 0) break;

    for (const p of data) {
      if (Object.keys(productSkuMap).length >= maxProducts) break;
      const productId = String(p.productId ?? '');
      if (!productId || productSkuMap[productId]) continue;
      const skuIds = skuIdsWithStock(p);
      if (!skuIds.length) continue;
      productSkuMap[productId] = skuIds;
    }

    if (onProgress) onProgress(Object.keys(productSkuMap).length, maxProducts);
    if (data.length < pageSize) break;
  }

  if (Object.keys(productSkuMap).length < maxProducts) {
    console.log(`  search global: ${Object.keys(productSkuMap).length}. Completando por categoria...`);
    await collectByCategory(client, productSkuMap, { maxProducts, onProgress });
  }

  const productIds = Object.keys(productSkuMap).slice(0, maxProducts);
  for (const id of Object.keys(productSkuMap)) {
    if (!productIds.includes(id)) delete productSkuMap[id];
  }

  console.log(`  ${productIds.length} produtos selecionados. Buscando detalhe...`);

  const products = [];
  const productSpecs = [];

  await mapPool(productIds, concurrency, async (productId, i) => {
    if (onProgress && i % 50 === 0) onProgress(i, productIds.length);
    try {
      const { data: product } = await client.get(`/api/catalog/pvt/product/${productId}`);
      if (product.IsActive === false) {
        delete productSkuMap[productId];
        return;
      }
      products.push(product);

      try {
        const { data: specs } = await client.get(
          `/api/catalog_system/pvt/products/${productId}/specification`,
        );
        productSpecs.push({ productId: Number(productId), specs: Array.isArray(specs) ? specs : [] });
      } catch {
        productSpecs.push({ productId: Number(productId), specs: [] });
      }
    } catch (err) {
      products.push({ Id: Number(productId), _exportError: err.message });
    }
  });

  return {
    productSkuMap,
    products,
    productSpecs,
    meta: {
      maxProducts,
      salesChannel,
      selected: Object.keys(productSkuMap).length,
      filter: 'available_with_stock',
    },
  };
}
