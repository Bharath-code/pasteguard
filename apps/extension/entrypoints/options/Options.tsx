import { signal } from '@preact/signals'
import { t } from '../../src/shared/i18n'
import { DEFAULT_SETTINGS, readSettings, updateSettings, type Settings } from '../../src/shared/storage'
import { RuleTester, runTest } from './RuleTester'

const settings = signal<Settings>(structuredClone(DEFAULT_SETTINGS))
const name = signal(t('optionsRuleNameDefault'))
const pattern = signal('')
const sample = signal(t('optionsSampleDefault'))
const added = signal(false)

const fmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })

async function load(): Promise<void> {
  settings.value = await readSettings()
}

void load()
try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes['settings']) void load()
  })
} catch {
  // no storage events outside the extension: the page still works from the initial read
}

async function addRule(source: string): Promise<void> {
  const type = name.value.trim().slice(0, 40) || t('optionsRuleNameDefault')
  await updateSettings(s => ({ ...s, rules: [...s.rules, { type, source }] }))
  pattern.value = ''
  added.value = true
}

const edit = (fn: (v: string) => void) => (v: string) => {
  added.value = false
  fn(v)
}

export function Options() {
  const s = settings.value
  const tested = runTest(pattern.value, sample.value)
  return (
    <main class="options">
      <h1>{t('optionsTitle')}</h1>

      <section aria-labelledby="h-rules">
        <h2 id="h-rules">{t('optionsRulesTitle')}</h2>
        <p class="help">{t('optionsRulesHelp')}</p>
        <div class="rules">
          <label for="rule-name">{t('optionsRuleName')}</label>
          <input id="rule-name" value={name.value} maxLength={40} onInput={e => (name.value = e.currentTarget.value)} />
          <RuleTester pattern={pattern.value} sample={sample.value} tested={tested} onPattern={edit(v => (pattern.value = v))} onSample={v => (sample.value = v)} />
          <div class="row">
            <button class="btn" type="button" disabled={!tested.result.ok} onClick={() => void addRule(pattern.value)}>{t('optionsAddRule')}</button>
            <p class="rule-meta" role="status">{added.value ? t('optionsRuleAdded') : ''}</p>
          </div>
        </div>
        {s.rules.length === 0 ? (
          <p class="empty">{t('optionsRulesEmpty')}</p>
        ) : (
          <ul class="list" aria-label={t('optionsRulesTitle')}>
            {s.rules.map((r, i) => (
              <li key={`${i}:${r.source}`}>
                <span class="tag">{r.type}</span>
                <code>{r.source}</code>
                <button class="btn btn-quiet" type="button" aria-label={`${t('optionsRuleRemove')} ${r.type}`} onClick={() => void updateSettings(c => ({ ...c, rules: c.rules.filter((_, j) => j !== i) }))}>{t('optionsRuleRemove')}</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="h-pii">
        <h2 id="h-pii">{t('optionsPiiTitle')}</h2>
        <label class="check" for="pii">
          <input id="pii" type="checkbox" checked={s.pii} onChange={e => { const pii = e.currentTarget.checked; void updateSettings(c => ({ ...c, pii })) }} />
          <span>{t('optionsPiiLabel')}</span>
        </label>
        <p class="help">{t('optionsPiiHelp')}</p>
      </section>

      <section aria-labelledby="h-allow">
        <h2 id="h-allow">{t('optionsAllowTitle')}</h2>
        <p class="help">{t('optionsAllowHelp')}</p>
        {s.allow.length === 0 ? (
          <p class="empty">{t('optionsAllowEmpty')}</p>
        ) : (
          <ul class="list" aria-label={t('optionsAllowTitle')}>
            {s.allow.map(a => (
              <li key={a.hash}>
                <span class="tag">{a.type}</span>
                <span class="date">{t('optionsAllowAdded', [fmt.format(a.at)])}</span>
                <button class="btn btn-quiet" type="button" aria-label={`${t('optionsRuleRemove')} ${a.type}, ${fmt.format(a.at)}`} onClick={() => void updateSettings(c => ({ ...c, allow: c.allow.filter(x => x.hash !== a.hash) }))}>{t('optionsRuleRemove')}</button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="h-paused">
        <h2 id="h-paused">{t('optionsPausedTitle')}</h2>
        {s.paused.length === 0 ? (
          <p class="empty">{t('optionsPausedEmpty')}</p>
        ) : (
          <ul class="list" aria-label={t('optionsPausedTitle')}>
            {s.paused.map(h => (
              <li key={h}>
                <code>{h}</code>
                <button class="btn btn-quiet" type="button" aria-label={`${t('optionsResume')} ${h}`} onClick={() => void updateSettings(c => ({ ...c, paused: c.paused.filter(x => x !== h) }))}>{t('optionsResume')}</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
