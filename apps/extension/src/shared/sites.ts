export const AI_MATCHES = ['https://chatgpt.com/*', 'https://claude.ai/*', 'https://gemini.google.com/*']
export const REGISTRY_HOSTS = ['https://registry.npmjs.org/*', 'https://api.npmjs.org/*', 'https://pypi.org/*']
export const AI_HOSTS = AI_MATCHES.map(m => new URL(m.replace('/*', '/')).host)
