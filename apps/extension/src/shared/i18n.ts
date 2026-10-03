export function t(key: string, subs?: string[]): string {
  const msg = (browser.i18n as { getMessage(key: string, subs?: string[]): string }).getMessage(key, subs)
  if (!msg && import.meta.env.DEV) throw new Error(`Missing i18n key: ${key}`)
  return msg
}
