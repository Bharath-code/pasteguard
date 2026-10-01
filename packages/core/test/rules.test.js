import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detect, RULES } from '../src/detect.js'
import { EXTRA } from '../src/rules-extra.js'
import { shannon } from '../src/entropy.js'

test('pii rules are off by default and on with opts.pii', () => {
  assert.equal(detect('mail jane@acme.io').length, 0)
  assert.equal(detect('mail jane@acme.io', { pii: true })[0].type, 'Email address')
})

test('cards stay on by default (luhn)', () => {
  assert.equal(detect('4242 4242 4242 4242')[0].rule, 'card')
})

test('every rule has a unique id, a type and a global regex', () => {
  const ids = new Set()
  for (const r of RULES) {
    assert.ok(r.id && r.type, r.id)
    assert.ok(r.re.global, `${r.id} needs /g`)
    assert.ok(!ids.has(r.id), `dup ${r.id}`); ids.add(r.id)
  }
})

test('at least 35 rules, grouped rules carry the d flag', () => {
  assert.ok(RULES.length >= 35, `only ${RULES.length}`)
  for (const r of RULES) if (r.group) assert.ok(r.re.hasIndices, `${r.id} needs /d`)
})

test('keyword prefilter skips a rule whose keywords are absent and runs it when present', () => {
  const rule = { id: 'zz-test', type: 'Zz test', re: /zzsecret\d{6}/g, keywords: ['zzkeyword'] }
  RULES.push(rule)
  try {
    assert.equal(detect('value zzsecret123456').length, 0)
    const hits = detect('zzkeyword value zzsecret123456')
    assert.equal(hits.length, 1)
    assert.equal(hits[0].rule, 'zz-test')
  } finally {
    RULES.splice(RULES.indexOf(rule), 1)
  }
})

test('no rule keyword is shorter than three characters except @', () => {
  for (const r of RULES) for (const k of r.keywords ?? []) assert.ok(k.length >= 3 || k === '@', `${r.id}: ${k}`)
})

test('github and twilio rules still detect their samples under tightened keywords', () => {
  assert.equal(detect(`x ghp_${'aB3'.repeat(12)}`)[0].rule, 'github')
  assert.equal(detect(`x ghs_${'aB3'.repeat(12)}`)[0].type, 'GitHub token')
  assert.equal(detect(`TWILIO_API_KEY=SK${'0a1b2c3d'.repeat(4)}`)[0].rule, 'twilio-api-key')
  assert.equal(detect(`SK${'0a1b2c3d'.repeat(4)}`).length, 0)
})

test('tokens end at punctuation, quotes, newline and end of input', () => {
  const npm = 'npm_' + 'abcdefghijklmnopqrstuvwxyz0123456789'
  const pul = 'pul-' + '0123456789abcdef'.repeat(3).slice(0, 40)
  const kvs = 'mailgun_key = "key-' + '0123456789abcdef'.repeat(2) + '"'
  for (const after of [')', '.', ',', ';', '"', "'", '\n', ' more', ''])
    for (const [rule, tok] of [['npm-access-token', npm], ['pulumi-api-token', pul]]) {
      const hits = detect(`(${tok}${after}`)
      assert.equal(hits.length, 1, `${rule} before ${JSON.stringify(after)}`)
      assert.equal(hits[0].rule, rule)
      assert.equal(hits[0].value, tok)
    }
  for (const after of [')', '.', ',', ';', '"', "'", '\n', ''])
    assert.equal(detect(`${kvs}${after}`).filter(h => h.rule === 'mailgun-private-api-token').length, 1, JSON.stringify(after))
  assert.equal(detect(npm + 'x').filter(h => h.rule === 'npm-access-token').length, 0)
})

test('keywords are lowercase', () => {
  for (const r of RULES) for (const k of r.keywords ?? []) assert.equal(k, k.toLowerCase(), r.id)
})

