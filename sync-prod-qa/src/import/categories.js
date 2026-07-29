import { orderCategoriesParentsFirst } from '../lib/order.js';

/**
 * Upsert categories parents-first, mapped by Name+father path.
 * POST /api/catalog/pvt/category · PUT /api/catalog/pvt/category/{categoryId}
 */
export async function importCategories(client, flatCategories, idMap, { dryRun = false, reportError } = {}) {
  const stats = { created: 0, updated: 0, skipped: 0, failed: 0 };
  const ordered = orderCategoriesParentsFirst(flatCategories);

  // Build QA index from tree
  const qaByKey = new Map();

  async function loadQaTree() {
    try {
      const { data: tree } = await client.get('/api/catalog_system/pub/category/tree/10');
      const walk = (nodes, parentId = null) => {
        for (const n of nodes || []) {
          const id = n.id ?? n.Id;
          const name = (n.name ?? n.Name ?? '').trim().toLowerCase();
          qaByKey.set(`${parentId ?? 0}:${name}`, { id, name: n.name ?? n.Name, fatherCategoryId: parentId });
          walk(n.children ?? n.Children ?? [], id);
        }
      };
      walk(Array.isArray(tree) ? tree : []);
    } catch (err) {
      reportError?.('categories', `Falha ao carregar árvore QA: ${err.message}`);
    }
  }

  await loadQaTree();

  for (const cat of ordered) {
    const prodId = cat.id;
    const name = cat.name;
    if (!name) {
      stats.skipped += 1;
      continue;
    }

    let qaFatherId = null;
    if (cat.fatherCategoryId != null && cat.fatherCategoryId !== 0) {
      qaFatherId = idMap.get('categories', cat.fatherCategoryId);
      if (qaFatherId == null && !dryRun) {
        stats.failed += 1;
        reportError?.('categories', `Pai não mapeado: prod father ${cat.fatherCategoryId}`, { prodId, name });
        continue;
      }
    }

    const key = `${qaFatherId ?? 0}:${name.trim().toLowerCase()}`;
    const payload = {
      Name: name,
      FatherCategoryId: qaFatherId ?? 0,
      Title: cat.title || name,
      Description: cat.description || '',
      Keywords: cat.keywords || name,
      IsActive: cat.isActive !== false,
      ShowInMenu: cat.showInMenu !== false,
      MetaTagDescription: cat.metaTagDescription || '',
      Score: cat.score ?? null,
    };

    try {
      const existing = qaByKey.get(key);
      if (dryRun) {
        idMap.set('categories', prodId, existing?.id ?? `dry:${prodId}`, { name, fatherCategoryId: qaFatherId });
        existing ? (stats.updated += 1) : (stats.created += 1);
        continue;
      }

      if (existing) {
        const qaId = existing.id;
        await client.put(`/api/catalog/pvt/category/${qaId}`, { ...payload, Id: qaId });
        idMap.set('categories', prodId, qaId, { name, fatherCategoryId: qaFatherId });
        stats.updated += 1;
      } else {
        const { data } = await client.post('/api/catalog/pvt/category', payload);
        const qaId = data?.Id ?? data?.id;
        idMap.set('categories', prodId, qaId, { name, fatherCategoryId: qaFatherId });
        if (qaId != null) qaByKey.set(key, { id: qaId, name, fatherCategoryId: qaFatherId });
        stats.created += 1;
      }
    } catch (err) {
      stats.failed += 1;
      reportError?.('categories', err.message, { prodId, name });
    }
  }

  return stats;
}
