import { signal } from '@preact/signals'
import { buildDiagnostic } from '../../src/shared/diagnostic'
import { AI_HOSTS } from '../../src/shared/sites'
import { parseStats, readSettings, setPaused, weekStats, type Settings } from '../../src/shared/storage'
import { t } from '../../src/shared/i18n'

type Data = { settings: Settings; adapters: Record<string, boolean>; host: string | null; week: ReturnType<typeof weekStats>; changed: boolean }

const TRUST_URL = 'https://pasteguard-landing.pages.dev/#trust-title'
const COUNT_MS = 600
const data = signal<Data | null>(null)
const shown = signal(0)
const copied = signal(false)

const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
const eligible = (host: string) => AI_HOSTS.includes(host) || (import.meta.env.DEV && host.split(':')[0] === 'localhost')

async function activeHost(): Promise<string | null> {
  try {
    const id = Number(new URLSearchParams(location.search).get('tab'))
    const tab = id > 0 ? await chrome.tabs.get(id) : (await chrome.tabs.query({ active: true, currentWindow: true }))[0]
    const host = tab?.url ? new URL(tab.url).host : ''
    return host && eligible(host) ? host : null
  } catch {
    return null
  }
}

async function load(): Promise<void> {
  const [settings, got, adapters, host] = await Promise.all([
    readSettings(),
    chrome.storage.local.get(['stats', 'popupSeen']),
    chrome.storage.session.get('adapters').then(r => (r['adapters'] ?? {}) as Record<string, boolean>, () => ({})),
    activeHost(),
  ])
  const week = weekStats(parseStats(got['stats']))
  const changed = week.total !== (typeof got['popupSeen'] === 'number' ? got['popupSeen'] : 0)
  const animate = changed && week.total > 0 && !reduced()
  data.value = { settings, adapters, host, week, changed: animate }
  if (animate) countUp(week.total)
  else shown.value = week.total
  if (changed) void chrome.storage.local.set({ popupSeen: week.total })
}

function countUp(to: number): void {
  const t0 = performance.now()
  const tick = (now: number) => {
    const k = Math.min(1, (now - t0) / COUNT_MS)
    shown.value = Math.round(to * (1 - (1 - k) ** 3))
    if (k < 1) requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}

async function toggle(d: Data): Promise<void> {
  if (!d.host) return
  const paused = !d.settings.paused.includes(d.host)
  await setPaused(d.host, paused)
  data.value = { ...d, settings: await readSettings() }
}

async function copyDiagnostic(d: Data): Promise<void> {
  const ua = /Chrome\/([\d.]+)/.exec(navigator.userAgent)?.[1] ?? 'unknown'
  const text = buildDiagnostic({ version: chrome.runtime.getManifest().version, chrome: ua, hosts: AI_HOSTS, settings: d.settings, adapters: d.adapters })
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => (copied.value = false), 1500)
  } catch {
    // clipboard blocked: nothing to do
  }
}

const dayLetters = (() => {
  const f = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' })
  return Array.from({ length: 7 }, (_, i) => f.format(new Date(2024, 0, 1 + i)))
})()

const Shield = () => (
  <svg viewBox="0 0 32 32" aria-hidden="true">
    <path d="M16 2 4 7v8c0 7.5 5.1 13.4 12 15 6.9-1.6 12-7.5 12-15V7L16 2Z" fill="#F2E15B" />
    <rect x="9" y="12" width="14" height="4" rx="1" fill="#120D24" />
  </svg>
)

const siteState = (d: Data, h: string) => (d.settings.paused.includes(h) ? 'paused' : d.adapters[h] === false ? 'limited' : 'on')

function Body({ d }: { d: Data }) {
  const { week, host } = d
  const paused = !!host && d.settings.paused.includes(host)
  const max = Math.max(1, ...week.bars)
  const label = host ? (paused ? t('popupPausedHere') : t('popupOn')) : t('popupNotAi')
  const limited = !!host && !paused && d.adapters[host] === false
  return (
    <>
      <header class="head">
        <Shield />
        <h1>{t('name')}</h1>
        <label class="status" for="site-switch">{label}</label>
        <button
          id="site-switch"
          class="switch"
          type="button"
          role="switch"
          aria-checked={host ? !paused : false}
          aria-describedby={host ? undefined : 'why'}
          disabled={!host}
          onClick={() => void toggle(d)}
        />
      </header>
      {!host && <p id="why" class="note">{t('popupNotAiWhy')}</p>}
      {limited && <p class="note warn">{t('popupLimited')}</p>}
      <section class="hero">
        {week.total === 0 ? (
          <p class="quiet">{t('popupQuiet')}</p>
        ) : (
          <>
            <div class="count" aria-hidden="true">{shown.value}</div>
            <p><span class="sr">{week.total} </span>{t(week.total === 1 ? 'popupCountOne' : 'popupCountMany')}</p>
          </>
        )}
      </section>
      <div class={d.changed ? 'bars go' : 'bars'} role="img" aria-label={t('popupChartLabel') + ': ' + week.bars.join(', ')}>
        {week.bars.map((n, i) => (
          <span key={i} class={i === week.today ? 'today' : ''} style={{ '--h': n ? `${Math.max(12, (n / max) * 100)}%` : '3px', '--i': i }} />
        ))}
      </div>
      <div class="days" aria-hidden="true">{dayLetters.map((l, i) => <span key={i}>{l}</span>)}</div>
      <ul class="sites">
        {AI_HOSTS.map(h => {
          const s = siteState(d, h)
          return (
            <li key={h} class={`site ${s}`}>
              <span class="dot" aria-hidden="true">{h[0]?.toUpperCase()}</span>
              <span class="host">{h}</span>
              <span class="state">{s === 'on' ? t('popupSiteOn') : s === 'paused' ? t('popupSitePaused') : t('popupLimited')}</span>
            </li>
          )
        })}
      </ul>
      <footer class="foot">
        <span>{t('popupFoot')}</span>
        <a href={TRUST_URL} target="_blank" rel="noreferrer">{t('popupSee')}</a>
        <button type="button" class="link" onClick={() => void copyDiagnostic(d)}>{copied.value ? t('popupDiagDone') : t('popupDiag')}</button>
      </footer>
    </>
  )
}

void load()

export function Popup() {
  const d = data.value
  return (
    <main class="popup">
      {d ? (
        <Body d={d} />
      ) : (
        <header class="head">
          <Shield />
          <h1>{t('name')}</h1>
        </header>
      )}
    </main>
  )
}
