/**
 * Upsert brands by Name.
 * POST /api/catalog/pvt/brand · PUT /api/catalog/pvt/brand/{brandId}
 */
export async function importBrands(client, brands, idMap, { dryRun = false, reportError } = {}) {
  const stats = { created: 0, updated: 0, skipped: 0, failed: 0 };

  // index QA brands by name
  let qaByName = new Map();
  try {
    const { data } = await client.get('/api/catalog_system/pvt/brand/list');
    const list = Array.isArray(data) ? data : [];
    for (const b of list) {
      const name = (b.name ?? b.Name ?? '').trim().toLowerCase();
      if (name) qaByName.set(name, b);
    }
  } catch (err) {
    reportError?.('brands', `Falha ao listar brands QA: ${err.message}`);
  }

  for (const brand of brands) {
    const prodId = brand.id ?? brand.Id;
    const name = brand.name ?? brand.Name;
    if (!name) {
      stats.skipped += 1;
      continue;
    }

    const payload = {
      Name: name,
      Text: brand.text ?? brand.Text ?? name,
      Keywords: brand.keywords ?? brand.Keywords ?? name,
      SiteTitle: brand.siteTitle ?? brand.SiteTitle ?? name,
      Active: brand.isActive ?? brand.Active ?? brand.active ?? true,
      MenuHome: brand.menuHome ?? brand.MenuHome ?? false,
      AdWordsRemarketingCode: brand.adWordsRemarketingCode ?? brand.AdWordsRemarketingCode ?? null,
      LomadeeCampaignCode: brand.lomadeeCampaignCode ?? brand.LomadeeCampaignCode ?? null,
      Score: brand.score ?? brand.Score ?? null,
    };

    try {
      const existing = qaByName.get(name.trim().toLowerCase());
      if (dryRun) {
        idMap.set('brands', prodId, existing?.id ?? existing?.Id ?? `dry:${prodId}`, { name });
        existing ? (stats.updated += 1) : (stats.created += 1);
        continue;
      }

      if (existing) {
        const qaId = existing.id ?? existing.Id;
        await client.put(`/api/catalog/pvt/brand/${qaId}`, { ...payload, Id: qaId });
        idMap.set('brands', prodId, qaId, { name });
        stats.updated += 1;
      } else {
        const { data } = await client.post('/api/catalog/pvt/brand', payload);
        const qaId = data?.Id ?? data?.id;
        idMap.set('brands', prodId, qaId, { name });
        if (qaId != null) qaByName.set(name.trim().toLowerCase(), { Id: qaId, Name: name });
        stats.created += 1;
      }
    } catch (err) {
      stats.failed += 1;
      reportError?.('brands', err.message, { prodId, name });
    }
  }

  return stats;
}
