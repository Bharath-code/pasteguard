import { RULES } from '../src/detect.js'

/** @param {number} a */
export const seeded = a => () => {
  a = (a + 0x6d2b79f5) | 0
  let t = Math.imul(a ^ (a >>> 15), 1 | a)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

let rnd = seeded(42)
/** @param {number} n */
export const reseed = n => { rnd = seeded(n) }

/** @param {string} set @param {number} n */
const pick = (set, n) => Array.from({ length: n }, () => set[Math.floor(rnd() * set.length)]).join('')
/** @param {string[]} a */ const one = a => a[Math.floor(rnd() * a.length)]
const U = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', L = 'abcdefghijklmnopqrstuvwxyz', D = '0123456789'
const A = U + L + D
/** @param {number} n */ const alnum = n => pick(A, n)
/** @param {number} n */ const lower = n => pick(L, n)
/** @param {number} n */ const alpha = n => pick(U + L, n)
/** @param {number} n */ const hex = n => pick('0123456789abcdef', n)
/** @param {number} n */ const num = n => pick(D, n)
/** @param {number} n */ const wide = n => pick(A + '_-', n)
/** @param {number} n */ const b64 = n => pick(A + '+/', n)
/** @param {number} n */ const url64 = n => pick(A + '_-', n)

/** @param {string} body */
const luhnComplete = body => {
  let sum = 0
  for (let i = 0; i < body.length; i++) {
    let n = +body[body.length - 1 - i]
    if (i % 2 === 0) n = n * 2 > 9 ? n * 2 - 9 : n * 2
    sum += n
  }
  return body + ((10 - (sum % 10)) % 10)
}

/** @type {Record<string, () => string>} */
export const TEMPLATES = {
  'private-key': () => ['-----BEGIN ' + 'RSA PRIVATE KEY-----', b64(64), b64(64), b64(40) + '==', '-----END ' + 'RSA PRIVATE KEY-----'].join('\n'),
  'anthropic': () => 'sk-' + 'ant-api03-' + wide(40),
  'openai': () => 'sk-' + (rnd() < 0.5 ? 'proj-' : '') + wide(40),
  'stripe': () => `stripe.key = "${rnd() < 0.5 ? 'sk' : 'rk'}_` + `${rnd() < 0.5 ? 'live' : 'test'}_${alnum(24)}"`,
  'aws-access-key': () => `AWS_ACCESS_KEY_ID=${one(['AK' + 'IA', 'AS' + 'IA'])}${pick(U + D, 16)}`,
  'github': () => 'gh' + pick('pousr', 1) + '_' + alnum(36),
  'slack': () => 'xox' + pick('abprs', 1) + '-' + num(12) + '-' + alnum(20),
  'google-api': () => 'AI' + 'za' + wide(35),
  'jwt': () => 'ey' + 'J' + url64(20) + '.ey' + 'J' + url64(30) + '.' + url64(43),
  'gitlab-pat': () => 'glpat-' + wide(20),
  'gitlab-pat-routable': () => 'glpat-' + wide(30) + '.' + lower(2) + lower(7),
  'gitlab-runner-authentication-token': () => 'glrt-' + wide(20),
  'gitlab-deploy-token': () => 'gldt-' + wide(20),
  'gitlab-cicd-job-token': () => 'glcbt-' + alnum(3) + '_' + wide(20),
  'slack-user-token': () => 'xox' + pick('pe', 1) + '-' + num(11) + '-' + num(11) + '-' + num(12) + '-' + alnum(30),
  'slack-app-token': () => 'xapp-1-' + (U + D).charAt(0) + pick(U + D, 10) + '-' + num(13) + '-' + lower(40),
  'slack-webhook-url': () => 'https://hooks.slack.com/services/' + alnum(43),
  'twilio-api-key': () => `TWILIO_API_KEY=SK${hex(32)}`,
  'sendgrid-api-token': () => ('SG.' + alnum(22) + '.' + alnum(43)).slice(0, 69),
  'mailgun-private-api-token': () => `mailgun_key = "key-${hex(32)}"`,
  'mailgun-signing-key': () => `MAILGUN_SIGNING: ${pick('abcdefgh01234567', 32)}-${hex(8)}-${hex(8)}`,
  'npm-access-token': () => 'npm_' + lower(36),
  'pypi-upload-token': () => 'pypi-AgEIcHlwaS5vcmc' + wide(60),
  'discord-api-token': () => `discord_token = "${hex(64)}"`,
  'heroku-api-key-v2': () => 'HRKU-AA' + wide(58),
  'heroku-api-key': () => `HEROKU_API_KEY=${hex(8)}-${hex(4)}-${hex(4)}-${hex(4)}-${hex(12)}`,
  'digitalocean-pat': () => 'dop_v1_' + hex(64),
  'digitalocean-access-token': () => 'doo_v1_' + hex(64),
  'digitalocean-refresh-token': () => 'dor_v1_' + hex(64),
  'shopify-access-token': () => 'shpat_' + hex(32),
  'shopify-custom-access-token': () => 'shpca_' + hex(32),
  'shopify-private-app-access-token': () => 'shppa_' + hex(32),
  'square-access-token': () => 'EAAA' + wide(40),
  'azure-storage-key': () => `AccountKey=${b64(86)}==`,
  'gcp-service-account': () => `{"private_key_id": "${hex(40)}"}`,
  'huggingface-access-token': () => 'hf_' + alpha(34),
  'huggingface-organization-api-token': () => 'api_org_' + alpha(34),
  'cloudflare-api-key': () => `CLOUDFLARE_API_TOKEN=${pick(L + D + '_-', 40)}`,
  'cloudflare-origin-ca-key': () => 'v1.0-' + hex(24) + '-' + hex(146),
  'datadog-access-token': () => `datadog_api_key: "${lower(20)}${num(20)}"`,
  'linear-api-key': () => 'lin_api_' + alnum(40),
  'notion-api-token': () => 'ntn_' + num(11) + alnum(35),
  'supabase-secret-key': () => 'sb_secret_' + wide(30),
  'vercel-token': () => 'vc' + pick('apickr', 1) + '_' + alnum(40),
  'doppler-api-token': () => 'dp.pt.' + alnum(43),
  '1password-service-account-token': () => 'ops_eyJ' + b64(260),
  'postman-api-token': () => 'PMAK-' + hex(24) + '-' + hex(34),
  'atlassian-api-token': () => 'ATATT3' + wide(186),
  'atlassian-api-token-legacy': () => `JIRA_TOKEN=${lower(20)}${hex(4)}`,
  'sentry-user-token': () => 'sntryu_' + hex(64),
  'pulumi-api-token': () => 'pul-' + hex(40),
  'grafana-service-account-token': () => 'glsa_' + alnum(32) + '_' + hex(8),
  'planetscale-api-token': () => 'pscale_tkn_' + wide(40),
  'planetscale-password': () => 'pscale_pw_' + wide(40),
  'databricks-api-token': () => 'dapi' + hex(32),
  'age-secret-key': () => 'AGE-SECRET-KEY-1' + pick('QPZRY9X8GF2TVDW0S3JN54KHCE6MUA7L', 58),
  'rubygems-api-token': () => 'rubygems_' + hex(48),
  'perplexity-api-key': () => 'pplx-' + alnum(48),
  'telegram-bot-api-token': () => `telegram_token = "${num(10)}:A${wide(34)}"`,
  'shippo-api-token': () => 'shippo_' + `${rnd() < 0.5 ? 'live' : 'test'}_${hex(40)}`,
  'db-password': () => `DATABASE_URL=${one(['postgres', 'mysql', 'mongodb', 'redis'])}://${lower(6)}:${pick(A + '!#$%^&*', 14)}@${lower(6)}.example.com/${lower(5)}`,
  'assignment': () => `${one(['API_KEY', 'APP_SECRET', 'AUTH_TOKEN', 'DB_PASSWORD'])}=${pick(A + '#$%^&*!', 24)}`,
  'card': () => luhnComplete(one(['4' + num(14), '5' + one(['1', '2', '3', '4', '5']) + num(13), '37' + num(12), '6011' + num(11), '62' + num(13)])),
}

const WRAPS = [
  (/** @type {string} */ s) => `${s}`,
  (/** @type {string} */ s) => `here is my config:\n${s}\nthanks`,
  (/** @type {string} */ s) => `why does this fail? ${s}.`,
  (/** @type {string} */ s) => `\`\`\`\n${s}\n\`\`\``,
  (/** @type {string} */ s) => `export ${s};\nnpm start`,
]

export const PER_RULE = 50

/** @returns {{ rule: string, text: string }[]} */
export function positives() {
  reseed(42)
  const ids = RULES.filter(r => !r.pii).map(r => r.id)
  const out = []
  for (const rule of ids) {
    const make = TEMPLATES[rule]
    if (!make) continue
    for (let i = 0; i < PER_RULE; i++) out.push({ rule, text: WRAPS[i % WRAPS.length](make()) })
  }
  return out
}
