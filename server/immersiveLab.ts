import path from 'node:path';
import { z } from 'zod';
import type { Env } from './env.js';
import { JsonStore, type TokenCache } from './snapshotStore.js';

const AccountListItemSchema = z.object({
  uuid: z.string(),
  email: z.string().nullable().optional(),
  externalId: z.string().nullable().optional(),
  points: z.number().nullable().optional(),
});
export type AccountListItem = z.infer<typeof AccountListItemSchema>;

export const AccountDetailedSchema = z.object({
  uuid: z.string(),
  displayName: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  externalId: z.string().nullable().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  lastActivityAt: z.string().nullable().optional(),
  points: z.number().nullable().optional(),
  status: z.string().nullable().optional(),
  timeZone: z.string().nullable().optional(),
});
export type AccountDetailed = z.infer<typeof AccountDetailedSchema>;

export type Account = {
  uuid: string;
  displayName: string;
  points: number | null;
  lastActivityAt: string | null;
};

const PaginationMetadataSchema = z.object({
  hasNextPage: z.boolean().optional(),
  hasPreviousPage: z.boolean().optional(),
  nextPageToken: z.string().nullable().optional(),
  previousPageToken: z.string().nullable().optional(),
});

const AccountsPageSchema = z.object({
  page: z.array(AccountListItemSchema),
  meta: PaginationMetadataSchema.optional(),
});

const TokenResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number(),
});

export type ImmersiveLabDeps = {
  env: Env;
  fetchImpl?: typeof fetch;
  now?: () => number;
};

export class ImmersiveLabClient {
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private readonly env: Env;
  private readonly tokenStore: JsonStore<TokenCache>;
  private tokenCache: TokenCache | null = null;

  constructor(deps: ImmersiveLabDeps) {
    this.env = deps.env;
    this.fetchImpl = deps.fetchImpl ?? fetch;
    this.now = deps.now ?? (() => Date.now());
    this.tokenStore = new JsonStore<TokenCache>(path.join(this.env.DATA_DIR, 'token.json'));
  }

  async init(): Promise<void> {
    this.tokenCache = await this.tokenStore.load();
  }

  async getToken(): Promise<string> {
    const marginMs = this.env.TOKEN_REFRESH_MARGIN_S * 1000;
    if (this.tokenCache && this.now() < this.tokenCache.expiresAt - marginMs) {
      return this.tokenCache.accessToken;
    }
    return this.refreshToken();
  }

  private async refreshToken(): Promise<string> {
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
      throw new Error(`Token exchange failed: ${res.status} ${res.statusText} — body: ${text.slice(0, 500)}`);
    }
    const json = TokenResponseSchema.parse(await res.json());
    const cache: TokenCache = {
      accessToken: json.accessToken,
      expiresAt: this.now() + json.expiresIn * 1000,
    };
    this.tokenCache = cache;
    await this.tokenStore.save(cache);
    return cache.accessToken;
  }

  private async invalidateToken(): Promise<void> {
    this.tokenCache = null;
  }

  async fetchJson<T>(pathname: string, schema: z.ZodType<T>): Promise<T> {
    const url = `${this.env.IMMERSIVELAB_BASE_URL}${pathname}`;
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await this.getToken();
      const res = await this.fetchImpl(url, {
        headers: { authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(10_000),
      });
      if (res.status === 401 && attempt === 0) {
        await this.invalidateToken();
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
  for await (const item of this.walkAccountList()) {
    const detail = await this.getAccountDetailed(item.uuid);
    if (detail.email && detail.email.includes('@immersivelabs.pro')) {
      yield {
        uuid: detail.uuid,
        displayName: detail.displayName ?? buildFallbackName(detail) ?? item.uuid,
        points: detail.points ?? item.points ?? null,
        lastActivityAt: detail.lastActivityAt ?? null,
      };
    }
  }
}

function buildFallbackName(a: AccountDetailed): string | null {
  const parts = [a.firstName, a.lastName].filter((x): x is string => typeof x === 'string' && x.length > 0);
  if (parts.length > 0) return parts.join(' ');
  if (a.email) return a.email;
  if (a.externalId) return a.externalId;
  return null;
}
