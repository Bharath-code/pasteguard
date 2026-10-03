import { signal } from '@preact/signals'
import { useEffect, useRef } from 'preact/hooks'
import { makeAdapter } from '../../adapters/base'
import { t } from '../../src/shared/i18n'
import { installGuard } from '../chat.content/guard'

// Built by concatenation so the repo never contains a literal live-key shape.
const FAKE_KEY = 'STRIPE_SECRET_KEY=' + 'sk_' + 'live_PASTEGUARDDEMO00'

const copied = signal(false)
const taped = signal(false)
const pinned = signal(false)
const status = signal('')

const adapter = makeAdapter({ id: 'generic', composer: '#practice', answers: '', userTurns: '', conversation: /(?!)/, streaming: '', send: '' })

// Same guard as the AI pages. Content scripts don't run on extension pages, so it is wired up here with an in-memory vault and nothing sent to the service worker: the demo paste is never counted as a real catch.
function installDemoGuard(): void {
  installGuard({
    adapter,
    vault: { state: { next: 1, ids: new Map() }, put: () => undefined, hydrate: async () => true },
    settings: () => ({ paused: [], pii: false, rules: [] }),
    send: async m => (m.t === 'allow.has' ? m.hashes.map(() => false) : undefined),
    ui: {
      taped: () => {
        taped.value = true
        status.value = t('welcomeTaped')
      },
      fallback: () => {
        status.value = t('welcomeFailed')
      },
    },
  })
}

async function copyKey(box: HTMLTextAreaElement | null): Promise<void> {
  try {
    await navigator.clipboard.writeText(FAKE_KEY)
  } catch {
    status.value = t('welcomeFailed')
    return
  }
  copied.value = true
  box?.focus()
}

const Check = ({ done, children }: { done: boolean; children: string }) => (
  <li class={done ? 'done' : ''}>
    <svg viewBox="0 0 22 22" aria-hidden="true">
      <circle class="ck-bg" cx="11" cy="11" r="10" />
      <path class="ck" d="M6.5 11.5l3 3 6-6.5" />
    </svg>
    <span>{children}</span>
    {done && <span class="sr">✓</span>}
  </li>
)

export function Welcome() {
  const box = useRef<HTMLTextAreaElement>(null)
  useEffect(installDemoGuard, [])
  return (
    <main class="welcome">
      <h1>{t('welcomeTitle')}</h1>
      <ol class="checks">
        <Check done={copied.value}>{t('welcomeStepCopy')}</Check>
        <Check done={taped.value}>{t('welcomeStepPaste')}</Check>
        <Check done={pinned.value}>{t('welcomeStepPin')}</Check>
      </ol>
      <div class="fake-key">
        <code>{FAKE_KEY}</code>
        <button class="btn" type="button" onClick={() => void copyKey(box.current)}>
          {copied.value ? t('welcomeCopied') : t('welcomeCopy')}
        </button>
      </div>
      <textarea id="practice" ref={box} class="try" aria-label={t('welcomePasteLabel')} placeholder={t('welcomePastePlaceholder')} spellcheck={false} />
      <p class="status" role="status">{status.value}</p>
      <p class="hint">{t('welcomePinHint')}</p>
      <button class="btn btn-quiet" type="button" onClick={() => (pinned.value = true)}>{t('welcomePinned')}</button>
    </main>
  )
}
