/** Export brands from Prod. */
export async function exportBrands(client) {
  const { data } = await client.get('/api/catalog_system/pvt/brand/list');
  const list = Array.isArray(data) ? data : data?.items || data?.data || [];
  return list;
}
