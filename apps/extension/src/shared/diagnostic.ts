import type { Settings } from './storage.ts'

export type DiagInput = { version: string; chrome: string; hosts: string[]; settings: Settings; adapters: Record<string, boolean> }

// Hostnames and counts only: no allow list, no rule patterns, no content.
export function buildDiagnostic({ version, chrome, hosts, settings, adapters }: DiagInput): string {
  const state = (h: string) => (settings.paused.includes(h) ? 'paused' : adapters[h] === false ? 'limited' : 'on')
  return [
    'PasteGuard diagnostic',
    `version: ${version}`,
    `chrome: ${chrome}`,
    `sites: ${hosts.map(h => `${h}=${state(h)}`).join(' ')}`,
    `settings: ${JSON.stringify({ pii: settings.pii, paused: settings.paused, rules: settings.rules.length })}`,
  ].join('\n')
}
