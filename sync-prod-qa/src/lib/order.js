/**
 * Achata árvore de categorias e ordena pais antes dos filhos.
 */

export function flattenCategoryTree(tree, parentId = null, acc = []) {
  for (const node of tree || []) {
    const id = node.id ?? node.Id;
    const children = node.children ?? node.Children ?? [];
    acc.push({
      id,
      name: node.name ?? node.Name,
      fatherCategoryId: parentId ?? node.fatherCategoryId ?? node.FatherCategoryId ?? null,
      title: node.title ?? node.Title ?? node.name ?? node.Name,
      description: node.description ?? node.Description ?? '',
      keywords: node.keywords ?? node.Keywords ?? null,
      isActive: node.isActive ?? node.IsActive ?? true,
      showInMenu: node.showInMenu ?? node.ShowInMenu ?? true,
      metaTagDescription: node.metaTagDescription ?? node.MetaTagDescription ?? '',
      score: node.score ?? node.Score ?? 0,
      globalCategoryId: node.globalCategoryId ?? node.GlobalCategoryId ?? null,
      raw: node,
    });
    if (children?.length) flattenCategoryTree(children, id, acc);
  }
  return acc;
}

/** Ordem topológica: raiz → folhas (pai antes do filho). */
export function orderCategoriesParentsFirst(categories) {
  const byId = new Map(categories.map((c) => [String(c.id), c]));
  const visited = new Set();
  const result = [];

  function visit(id) {
    const key = String(id);
    if (visited.has(key)) return;
    const cat = byId.get(key);
    if (!cat) return;
    visited.add(key);
    if (cat.fatherCategoryId != null && cat.fatherCategoryId !== 0) {
      visit(cat.fatherCategoryId);
    }
    result.push(cat);
  }

  for (const cat of categories) visit(cat.id);
  return result;
}
