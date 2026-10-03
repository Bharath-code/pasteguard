import { readFile } from 'node:fs/promises'
import { test, expect } from './fixtures'

const sites = [
  { id: 'chatgpt', url: 'https://chatgpt.com/c/synthetic-conv-1', conv: 'synthetic-conv-1' },
  { id: 'claude', url: 'https://claude.ai/chat/00000000-0000-4000-8000-000000000001', conv: '00000000-0000-4000-8000-000000000001' },
  { id: 'gemini', url: 'https://gemini.google.com/app/abc123def456', conv: 'abc123def456' },
]

for (const s of sites) {
  test(`${s.id}: adapter reads the saved DOM snapshot`, async ({ page, ext }) => {
    const html = await readFile(new URL(`./snapshots/${s.id}.html`, import.meta.url), 'utf8')
    await page.route('**/*', r => (r.request().url() === s.url ? r.fulfill({ contentType: 'text/html', body: html }) : r.abort()))
    await page.goto(s.url)
    expect(await ext.evalInContent<string>(page, 'adapterId')).toBe(s.id)
    expect(await ext.evalInContent<boolean>(page, 'hasComposer')).toBe(true)
    expect(await ext.evalInContent<string[]>(page, 'answers')).toHaveLength(1)
    expect(await ext.evalInContent<string[]>(page, 'userTurns')).toHaveLength(1)
    expect(await ext.evalInContent<string | null>(page, 'conversationId')).toBe(s.conv)
    expect(await ext.evalInContent<boolean>(page, 'insert', 'inserted PG_SECRET_2')).toBe(true)
    await expect(page.locator('[contenteditable=true]')).toContainText('inserted PG_SECRET_2')
  })
}
