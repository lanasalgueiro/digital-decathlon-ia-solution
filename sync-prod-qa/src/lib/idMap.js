import fs from 'node:fs/promises';
import path from 'node:path';

const EMPTY = () => ({
  brands: {},
  categories: {},
  specGroups: {},
  specFields: {},
  specFieldValues: {},
  products: {},
  skus: {},
  warehouses: {},
});

export class IdMap {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = EMPTY();
  }

  static async load(filePath) {
    const map = new IdMap(filePath);
    try {
      const raw = await fs.readFile(filePath, 'utf8');
      map.data = { ...EMPTY(), ...JSON.parse(raw) };
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    return map;
  }

  set(entity, prodId, qaId, meta = {}) {
    if (!this.data[entity]) this.data[entity] = {};
    this.data[entity][String(prodId)] = { qaId, ...meta, updatedAt: new Date().toISOString() };
  }

  get(entity, prodId) {
    return this.data[entity]?.[String(prodId)]?.qaId ?? null;
  }

  getEntry(entity, prodId) {
    return this.data[entity]?.[String(prodId)] ?? null;
  }

  findByMeta(entity, key, value) {
    const entries = this.data[entity] || {};
    for (const [prodId, entry] of Object.entries(entries)) {
      if (entry[key] === value) return { prodId, ...entry };
    }
    return null;
  }

  async save() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
  }
}
