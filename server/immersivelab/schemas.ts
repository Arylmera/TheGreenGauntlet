import { z } from 'zod';

export const AccountListItemSchema = z.object({
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

const PaginationMetadataSchema = z.object({
  hasNextPage: z.boolean().optional(),
  hasPreviousPage: z.boolean().optional(),
  nextPageToken: z.string().nullable().optional(),
  previousPageToken: z.string().nullable().optional(),
});

export const AccountsPageSchema = z.object({
  page: z.array(AccountListItemSchema),
  meta: PaginationMetadataSchema.optional(),
});

export const TokenResponseSchema = z.object({
  accessToken: z.string(),
  expiresIn: z.number(),
});

export type TokenCache = { accessToken: string; expiresAt: number };

export type Account = {
  uuid: string;
  displayName: string;
  points: number | null;
  lastActivityAt: string | null;
};
