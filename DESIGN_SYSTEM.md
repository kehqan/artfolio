# Artomango design system

Artomango is used, seen and judged by artists. The interface should feel crafted and calm, and let the artwork carry the color. The brand is **soft brutalism**: mango yellow, ink outlines and a hard offset shadow, used as an accent rather than on everything.

Live reference: **`/dashboard/design-system`** (not linked from the nav).

## Where things live

| Layer | File | Rule |
|---|---|---|
| Tokens | `src/styles/tokens.css` | The only place raw hex, px sizes and shadows are written. |
| Tailwind theme | `tailwind.config.ts` | Maps semantic class names to the tokens. |
| Components | `src/components/ui/` | Import from `@/components/ui`. Pages compose these. |

New code should not use inline `style={{…}}` for color, type, radius, border or shadow, and should not contain hex values.

## The accent rules

1. **Ink marks what you can touch.** Ink outline + hard shadow go on buttons, the active nav item or tab, clickable cards *on hover*, and floating layers (menus, modals, toasts). Static content gets a 1px warm hairline (`border-hair border-line`).
2. **Mango means "do this".** One primary button per screen. Mango marks the current item and highlights, never a large background.
3. **Two typefaces, two jobs.** Darker Grotesque (`font-display`) for headlines, titles and big numbers, 20px and up. Instrument Sans (`font-ui`) for everything else. Nothing below 12px.
4. **Artwork is the hero.** Keep images clean (no titles overlaid on art), keep chrome quiet, give work room.

| Element | At rest | Hover / active | Never |
|---|---|---|---|
| Primary button | Mango, ink outline, `shadow-hard-1` | Lifts to `shadow-hard-2`, presses flat | Two on one screen |
| Clickable card | White, hairline, no shadow | Ink outline, `shadow-hard-2`, lifts 2px | Shadow at rest |
| Static panel | White, hairline | No change | Ink outline |
| Nav / tabs | Hairline | Active item: ink or mango fill | Mango on more than one item |
| Menu, modal, toast | Ink outline, `shadow-hard-3` | n/a | Blur or glass |
| Input | `border-line-strong` | Focus: ink border + `shadow-hard-1` | Yellow focus ring |

## Tokens → classes

**Color**
- Brand: `ink`, `mango`, `mango-hover`, `mango-soft`, `on-mango`
- Surfaces: `page` (app background), `surface` (cards, inputs), `sunken` (wells, table heads), `inverse` / `on-inverse`, `scrim`
- Neutrals: `n-100` … `n-700`
- Text: `text-fg` (headings), `text-fg-2` (body), `text-fg-3` (meta, AA on white), `text-fg-disabled`
- Lines: `border-line` (hairline), `border-line-strong` (inputs)
- Status, each with a soft well: `ok`, `warn`, `bad`, `info` → e.g. `bg-ok-well text-ok`
- Category tags: `tag-coral`, `tag-teal`, `tag-violet`, `tag-pink`, `tag-sky`

Colors are CSS variables, so Tailwind opacity modifiers (`bg-ink/40`) don't work. Add a token instead (see `scrim`).

**Type** (`text-*`, size + line height)

| Class | Size | Face |
|---|---|---|
| `text-display` | 56 | `font-display` |
| `text-h1` | 40 | `font-display` |
| `text-h2` | 28 | `font-display` |
| `text-h3` | 20 | `font-display` |
| `text-lead` | 18 | `font-ui` |
| `text-body` | 15 | `font-ui` |
| `text-body-sm` | 14 | `font-ui` |
| `text-control` | 14 | buttons, inputs |
| `text-label` | 13 | `font-ui`, semibold |
| `text-caption` | 12 | `font-ui` |

**Shape**
- Radius: `rounded-chip` 6, `rounded-control` 10, `rounded-card` 16, `rounded-pill`
- Border width: `border-outline` 1.5px (ink outlines), `border-hair` 1px
- Shadow: `shadow-hard-1` 2px, `shadow-hard-2` 3px, `shadow-hard-3` 5px
- Spacing: Tailwind's 4px scale (`gap-2` = 8, `p-4` = 16, `gap-6` = 24 …)
- Motion: `duration-fast` 120ms, `duration-base` 200ms, `ease-out`; both drop to 0 with reduced motion
- Layers: `z-nav`, `z-dropdown`, `z-modal`, `z-toast`

## Components

| Component | Use for |
|---|---|
| `Button`, `ButtonLink`, `buttonClasses()` | Actions. Variants `primary`, `secondary`, `ghost`, `danger`; sizes `sm`, `md`, `icon`, `icon-sm` (icon sizes need `aria-label`). |
| `Card` | Panels. `interactive` for clickable cards, `padding="none"` for edge-to-edge images. |
| `Field` + `Input`, `Select`, `Textarea`, `Label` | Forms. `Field` wires the label, hint and error. |
| `Badge` | Status (Available, Sold, Draft). Tones `ok`, `warn`, `bad`, `info`, `neutral`, `mango`. |
| `Tag` | Descriptors (medium, series), optional category color dot. |
| `Heading`, `Eyebrow` | Headlines and the small uppercase label above them. |
| `PageHeader` | Title, description and actions at the top of a page. |
| `Tabs` | Segmented filters with counts. |
| `StatTile` | A single number with label and change. |
| `EmptyState` | Empty lists: say what will appear and how to add the first one. |
| `Modal` | Confirmations and short forms. |
| `Avatar` | People, with initials fallback. |
| `Menu` | The "⋯" actions menu on cards and table rows. |
| `SearchField` | Search box with clear button. |
| `Chip` | Toggleable filter chips (stages, categories). |
| `Skeleton` | Loading placeholders. |

Shared helpers: `src/lib/artwork-stage.ts` holds the artwork stages (label + badge tone) and `formatPrice()`, which formats prices in the artwork's own currency.

Note: there is no class-merging helper, so passing a class that conflicts with a component's own (e.g. `px-0` on a Button) may not win. Use a size or variant prop, or wrap the component.

```tsx
import { Button, Card, Field, Input, PageHeader } from "@/components/ui";

<PageHeader
  title="Your artworks"
  description="24 works · 17 available"
  actions={<Button variant="primary">Add artwork</Button>}
/>

<Field label="Price" hint="In euros">
  {(p) => <Input {...p} value={price} onChange={(e) => setPrice(e.target.value)} />}
</Field>
```

## Migration status

Existing pages still use the legacy styles (`globals.css` classes, `bg-paper`, inline styles, Darker Grotesque for body text). They move over page by page:

1. Foundation: tokens, fonts, Tailwind mapping, component kit, reference page
2. App shell: dashboard nav, dropdowns, page header, new page color
3. Artworks: list and detail (done), then forms and passport
4. Business pages: sales, clients, contracts, exhibitions, calendar, tasks
5. Public pages: landing, explore, profile, passport, login, register
6. Cleanup: remove legacy globals and the font override, add a lint guard
