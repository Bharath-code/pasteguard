# PasteGuard design system

Derived from the Sentry DESIGN.md in VoltAgent/awesome-design-md. Kept from it: the spacing scale, radius scale, dark violet canvas with light "paper" surfaces for pricing, and a playful dev-tool tone. Replaced: all colors and fonts, so the page doesn't read as Sentry.

## Concept
Redaction as the visual language. Hatched tamper-tape bars (`--hatch`) mean "protected". A highlighter-yellow marker is the brand. Coral means "a secret is exposed".

## Color (each has one meaning)
| Token | Hex | Meaning |
|---|---|---|
| `--ink` | #1B1433 | canvas |
| `--ink-2` / `--ink-3` | #251C45 / #120D24 | raised / inset surfaces |
| `--line` | #3B3163 | hairlines, idle controls |
| `--paper` | #F4F2FB | light surfaces (pricing, AI output, dashboards) |
| `--marker` | #F2E15B | protected, primary action, placeholders |
| `--alert` | #FF5E7E | exposed secret, danger only |
| `--violet` | #9C8CFF | links, focus ring |

## Type
- Display: Bricolage Grotesque, `wdth` 75–85, weight 700–760, tight leading (.9–1).
- UI/body: Rubik 400/500/600, 1.65 line-height, lines ≤ 40em.
- Code: JetBrains Mono. Only for real code, keys and package names.
- Sentence case everywhere. No all-caps eyebrows, no arrows in buttons.

## Spacing and radius
Spacing 2/4/8/12/16/24/32, section `clamp(72px, 10vw, 136px)`. Radius 6 / 10 / 18 / pill.

## Motion
- One orchestrated moment: the hero paste → scan → redact → send → restore sequence.
- Other motion only responds to the user (live redaction, package verdicts), or is a looping diagram that runs only while on screen (`[data-live]` + IntersectionObserver).
- Animate transform/opacity only. `prefers-reduced-motion` shows final states.

## Copy
Plain, specific, user's words. CTAs name the outcome ("Get early access", "Check package", "Join the team pilot"). Every stat has a numbered source in the footer. Never invent users, logos or testimonials.
