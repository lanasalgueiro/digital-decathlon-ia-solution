/**
 * Cliente HTTP VTEX com AppKey/AppToken, concurrency limitada e retry/backoff.
 */

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class VtexClient {
  constructor({ account, appKey, appToken, commerceBase, pricingBase, concurrency = 2, timeoutMs = 30000, maxRetries = 5 }) {
    this.account = account;
    this.appKey = appKey;
    this.appToken = appToken;
    this.commerceBase = commerceBase.replace(/\/$/, '');
    this.pricingBase = pricingBase.replace(/\/$/, '');
    this.concurrency = Math.max(1, concurrency);
    this.timeoutMs = timeoutMs;
    this.maxRetries = maxRetries;
    this._active = 0;
    this._queue = [];
  }

  _headers(extra = {}) {
    return {
      'X-VTEX-API-AppKey': this.appKey,
      'X-VTEX-API-AppToken': this.appToken,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...extra,
    };
  }

  async _acquire() {
    if (this._active < this.concurrency) {
      this._active += 1;
      return;
    }
    await new Promise((resolve) => this._queue.push(resolve));
    this._active += 1;
  }

  _release() {
    this._active -= 1;
    const next = this._queue.shift();
    if (next) next();
  }

  async request(base, method, path, { body, headers, query } = {}) {
    const url = new URL(path.startsWith('http') ? path : `${base}${path}`);
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
      }
    }

    let lastError;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      await this._acquire();
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        const res = await fetch(url, {
          method,
          headers: this._headers(headers),
          body: body !== undefined ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        });
        clearTimeout(timer);

        const text = await res.text();
        let data = null;
        if (text) {
          try {
            data = JSON.parse(text);
          } catch {
            data = text;
          }
        }

        if (res.status === 429 || res.status >= 500) {
          const retryAfter = Number(res.headers.get('retry-after')) || 0;
          const backoff = retryAfter * 1000 || Math.min(30000, 500 * 2 ** attempt);
          lastError = new Error(`HTTP ${res.status} ${method} ${url.pathname}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
          if (attempt < this.maxRetries) {
            await sleep(backoff);
            continue;
          }
          throw lastError;
        }

        if (!res.ok) {
          const err = new Error(`HTTP ${res.status} ${method} ${url.pathname}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
          err.status = res.status;
          err.data = data;
          throw err;
        }

        return { status: res.status, data, headers: res.headers };
      } catch (err) {
        lastError = err;
        if (err.name === 'AbortError') {
          err.message = `Timeout após ${this.timeoutMs}ms: ${method} ${url.pathname}`;
        }
        const retryable = err.name === 'AbortError' || err.code === 'ECONNRESET' || err.message?.includes('fetch failed');
        if (retryable && attempt < this.maxRetries) {
          await sleep(Math.min(30000, 500 * 2 ** attempt));
          continue;
        }
        throw err;
      } finally {
        this._release();
      }
    }
    throw lastError;
  }

  get(path, opts) {
    return this.request(this.commerceBase, 'GET', path, opts);
  }

  post(path, body, opts) {
    return this.request(this.commerceBase, 'POST', path, { ...opts, body });
  }

  put(path, body, opts) {
    return this.request(this.commerceBase, 'PUT', path, { ...opts, body });
  }

  pricingGet(path, opts) {
    return this.request(this.pricingBase, 'GET', path, opts);
  }

  pricingPut(path, body, opts) {
    return this.request(this.pricingBase, 'PUT', path, { ...opts, body });
  }
}

export function createProdClient(config) {
  return new VtexClient({ ...config.prod, concurrency: config.concurrency, timeoutMs: config.timeoutMs, maxRetries: config.maxRetries });
}

export function createQaClient(config) {
  return new VtexClient({ ...config.qa, concurrency: config.concurrency, timeoutMs: config.timeoutMs, maxRetries: config.maxRetries });
}
