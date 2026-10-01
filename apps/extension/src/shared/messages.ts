import * as z from 'zod/mini'

const id = z.string().check(z.regex(/^PG_SECRET_\d+$/))
const str = z.string().check(z.maxLength(512))
const strs = z.array(str).check(z.maxLength(64))

export const MsgSchema = z.discriminatedUnion('t', [
  z.object({
    t: z.literal('vault.put'),
    entries: z.array(z.tuple([id, z.string().check(z.maxLength(100_000)), str])).check(z.maxLength(1000)),
    next: z.int().check(z.minimum(1)),
  }),
  z.object({ t: z.literal('vault.get') }),
  z.object({ t: z.literal('caught'), types: strs, site: str }),
  z.object({ t: z.literal('sentOriginal'), types: strs }),
  z.object({ t: z.literal('pkg'), eco: z.enum(['npm', 'pypi']), name: str }),
  z.object({ t: z.literal('allow.has'), hashes: z.array(str).check(z.maxLength(256)) }),
  z.object({ t: z.literal('allow.add'), hash: str, type: str }),
  z.object({ t: z.literal('settings.get') }),
  z.object({ t: z.literal('adapter.status'), ok: z.boolean(), site: str }),
])

export type Msg = z.infer<typeof MsgSchema>
export type VaultEntry = { value: string; type: string }
export type VaultReply = { next: number; map: Record<string, VaultEntry> }
