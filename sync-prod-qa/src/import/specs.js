/**
 * Upsert spec groups → fields → field values.
 * Anchored by Name within mapped category.
 */
export async function importSpecs(client, specs, idMap, { dryRun = false, reportError } = {}) {
  const stats = { created: 0, updated: 0, skipped: 0, failed: 0 };
  const groups = specs?.groups || [];
  const fields = specs?.fields || [];
  const fieldValues = specs?.fieldValues || [];

  // --- Groups ---
  for (const g of groups) {
    const prodGroupId = g.GroupId;
    const name = g.Name;
    const qaCategoryId = idMap.get('categories', g.categoryId);
    if (!name || qaCategoryId == null) {
      stats.skipped += 1;
      continue;
    }

    const payload = {
      CategoryId: qaCategoryId,
      Name: name,
    };

    try {
      // Tenta achar grupo existente na categoria
      let existingId = idMap.get('specGroups', prodGroupId);
      if (!existingId && !dryRun) {
        try {
          const { data } = await client.get(
            `/api/catalog_system/pvt/specification/groupbycategory/${qaCategoryId}`,
          );
          const found = (Array.isArray(data) ? data : []).find(
            (x) => (x.Name || '').toLowerCase() === name.toLowerCase(),
          );
          if (found) existingId = found.GroupId ?? found.Id;
        } catch {
          // ignore
        }
      }

      if (dryRun) {
        idMap.set('specGroups', prodGroupId, existingId ?? `dry:g:${prodGroupId}`, { name, categoryId: qaCategoryId });
        existingId ? (stats.updated += 1) : (stats.created += 1);
        continue;
      }

      if (existingId) {
        idMap.set('specGroups', prodGroupId, existingId, { name, categoryId: qaCategoryId });
        stats.updated += 1;
      } else {
        const { data } = await client.post('/api/catalog/pvt/specificationgroup', payload);
        const qaId = data?.Id ?? data?.id ?? data?.GroupId;
        idMap.set('specGroups', prodGroupId, qaId, { name, categoryId: qaCategoryId });
        stats.created += 1;
      }
    } catch (err) {
      stats.failed += 1;
      reportError?.('specs', `group ${name}: ${err.message}`, { prodGroupId });
    }
  }

  // --- Fields ---
  for (const f of fields) {
    const prodFieldId = f.fieldId;
    const name = f.Name ?? f.raw?.Name;
    const qaGroupId = idMap.get('specGroups', f.groupId);
    const qaCategoryId = idMap.get('categories', f.categoryId);
    if (!name || qaGroupId == null) {
      stats.skipped += 1;
      continue;
    }

    const raw = f.raw || {};
    const payload = {
      FieldGroupId: qaGroupId,
      Name: name,
      CategoryId: qaCategoryId,
      IsActive: raw.IsActive ?? raw.isActive ?? true,
      IsStockKeepingUnit: raw.IsStockKeepingUnit ?? raw.IsSku ?? false,
      IsFilter: raw.IsFilter ?? false,
      IsRequired: raw.IsRequired ?? false,
      FieldTypeId: raw.FieldTypeId ?? raw.TypeId ?? 1,
      Description: raw.Description ?? name,
    };

    try {
      let existingId = idMap.get('specFields', prodFieldId);
      if (dryRun) {
        idMap.set('specFields', prodFieldId, existingId ?? `dry:f:${prodFieldId}`, { name });
        existingId ? (stats.updated += 1) : (stats.created += 1);
        continue;
      }

      if (existingId) {
        await client.put(`/api/catalog_system/pvt/specification/field/${existingId}`, {
          ...payload,
          FieldId: existingId,
          Id: existingId,
        });
        idMap.set('specFields', prodFieldId, existingId, { name });
        stats.updated += 1;
      } else {
        const { data } = await client.post('/api/catalog_system/pvt/specification/field', payload);
        const qaId = data?.FieldId ?? data?.Id ?? data?.id;
        idMap.set('specFields', prodFieldId, qaId, { name });
        stats.created += 1;
      }
    } catch (err) {
      stats.failed += 1;
      reportError?.('specs', `field ${name}: ${err.message}`, { prodFieldId });
    }
  }

  // --- Field values ---
  for (const fv of fieldValues) {
    const prodFvId = fv.FieldValueId;
    const name = fv.Name;
    const qaFieldId = idMap.get('specFields', fv.fieldId);
    if (!name || qaFieldId == null) {
      stats.skipped += 1;
      continue;
    }

    const raw = fv.raw || {};
    const payload = {
      FieldId: qaFieldId,
      Name: name,
      Text: raw.Text ?? name,
      IsActive: raw.IsActive ?? true,
    };

    try {
      let existingId = idMap.get('specFieldValues', prodFvId);
      if (dryRun) {
        idMap.set('specFieldValues', prodFvId, existingId ?? `dry:fv:${prodFvId}`, { name });
        existingId ? (stats.updated += 1) : (stats.created += 1);
        continue;
      }

      if (existingId) {
        await client.put(`/api/catalog_system/pvt/specification/fieldValue/${existingId}`, {
          ...payload,
          FieldValueId: existingId,
        });
        idMap.set('specFieldValues', prodFvId, existingId, { name });
        stats.updated += 1;
      } else {
        const { data } = await client.post('/api/catalog_system/pvt/specification/fieldValue', payload);
        const qaId = data?.FieldValueId ?? data?.Id ?? data?.id;
        idMap.set('specFieldValues', prodFvId, qaId, { name });
        stats.created += 1;
      }
    } catch (err) {
      stats.failed += 1;
      reportError?.('specs', `fieldValue ${name}: ${err.message}`, { prodFvId });
    }
  }

  return stats;
}
