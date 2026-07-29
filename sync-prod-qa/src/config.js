import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

function parseWarehouseMap(raw) {
  if (!raw) return {};
  return Object.fromEntries(
    raw.split(',').map((pair) => {
      const [from, to] = pair.split(':').map((s) => s.trim());
      if (!from || !to) {
        throw new Error(`WAREHOUSE_MAP inválido: "${pair}". Use prodId:qaId`);
      }
      return [from, to];
    }),
  );
}

export const ALL_ENTITIES = [
  'brands',
  'categories',
  'specs',
  'products',
  'skus',
  'prices',
  'inventory',
];

export function loadConfig({ requireProd = false, requireQa = false } = {}) {
  const prodAccount = process.env.PROD_ACCOUNT || 'decathlonstore';
  const qaAccount = process.env.QA_ACCOUNT || 'decathlonproqa';

  const config = {
    rootDir,
    dataDir: path.join(rootDir, 'data'),
    snapshotsDir: path.join(rootDir, 'data', 'snapshots'),
    idMapPath: path.join(rootDir, 'data', 'id-map.json'),
    concurrency: Number(process.env.CONCURRENCY || 2),
    timeoutMs: Number(process.env.REQUEST_TIMEOUT_MS || 30000),
    maxRetries: Number(process.env.MAX_RETRIES || 5),
    categoryTreeLevels: Number(process.env.CATEGORY_TREE_LEVELS || 10),
    maxProducts: Number(process.env.MAX_PRODUCTS || 5000),
    salesChannel: Number(process.env.SALES_CHANNEL || 1),
    stockQuantity: Number(process.env.STOCK_QUANTITY || 100),
    qaWarehouseId: process.env.QA_WAREHOUSE_ID || null,
    warehouseMap: parseWarehouseMap(process.env.WAREHOUSE_MAP),
    prod: {
      account: prodAccount,
      appKey: process.env.PROD_APPKEY || '',
      appToken: process.env.PROD_APPTOKEN || '',
      commerceBase: `https://${prodAccount}.vtexcommercestable.com.br`,
      pricingBase: `https://api.vtex.com/${prodAccount}`,
    },
    qa: {
      account: qaAccount,
      appKey: process.env.QA_APPKEY || '',
      appToken: process.env.QA_APPTOKEN || '',
      commerceBase: `https://${qaAccount}.vtexcommercestable.com.br`,
      pricingBase: `https://api.vtex.com/${qaAccount}`,
    },
  };

  if (requireProd) {
    config.prod.appKey = required('PROD_APPKEY');
    config.prod.appToken = required('PROD_APPTOKEN');
  }
  if (requireQa) {
    config.qa.appKey = required('QA_APPKEY');
    config.qa.appToken = required('QA_APPTOKEN');
  }

  return config;
}
