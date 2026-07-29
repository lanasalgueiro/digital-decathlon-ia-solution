import { flattenCategoryTree } from '../lib/order.js';

/** Export category tree and flatten it. */
export async function exportCategories(client, levels = 10) {
  const { data: tree } = await client.get(`/api/catalog_system/pub/category/tree/${levels}`);
  const flat = flattenCategoryTree(Array.isArray(tree) ? tree : []);
  return { tree, flat };
}
