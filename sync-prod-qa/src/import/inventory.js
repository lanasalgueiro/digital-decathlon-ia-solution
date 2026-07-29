/**
 * Upsert inventory: PUT /api/logistics/pvt/inventory/skus/{skuId}/warehouses/{warehouseId}
 * Warehouses must already exist in QA. Map via WAREHOUSE_MAP or idMap.warehouses / name match.
 */
export async function importInventory(client, inventoryPayload, idMap, config, { dryRun = false, reportError } = {}) {
  const stats = { created: 0, updated: 0, skipped: 0, failed: 0 };
  const inventory = inventoryPayload?.inventory || [];
  const prodWarehouses = Array.isArray(inventoryPayload?.warehouses) ? inventoryPayload.warehouses : [];

  // Load QA warehouses
  let qaWarehouses = [];
  try {
    const { data } = await client.get('/api/logistics/pvt/configuration/warehouses');
    qaWarehouses = Array.isArray(data) ? data : data?.items || [];
  } catch (err) {
    reportError?.('inventory', `Não foi possível listar warehouses QA: ${err.message}`);
  }

  const qaById = new Map(qaWarehouses.map((w) => [String(w.id ?? w.Id), w]));
  const qaByName = new Map(
    qaWarehouses.map((w) => [(w.name ?? w.Name ?? '').trim().toLowerCase(), w]),
  );

  // Build warehouse map prod → qa
  for (const w of prodWarehouses) {
    const prodWid = String(w.id ?? w.Id ?? '');
    const name = (w.name ?? w.Name ?? '').trim().toLowerCase();
    if (config.warehouseMap[prodWid]) {
      idMap.set('warehouses', prodWid, config.warehouseMap[prodWid], { name });
      continue;
    }
    const byName = name ? qaByName.get(name) : null;
    if (byName) {
      idMap.set('warehouses', prodWid, byName.id ?? byName.Id, { name });
    }
  }

  // Also apply explicit env map
  for (const [from, to] of Object.entries(config.warehouseMap || {})) {
    idMap.set('warehouses', from, to);
  }

  for (const entry of inventory) {
    const prodSkuId = entry.skuId;
    const qaSkuId = idMap.get('skus', prodSkuId);
    if (!qaSkuId || String(qaSkuId).startsWith('dry:')) {
      stats.failed += 1;
      reportError?.('inventory', 'SKU QA não mapeado', { prodSkuId });
      continue;
    }

    const balances = Array.isArray(entry.balance) ? entry.balance : [];
    for (const bal of balances) {
      const prodWid = String(bal.warehouseId ?? bal.WarehouseId ?? '');
      let qaWid = idMap.get('warehouses', prodWid);

      if (!qaWid && bal.warehouseName) {
        const found = qaByName.get(String(bal.warehouseName).trim().toLowerCase());
        if (found) qaWid = found.id ?? found.Id;
      }

      if (!qaWid) {
        stats.failed += 1;
        reportError?.(
          'inventory',
          `Warehouse QA inexistente para prod warehouse ${prodWid}. Crie no Admin de Logística ou defina WAREHOUSE_MAP.`,
          { prodSkuId, prodWid },
        );
        continue;
      }

      if (!qaById.has(String(qaWid)) && qaWarehouses.length) {
        stats.failed += 1;
        reportError?.('inventory', `Warehouse QA ${qaWid} não encontrado na conta`, {
          prodSkuId,
          qaWid,
        });
        continue;
      }

      const quantity = bal.totalQuantity ?? bal.TotalQuantity ?? bal.quantity ?? bal.Quantity ?? 0;
      const payload = {
        unlimitedQuantity: bal.unlimitedQuantity ?? bal.hasUnlimitedQuantity ?? false,
        quantity: Number(quantity) || 0,
        timeToRefill: bal.timeToRefill ?? null,
        dateUtcOnBalanceSystem: null,
      };

      try {
        if (dryRun) {
          stats.updated += 1;
          continue;
        }
        await client.put(
          `/api/logistics/pvt/inventory/skus/${qaSkuId}/warehouses/${qaWid}`,
          payload,
        );
        stats.updated += 1;
      } catch (err) {
        stats.failed += 1;
        reportError?.('inventory', err.message, { prodSkuId, qaSkuId, qaWid });
      }
    }
  }

  return stats;
}
