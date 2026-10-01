// Rules ported from gitleaks config/gitleaks.toml
// https://github.com/gitleaks/gitleaks/blob/b58d3f102cf3a2c84cb7f923d05c25c9b1aed84b/config/gitleaks.toml
// Source commit: b58d3f102cf3a2c84cb7f923d05c25c9b1aed84b
//
// MIT License. Copyright (c) 2019 Zachary Rice
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
// documentation files (the "Software"), to deal in the Software without restriction, including without limitation
// the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and
// to permit persons to whom the Software is furnished to do so, subject to the following conditions: The above
// copyright notice and this permission notice shall be included in all copies or substantial portions of the
// Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT
// LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT
// SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
// DEALINGS IN THE SOFTWARE.
//
// Conversion notes: Go (?i) prefix became the JS i flag, mid-pattern (?i) was expanded to explicit classes, the
// trailing boundary group became a negative lookahead for a token character (so no capture group is needed and `)`, `.`, `,` also end a token), per-rule entropy thresholds and
// allowlists were not carried over. (?-i:) segments are matched case-insensitively.
// Not in gitleaks, written from vendor token formats: azure-storage-key, gcp-service-account, supabase-secret-key,
// vercel-token.

/** @typedef {{ id: string, type: string, re: RegExp, group?: number, check?: (v: string) => boolean, keywords?: string[], pii?: true, generic?: true }} Rule */

const END = String.raw`(?![\w-])`
const SEP = String.raw`(?:[ \t\w.-]{0,20})[\s'"]{0,3}(?:=|>|:{1,3}=|\|\||:|=>|\?=|,)[\x60'"\s=]{0,5}`

/** @param {string} id @param {string} type @param {string} src @param {string[]} keywords @param {string} [flags] @returns {Rule} */
const tok = (id, type, src, keywords, flags = 'g') => ({ id, type, re: new RegExp(src + END, flags), keywords })

/** @param {string} id @param {string} type @param {string} names @param {string} value @param {string[]} keywords @returns {Rule} */
const kv = (id, type, names, value, keywords) => ({
  id, type, group: 1, keywords,
  re: new RegExp(String.raw`[\w.-]{0,50}?(?:${names})${SEP}(${value})${END}`, 'gid'),
})

