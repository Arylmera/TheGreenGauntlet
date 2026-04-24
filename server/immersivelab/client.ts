import { z } from 'zod';
import type { Env } from '../env.js';
import {
  AccountDetailedSchema,
  AccountsPageSchema,
  type Account,
  type AccountDetailed,
  type AccountListItem,
} from './schemas.js';
import { TokenManager } from './tokenManager.js';

export type ImmersiveLabDeps = {
  env: Env;
  fetchImpl?: typeof fetch;
  now?: () => number;
};

export class ImmersiveLabClient {
  private readonly env: Env;
  private readonly fetchImpl: typeof fetch;
  private readonly tokens: TokenManager;

  constructor(deps: ImmersiveLabDeps) {
    this.env = deps.env;
    this.fetchImpl = deps.fetchImpl ?? fetch;
    this.tokens = new TokenManager(deps);
  }

  async init(): Promise<void> {
    await this.tokens.init();
  }

  async getToken(): Promise<string> {
    return this.tokens.getToken();
  }

  async fetchJson<T>(pathname: string, schema: z.ZodType<T>): Promise<T> {
    const url = `${this.env.IMMERSIVELAB_BASE_URL}${pathname}`;
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await this.tokens.getToken();
      const res = await this.fetchImpl(url, {
        headers: { authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (res.status === 401 && attempt === 0) {
        this.tokens.invalidate();
        continue;
      }
      if (!res.ok) {
        throw new Error(`ImmersiveLab ${pathname} → ${res.status}`);
      }
      return schema.parse(await res.json());
    }
    throw new Error(`ImmersiveLab ${pathname} failed after retry`);
  }

  async *walkAccountList(): AsyncIterable<AccountListItem> {
    let pageToken: string | null = null;
    do {
      const qs: string = pageToken ? `?page_token=${encodeURIComponent(pageToken)}` : '';
      const page = await this.fetchJson(`/v2/accounts${qs}`, AccountsPageSchema);
      for (const account of page.page) yield account;
      const meta = page.meta;
      pageToken = meta?.hasNextPage ? (meta.nextPageToken ?? null) : null;
    } while (pageToken);
  }

  async getAccountDetailed(uuid: string): Promise<AccountDetailed> {
    return this.fetchJson(`/v2/accounts/${encodeURIComponent(uuid)}`, AccountDetailedSchema);
  }

  async *walkAccounts(): AsyncIterable<Account> {
    const items: AccountListItem[] = [];
    for await (const item of this.walkAccountList()) items.push(item);

    const CONCURRENCY = 8;
    for (let i = 0; i < items.length; i += CONCURRENCY) {
      const chunk = items.slice(i, i + CONCURRENCY);
      const details = await Promise.all(
        chunk.map((it) =>
          this.getAccountDetailed(it.uuid).then((detail) => ({ item: it, detail })),
        ),
      );
      for (const { item, detail } of details) {
        if (!detail.email || !detail.email.includes('@immersivelabs.pro')) continue;
        yield {
          uuid: detail.uuid,
          displayName: detail.displayName ?? buildFallbackName(detail) ?? item.uuid,
          points: detail.points ?? item.points ?? null,
          lastActivityAt: detail.lastActivityAt ?? null,
        };
      }
    }
  }
}

function buildFallbackName(a: AccountDetailed): string | null {
  const parts = [a.firstName, a.lastName].filter(
    (x): x is string => typeof x === 'string' && x.length > 0,
  );
  if (parts.length > 0) return parts.join(' ');
  if (a.email) return a.email;
  if (a.externalId) return a.externalId;
  return null;
}
