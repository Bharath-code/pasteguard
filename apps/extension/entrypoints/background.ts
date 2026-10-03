import { onTabRemoved, route } from '../src/sw/router'

export default defineBackground(() => {
  chrome.runtime.onMessage.addListener((msg, sender, reply) => {
    route(msg, sender).then(reply)
    return true
  })
  chrome.tabs.onRemoved.addListener(tabId => void onTabRemoved(tabId))
})