test('generic assignment rule needs entropy', () => {
  assert.equal(detect('PASSWORD=aaaaaaaaaaaa').length, 0)
  assert.equal(detect('PASSWORD=Xk9#mQ2$vL7pR4').length, 1)
})

test('custom rules run and cannot hang on bad input', () => {
  const hits = detect('token acme_svc_9f2kq81xz', { extra: [{ type: 'Acme key', re: /acme_svc_[a-z0-9]{8,}/g }] })
  assert.equal(hits[0].type, 'Acme key')
})

test('custom rule without /g still works', () => {
  const hits = detect('acme_svc_9f2kq81xz', { extra: [{ type: 'Acme key', re: /acme_svc_[a-z0-9]{8,}/ }] })
  assert.equal(hits.length, 1)
})

test('shannon', () => {
  assert.equal(shannon('aaaa'), 0)
  assert.ok(shannon('Xk9#mQ2$vL7pR4') > 3.5)
})

let seed = 7
/** @param {string} alpha @param {number} n */
const pick = (alpha, n) => {
  let s = ''
  for (let i = 0; i < n; i++) { seed = (seed * 1103515245 + 12345) & 0x7fffffff; s += alpha[seed % alpha.length] }
  return s
}
const A = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
/** @param {number} n */
const alnum = n => pick(A, n)
/** @param {number} n */
const lower = n => pick('abcdefghijklmnopqrstuvwxyz', n)
/** @param {number} n */
const alpha = n => pick('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', n)
/** @param {number} n */
const hex = n => pick('0123456789abcdef', n)
/** @param {number} n */
const num = n => pick('0123456789', n)
/** @param {number} n */
const wide = n => pick(A + '_-', n)
/** @param {number} n */
const b64 = n => pick(A + '+/', n)

