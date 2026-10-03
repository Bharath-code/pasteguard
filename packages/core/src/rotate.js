// Rotate links. Checked 2026-10-01: automated reachability check (curl -sIL/GET, not a manual visual confirmation).
// Result per URL: 200 or login redirect = reachable. 401/403 = bot-blocked but live (cloudflare, gitlab, huggingface, npm, openai, perplexity, postman).
// Not visually confirmed as the key-management page: all entries; confirm by hand before release.
// Anthropic URL was updated after console.anthropic.com redirected to platform.claude.com.

/** @type {Record<string, string>} */
export const ROTATE = {
  'aws-access-key': 'https://console.aws.amazon.com/iam/home#/security_credentials', // 200 via redirect to regional console
  stripe: 'https://dashboard.stripe.com/apikeys', // 200 login redirect
  openai: 'https://platform.openai.com/api-keys', // 403 bot-block
  anthropic: 'https://platform.claude.com/settings/keys', // 200
  github: 'https://github.com/settings/tokens', // 200 login redirect
  slack: 'https://api.slack.com/apps', // 200
  'google-api': 'https://console.cloud.google.com/apis/credentials', // 200 sign-in redirect
  'gitlab-pat': 'https://gitlab.com/-/user_settings/personal_access_tokens', // 403 then sign-in
  'gitlab-pat-routable': 'https://gitlab.com/-/user_settings/personal_access_tokens', // 403 then sign-in
  'slack-user-token': 'https://api.slack.com/apps', // 200
  'slack-app-token': 'https://api.slack.com/apps', // 200
  'slack-webhook-url': 'https://api.slack.com/apps', // 200
  'twilio-api-key': 'https://console.twilio.com/us1/account/keys-credentials/api-keys', // 200
  'sendgrid-api-token': 'https://app.sendgrid.com/settings/api_keys', // 200
  'mailgun-private-api-token': 'https://app.mailgun.com/settings/api_security', // 200
  'npm-access-token': 'https://www.npmjs.com/settings/~/tokens', // 403 bot-block
  'pypi-upload-token': 'https://pypi.org/manage/account/token/', // 200 login redirect
  'discord-api-token': 'https://discord.com/developers/applications', // 200
  'heroku-api-key-v2': 'https://dashboard.heroku.com/account', // 200
  'digitalocean-pat': 'https://cloud.digitalocean.com/account/api/tokens', // 200 login redirect
  'square-access-token': 'https://developer.squareup.com/console/en/apps', // 403 then login redirect
  'gcp-service-account': 'https://console.cloud.google.com/iam-admin/serviceaccounts', // 200 sign-in redirect
  'huggingface-access-token': 'https://huggingface.co/settings/tokens', // 401 live
  'cloudflare-api-key': 'https://dash.cloudflare.com/profile/api-tokens', // 403 bot-block
  'datadog-access-token': 'https://app.datadoghq.com/organization-settings/api-keys', // GET 200 login redirect (HEAD 404)
  'linear-api-key': 'https://linear.app/settings/account/security', // 200
  'notion-api-token': 'https://www.notion.so/profile/integrations', // 200 redirect to app.notion.com
  'supabase-secret-key': 'https://supabase.com/dashboard/account/tokens', // 200
  'vercel-token': 'https://vercel.com/account/settings/tokens', // 200 login redirect
  'postman-api-token': 'https://go.postman.co/settings/me/api-keys', // 401 live
  'atlassian-api-token': 'https://id.atlassian.com/manage-profile/security/api-tokens', // 202
  'sentry-user-token': 'https://sentry.io/settings/account/api/auth-tokens/', // 200 login redirect
  'pulumi-api-token': 'https://app.pulumi.com/account/tokens', // 200
  'rubygems-api-token': 'https://rubygems.org/profile/api_keys', // 200 sign-in redirect
  'perplexity-api-key': 'https://www.perplexity.ai/settings/api', // 403 bot-block
  'telegram-bot-api-token': 'https://t.me/BotFather', // 200
  'doppler-api-token': 'https://dashboard.doppler.com/', // 200 generic dashboard, no deep link
}

/**
 * @param {string} rule
 * @returns {string | null}
 */
export function rotateUrl(rule) {
  return Object.hasOwn(ROTATE, rule) ? ROTATE[rule] : null
}