/** @type {Rule[]} */
export const EXTRA = [
  tok('github-app-token', 'GitHub token', String.raw`\bgh[us]_[0-9a-zA-Z]{36}`, ['ghu_', 'ghs_']),
  tok('github-oauth', 'GitHub token', String.raw`\bgho_[0-9a-zA-Z]{36}`, ['gho_']),
  tok('github-fine-grained-pat', 'GitHub token', String.raw`\bgithub_pat_\w{82}`, ['github_pat_']),
  tok('gitlab-pat', 'GitLab token', String.raw`\bglpat-[\w-]{20}`, ['glpat-']),
  tok('gitlab-pat-routable', 'GitLab token', String.raw`\bglpat-[0-9a-zA-Z_-]{27,300}\.[0-9a-z]{2}[0-9a-z]{7}\b`, ['glpat-']),
  tok('gitlab-runner-authentication-token', 'GitLab token', String.raw`\bglrt-[0-9a-zA-Z_\-]{20}`, ['glrt-']),
  tok('gitlab-deploy-token', 'GitLab token', String.raw`\bgldt-[0-9a-zA-Z_\-]{20}`, ['gldt-']),
  tok('gitlab-cicd-job-token', 'GitLab token', String.raw`\bglcbt-[0-9a-zA-Z]{1,5}_[0-9a-zA-Z_-]{20}`, ['glcbt-']),
  tok('slack-bot-token', 'Slack token', String.raw`\bxoxb-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*`, ['xoxb']),
  tok('slack-user-token', 'Slack token', String.raw`\bxox[pe](?:-[0-9]{10,13}){3}-[a-zA-Z0-9-]{28,34}`, ['xoxp-', 'xoxe-']),
  tok('slack-app-token', 'Slack token', String.raw`\bxapp-\d-[A-Z0-9]+-\d+-[a-z0-9]+`, ['xapp'], 'gi'),
  tok('slack-webhook-url', 'Slack webhook URL', String.raw`(?:https?://)?hooks\.slack\.com/(?:services|workflows|triggers)/[A-Za-z0-9+/]{43,56}`, ['hooks.slack.com']),
  kv('twilio-api-key', 'Twilio API key', 'twilio', 'SK[0-9a-fA-F]{32}', ['twilio']),
  tok('sendgrid-api-token', 'SendGrid API key', String.raw`\bSG\.[a-zA-Z0-9=_\-.]{66}`, ['sg.']),
  kv('mailgun-private-api-token', 'Mailgun API key', 'mailgun', 'key-[a-f0-9]{32}', ['mailgun']),
  kv('mailgun-signing-key', 'Mailgun signing key', 'mailgun', '[a-h0-9]{32}-[a-h0-9]{8}-[a-h0-9]{8}', ['mailgun']),
  tok('npm-access-token', 'npm token', String.raw`\bnpm_[a-z0-9]{36}`, ['npm_'], 'gi'),
  tok('pypi-upload-token', 'PyPI token', String.raw`\bpypi-AgEIcHlwaS5vcmc[\w-]{50,1000}`, ['pypi-ageichlwas5vcmc']),
  kv('discord-api-token', 'Discord token', 'discord', '[a-f0-9]{64}', ['discord']),
  tok('heroku-api-key-v2', 'Heroku API key', String.raw`\bHRKU-AA[0-9a-zA-Z_-]{58}`, ['hrku-aa']),
  kv('heroku-api-key', 'Heroku API key', 'heroku', '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', ['heroku']),
  tok('digitalocean-pat', 'DigitalOcean token', String.raw`\bdop_v1_[a-f0-9]{64}`, ['dop_v1_']),
  tok('digitalocean-access-token', 'DigitalOcean token', String.raw`\bdoo_v1_[a-f0-9]{64}`, ['doo_v1_']),
  tok('digitalocean-refresh-token', 'DigitalOcean token', String.raw`\bdor_v1_[a-f0-9]{64}`, ['dor_v1_'], 'gi'),
  tok('shopify-access-token', 'Shopify token', String.raw`\bshpat_[a-fA-F0-9]{32}`, ['shpat_']),
  tok('shopify-custom-access-token', 'Shopify token', String.raw`\bshpca_[a-fA-F0-9]{32}`, ['shpca_']),
  tok('shopify-private-app-access-token', 'Shopify token', String.raw`\bshppa_[a-fA-F0-9]{32}`, ['shppa_']),
  tok('square-access-token', 'Square token', String.raw`\b(?:EAAA|sq0atp-)[\w-]{22,60}`, ['sq0atp-', 'eaaa']),
  {
    id: 'azure-storage-key', type: 'Azure storage key', group: 1, keywords: ['accountkey'],
    re: /AccountKey=([A-Za-z0-9+/]{86}==)/gid,
  },
  {
    id: 'gcp-service-account', type: 'GCP service account key', group: 1, keywords: ['private_key_id'],
    re: /"private_key_id"\s*:\s*"([a-f0-9]{40})"/gid,
  },
  tok('huggingface-access-token', 'Hugging Face token', String.raw`\bhf_[a-zA-Z]{34}`, ['hf_']),
  tok('huggingface-organization-api-token', 'Hugging Face token', String.raw`\bapi_org_[a-zA-Z]{34}`, ['api_org_']),
  kv('cloudflare-api-key', 'Cloudflare API token', 'cloudflare', '[a-z0-9_-]{40}', ['cloudflare']),
  tok('cloudflare-origin-ca-key', 'Cloudflare origin CA key', String.raw`\bv1\.0-[a-f0-9]{24}-[a-f0-9]{146}`, ['v1.0-']),
  kv('datadog-access-token', 'Datadog token', 'datadog', '[a-z0-9]{40}', ['datadog']),
  tok('linear-api-key', 'Linear API key', String.raw`\blin_api_[a-zA-Z0-9]{40}`, ['lin_api_']),
  tok('notion-api-token', 'Notion token', String.raw`\bntn_[0-9]{11}[A-Za-z0-9]{32}[A-Za-z0-9]{3}`, ['ntn_']),
  tok('supabase-secret-key', 'Supabase secret key', String.raw`\bsb_secret_[A-Za-z0-9_-]{20,}`, ['sb_secret_']),
  tok('vercel-token', 'Vercel token', String.raw`\bvc[apickr]_[A-Za-z0-9]{24,}`, ['vca_', 'vcp_', 'vci_', 'vcc_', 'vck_', 'vcr_']),
  tok('doppler-api-token', 'Doppler token', String.raw`\bdp\.pt\.[a-zA-Z0-9]{43}`, ['dp.pt.']),
  tok('1password-service-account-token', '1Password service account token', String.raw`\bops_eyJ[a-zA-Z0-9+/]{250,}={0,3}`, ['ops_']),
  tok('postman-api-token', 'Postman API key', String.raw`\bPMAK-[a-fA-F0-9]{24}-[a-fA-F0-9]{34}`, ['pmak-']),
  tok('atlassian-api-token', 'Atlassian API token', String.raw`\bATATT3[A-Za-z0-9_\-=]{186}`, ['atatt3']),
  kv('atlassian-api-token-legacy', 'Atlassian API token', 'atlassian|confluence|jira', '[a-z0-9]{20}[a-f0-9]{4}', ['atlassian', 'confluence', 'jira']),
  tok('sentry-user-token', 'Sentry token', String.raw`\bsntryu_[a-f0-9]{64}`, ['sntryu_']),
  tok('pulumi-api-token', 'Pulumi token', String.raw`\bpul-[a-f0-9]{40}`, ['pul-']),
  tok('grafana-service-account-token', 'Grafana token', String.raw`\bglsa_[A-Za-z0-9]{32}_[A-Fa-f0-9]{8}`, ['glsa_'], 'gi'),
  tok('planetscale-api-token', 'PlanetScale token', String.raw`\bpscale_tkn_[\w=.-]{32,64}`, ['pscale_tkn_']),
  tok('planetscale-password', 'PlanetScale password', String.raw`\bpscale_pw_[\w=.-]{32,64}`, ['pscale_pw_'], 'gi'),
  tok('databricks-api-token', 'Databricks token', String.raw`\bdapi[a-f0-9]{32}(?:-\d)?`, ['dapi']),
  tok('age-secret-key', 'age secret key', String.raw`\bAGE-SECRET-KEY-1[QPZRY9X8GF2TVDW0S3JN54KHCE6MUA7L]{58}`, ['age-secret-key-1']),
  tok('rubygems-api-token', 'RubyGems token', String.raw`\brubygems_[a-f0-9]{48}`, ['rubygems_']),
  tok('perplexity-api-key', 'Perplexity API key', String.raw`\bpplx-[a-zA-Z0-9]{48}`, ['pplx-']),
  tok('anthropic-admin-api-key', 'Anthropic key', String.raw`\bsk-ant-admin01-[a-zA-Z0-9_\-]{93}AA`, ['sk-ant-admin01']),
  kv('telegram-bot-api-token', 'Telegram bot token', 'telegr', '[0-9]{5,16}:A[a-z0-9_\\-]{34}', ['telegr']),
  tok('shippo-api-token', 'Shippo token', String.raw`\bshippo_(?:live|test)_[a-fA-F0-9]{40}`, ['shippo_']),
]