/** @type {Record<string, () => string>} */
const SAMPLES = {
  'github-app-token': () => `ghs_${alnum(36)}`,
  'github-oauth': () => `gho_${alnum(36)}`,
  'github-fine-grained-pat': () => `github_pat_${alnum(82)}`,
  'gitlab-pat': () => `glpat-${wide(20)}`,
  'gitlab-pat-routable': () => `glpat-${wide(30)}.${lower(2)}${lower(7)}`,
  'gitlab-runner-authentication-token': () => `glrt-${wide(20)}`,
  'gitlab-deploy-token': () => `gldt-${wide(20)}`,
  'gitlab-cicd-job-token': () => `glcbt-${alnum(3)}_${wide(20)}`,
  'slack-bot-token': () => `xoxb-${num(11)}-${num(12)}-${alnum(24)}`,
  'slack-user-token': () => `xoxp-${num(11)}-${num(11)}-${num(12)}-${alnum(30)}`,
  'slack-app-token': () => `xapp-1-${alnum(11).toUpperCase()}-${num(13)}-${lower(40)}`,
  'slack-webhook-url': () => `https://hooks.slack.com/services/${alnum(43)}`,
  'twilio-api-key': () => `TWILIO_API_KEY=SK${hex(32)}`,
  'sendgrid-api-token': () => `SG.${alnum(22)}.${alnum(43)}`.slice(0, 69),
  'mailgun-private-api-token': () => `mailgun_key = "key-${hex(32)}"`,
  'mailgun-signing-key': () => `MAILGUN_SIGNING: ${pick('abcdefgh01234567', 32)}-${hex(8)}-${hex(8)}`,
  'npm-access-token': () => `npm_${lower(36)}`,
  'pypi-upload-token': () => `pypi-AgEIcHlwaS5vcmc${wide(60)}`,
  'discord-api-token': () => `discord_token = "${hex(64)}"`,
  'heroku-api-key-v2': () => `HRKU-AA${wide(58)}`,
  'heroku-api-key': () => `HEROKU_API_KEY=${hex(8)}-${hex(4)}-${hex(4)}-${hex(4)}-${hex(12)}`,
  'digitalocean-pat': () => `dop_v1_${hex(64)}`,
  'digitalocean-access-token': () => `doo_v1_${hex(64)}`,
  'digitalocean-refresh-token': () => `dor_v1_${hex(64)}`,
  'shopify-access-token': () => `shpat_${hex(32)}`,
  'shopify-custom-access-token': () => `shpca_${hex(32)}`,
  'shopify-private-app-access-token': () => `shppa_${hex(32)}`,
  'square-access-token': () => `EAAA${wide(40)}`,
  'azure-storage-key': () => `AccountKey=${b64(86)}==`,
  'gcp-service-account': () => `{"private_key_id": "${hex(40)}"}`,
  'huggingface-access-token': () => `hf_${alpha(34)}`,
  'huggingface-organization-api-token': () => `api_org_${alpha(34)}`,
  'cloudflare-api-key': () => `CLOUDFLARE_API_TOKEN=${wide(40).toLowerCase()}`,
  'cloudflare-origin-ca-key': () => `v1.0-${hex(24)}-${hex(146)}`,
  'datadog-access-token': () => `datadog_api_key: "${lower(20)}${num(20)}"`,
  'linear-api-key': () => `lin_api_${alnum(40)}`,
  'notion-api-token': () => `ntn_${num(11)}${alnum(35)}`,
  'supabase-secret-key': () => `sb_secret_${wide(30)}`,
  'vercel-token': () => `vcp_${alnum(40)}`,
  'doppler-api-token': () => `dp.pt.${alnum(43)}`,
  '1password-service-account-token': () => `ops_eyJ${b64(260)}`,
  'postman-api-token': () => `PMAK-${hex(24)}-${hex(34)}`,
  'atlassian-api-token': () => `ATATT3${wide(186)}`,
  'atlassian-api-token-legacy': () => `JIRA_TOKEN=${lower(20)}${hex(4)}`,
  'sentry-user-token': () => `sntryu_${hex(64)}`,
  'pulumi-api-token': () => `pul-${hex(40)}`,
  'grafana-service-account-token': () => `glsa_${alnum(32)}_${hex(8)}`,
  'planetscale-api-token': () => `pscale_tkn_${wide(40)}`,
  'planetscale-password': () => `pscale_pw_${wide(40)}`,
  'databricks-api-token': () => `dapi${hex(32)}`,
  'age-secret-key': () => `AGE-SECRET-KEY-1${pick('QPZRY9X8GF2TVDW0S3JN54KHCE6MUA7L', 58)}`,
  'rubygems-api-token': () => `rubygems_${hex(48)}`,
  'perplexity-api-key': () => `pplx-${alnum(48)}`,
  'anthropic-admin-api-key': () => `sk-ant-admin01-${wide(93)}AA`,
  'telegram-bot-api-token': () => `telegram_token = "${num(10)}:A${wide(34)}"`,
  'shippo-api-token': () => `shippo_live_${hex(40)}`,
}

test('every ported rule has a generated sample and detects it with its own id', () => {
  for (const r of EXTRA) {
    const make = SAMPLES[r.id]
    assert.ok(make, `no sample for ${r.id}`)
    const text = `config line before\n${make()}\nline after`
    const hits = detect(text)
    assert.ok(hits.length >= 1, `${r.id}: nothing detected in sample`)
    assert.ok(hits.some(h => h.rule === r.id || RULES.find(x => x.id === h.rule)?.type === r.type), `${r.id}: got ${hits.map(h => h.rule)}`)
  }
})

test('ported rules matched on their own when run in isolation', () => {
  for (const r of EXTRA) {
    const text = SAMPLES[r.id]()
    const re = new RegExp(r.re.source, r.re.flags)
    assert.ok(re.test(text), `${r.id} regex does not match its sample`)
  }
})

test('plain prose and code do not trip the ported rules', () => {
  const text = 'Slack hooks and datadog dashboards are discussed in the jira ticket; run npm install, then see mailgun docs. sk learning, heroku deploy, telegram bot, cloudflare tunnel.'
  assert.equal(detect(text).length, 0)
})
