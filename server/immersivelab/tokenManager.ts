import path from 'node:path';
import type { Env } from '../env.js';
import { JsonStore } from '../snapshotStore.js';
import { TokenResponseSchema, type TokenCache } from './schemas.js';

export type TokenManagerDeps = {
  env: Env;
  fetchImpl?: typeof fetch;
  now?: () => number;
};

export class TokenManager {
  private readonly env: Env;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private readonly store: JsonStore<TokenCache>;
  private cache: TokenCache | null = null;

  constructor(deps: TokenManagerDeps) {
    this.env = deps.env;
    this.fetchImpl = deps.fetchImpl ?? fetch;
    this.now = deps.now ?? (() => Date.now());
    this.store = new JsonStore<TokenCache>(path.join(this.env.DATA_DIR, 'token.json'));
  }

  async init(): Promise<void> {
    this.cache = await this.store.load();
  }

  async getToken(): Promise<string> {
    const marginMs = this.env.TOKEN_REFRESH_MARGIN_S * 1000;
    if (this.cache && this.now() < this.cache.expiresAt - marginMs) {
      return this.cache.accessToken;
    }
    return this.refresh();
  }

  invalidate(): void {
    this.cache = null;
  }

  private async refresh(): Promise<string> {
    const res = await this.fetchImpl(`${this.env.IMMERSIVELAB_BASE_URL}/v1/public/tokens`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: this.env.IMMERSIVELAB_ACCESS_KEY,
        password: this.env.IMMERSIVELAB_SECRET_TOKEN,
      }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(
        `Token exchange failed: ${res.status} ${res.statusText} — body: ${text.slice(0, 500)}`,
      );
    }
    const json = TokenResponseSchema.parse(await res.json());
    const cache: TokenCache = {
      accessToken: json.accessToken,
      expiresAt: this.now() + json.expiresIn * 1000,
    };
    this.cache = cache;
    await this.store.save(cache);
    return cache.accessToken;
  }
}
