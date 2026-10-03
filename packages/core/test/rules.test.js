import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detect, RULES } from '../src/detect.js'
import { EXTRA } from '../src/rules-extra.js'
import { shannon } from '../src/entropy.js'
import { TEMPLATES } from '../corpus/positive.js'

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

const SAMPLES = TEMPLATES

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

test('specific rule beats the generic assignment rule and keeps trailing punctuation out', () => {
  const key = 'SK' + '0a1b2c3d'.repeat(4)
  const hits = detect(`why? TWILIO_API_KEY=${key}.`)
  assert.equal(hits.length, 1)
  assert.equal(hits[0].rule, 'twilio-api-key')
  assert.equal(hits[0].value, key)
})

test('card needs a known issuer prefix and length, not just luhn', () => {
  assert.equal(detect('id 8573-216018911455').length, 0)
  assert.equal(detect('3782 822463 10005')[0].rule, 'card')
})

test('vcc_ vercel tokens pass the keyword prefilter', () => {
  assert.equal(detect('vcc_' + 'aB3'.repeat(10))[0].rule, 'vercel-token')
})

test('xoxp token with an over-long tail falls through to the slack rule', () => {
  const groups = ['1', '2', '3'].map(() => '7'.repeat(11)).join('-')
  for (const n of [35, 40]) {
    const hits = detect(`xoxp-${groups}-${'aB3'.repeat(14).slice(0, n)}`)
    assert.equal(hits.length, 1, `tail ${n}`)
    assert.equal(hits[0].rule, 'slack')
  }
})
