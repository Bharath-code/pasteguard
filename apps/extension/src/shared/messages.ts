import * as z from 'zod/mini'

export const MAX_ENTRIES_PER_MESSAGE = 1000
export const MAX_VALUE_CHARS = 2_000_000
export const MAX_VAULT_CHARS = 8_000_000

const id = z.string().check(z.regex(/^PG_SECRET_\d+$/))
const str = z.string().check(z.maxLength(512))
const strs = z.array(str).check(z.maxLength(64))

export const VaultEntrySchema = z.tuple([id, z.string().check(z.maxLength(MAX_VALUE_CHARS)), str])

export const MsgSchema = z.discriminatedUnion('t', [
  z.object({
    t: z.literal('vault.put'),
    entries: z.array(z.unknown()).check(z.maxLength(MAX_ENTRIES_PER_MESSAGE)),
    next: z.int().check(z.minimum(1)),
  }),
  z.object({ t: z.literal('vault.get') }),
  z.object({ t: z.literal('caught'), types: strs, site: str }),
  z.object({ t: z.literal('sentOriginal'), types: strs }),
  z.object({ t: z.literal('pkg'), eco: z.enum(['npm', 'pypi']), name: str }),
  z.object({ t: z.literal('allow.has'), hashes: z.array(str).check(z.maxLength(256)) }),
  z.object({ t: z.literal('allow.add'), hash: str, type: str }),
  z.object({ t: z.literal('scan.once'), id: z.string().check(z.regex(/^[0-9a-f]{64}$/)) }),
  z.object({ t: z.literal('settings.get') }),
  z.object({ t: z.literal('adapter.status'), ok: z.boolean(), site: str }),
])

export type Msg = z.infer<typeof MsgSchema>
export type VaultEntry = { value: string; type: string }
export type VaultReply = { next: number; map: Record<string, VaultEntry> }
export type VaultPutReply = { ok: boolean; dropped: number }
