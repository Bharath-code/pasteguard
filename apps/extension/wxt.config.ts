import { defineConfig } from 'wxt'
import preact from '@preact/preset-vite'
import { AI_MATCHES, REGISTRY_HOSTS } from './src/shared/sites'

export default defineConfig({
  srcDir: '.',
  vite: ({ mode }) => ({
    plugins: [preact()],
    build: {
      rolldownOptions: {
        output: { minify: mode === 'production' ? { compress: { dropConsole: true, dropDebugger: true } } : false },
      },
    },
  }),
  manifest: ({ mode }) => ({
    name: '__MSG_name__',
    description: '__MSG_description__',
    default_locale: 'en',
    minimum_chrome_version: '125',
    permissions: ['storage'],
    host_permissions: [
      ...AI_MATCHES,
      ...REGISTRY_HOSTS,
      ...(mode === 'production' ? [] : ['http://localhost/*']),
    ],
    icons: { 16: 'icon/active-16.png', 32: 'icon/active-32.png', 48: 'icon/active-48.png', 128: 'icon/active-128.png' },
    action: {
      default_popup: 'popup.html',
      default_title: '__MSG_name__',
      default_icon: { 16: 'icon/idle-16.png', 32: 'icon/idle-32.png', 48: 'icon/idle-48.png', 128: 'icon/idle-128.png' },
    },
    content_security_policy: {
      extension_pages:
        "script-src 'self'; object-src 'none'; connect-src https://registry.npmjs.org https://api.npmjs.org https://pypi.org",
    },
  }),
})
