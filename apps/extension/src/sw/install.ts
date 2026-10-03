export const BYE_URL = 'https://pasteguard-landing.pages.dev/bye/'

export async function onInstalled(details: { reason: string }): Promise<void> {
  void chrome.runtime.setUninstallURL(`${BYE_URL}?v=${encodeURIComponent(chrome.runtime.getManifest().version)}`)
  if (details.reason === 'install') await chrome.tabs.create({ url: chrome.runtime.getURL('/welcome.html') })
}
