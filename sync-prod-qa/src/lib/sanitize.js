/**
 * Remove / reescreve campos que não devem ir de Prod para QA.
 */

const SENSITIVE_KEYS = new Set([
  'appKey',
  'appToken',
  'AppKey',
  'AppToken',
  'password',
  'Password',
  'clientSecret',
  'ClientSecret',
]);

function rewriteUrl(value, prodAccount, qaAccount) {
  if (typeof value !== 'string') return value;
  let out = value;
  if (prodAccount) {
    out = out.replaceAll(`${prodAccount}.vtexcommercestable.com.br`, `${qaAccount}.vtexcommercestable.com.br`);
    out = out.replaceAll(`${prodAccount}.vtexassets.com`, `${qaAccount}.vtexassets.com`);
    out = out.replaceAll(`api.vtex.com/${prodAccount}`, `api.vtex.com/${qaAccount}`);
  }
  return out;
}

function walk(value, prodAccount, qaAccount) {
  if (Array.isArray(value)) {
    return value.map((v) => walk(v, prodAccount, qaAccount));
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (SENSITIVE_KEYS.has(k)) continue;
      out[k] = walk(v, prodAccount, qaAccount);
    }
    return out;
  }
  if (typeof value === 'string') return rewriteUrl(value, prodAccount, qaAccount);
  return value;
}

export function sanitizeSnapshot(snapshot, { prodAccount, qaAccount }) {
  return walk(structuredClone(snapshot), prodAccount, qaAccount);
}

export function stripIdsForCreate(entity, keep = []) {
  const copy = { ...entity };
  const drop = new Set(['Id', 'id', 'ProductId', 'SkuId', 'SKUId', ...Object.keys(copy).filter((k) => k.endsWith('Id') && !keep.includes(k))]);
  // Mantém refs explícitas pedidas
  for (const k of keep) drop.delete(k);
  for (const k of drop) {
    if (k === 'RefId' || k === 'CategoryId' || k === 'BrandId' || k === 'ProductId') continue;
    if (!keep.includes(k)) {
      // só remove Id puro na criação; CategoryId/BrandId são traduzidos antes
    }
  }
  delete copy.Id;
  delete copy.id;
  return copy;
}
