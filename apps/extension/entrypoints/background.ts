import { restoreBadges, syncPaused } from '../src/sw/badge'
import { onTabRemoved, route } from '../src/sw/router'

export default defineBackground(() => {
  void restoreBadges()
  chrome.runtime.onMessage.addListener((msg, sender, reply) => {
    route(msg, sender).then(reply)
    return true
  })
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes['settings']) void syncPaused(changes['settings'].oldValue, changes['settings'].newValue)
  })
  chrome.tabs.onRemoved.addListener(tabId => void onTabRemoved(tabId))
})
