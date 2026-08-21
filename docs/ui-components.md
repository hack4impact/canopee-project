# shadcn/ui components - Canopée design system

> Subject: identify the shadcn/ui components used across the app and
> apply the Canopée style to each.

## Context

The Canopée app (Next.js 16 + Tailwind v4 + React 19) had no shadcn/ui
components: every button, field, and pill was hand-written with repeated
Tailwind class strings.

Canopée palette (as defined in `globals.css`):

| Token                | Value     |
| -------------------- | --------- |
| `canopee-forest`     | `#004523` |
| `canopee-green`      | `#17aa55` |
| `canopee-cream`      | `#f6f4df` |
| `canopee-coral`      | `#f06053` |
| `canopee-coral-dark` | `#c53f31` |
| `canopee-sky`        | `#77d0ec` |
| `canopee-sky-dark`   | `#3f9bc0` |
| `canopee-lime`       | `#c7de35` |

Typography: Museo Sans (body, `font-sans`) and Averia Serif Libre
(headings, `font-heading`).

## Finalized component list

| Component  | File                             | Usage in the app                                    | Canopée variants                                                                            |
| ---------- | -------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `Button`   | `src/components/ui/button.tsx`   | Form CTAs (login, signup, report), map controls     | `default` (primary), `secondary`, `destructive`, `outline`, `ghost`, `link` + `icon*` sizes |
| `Input`    | `src/components/ui/input.tsx`    | Email / password / rejection reason fields          | X                                                                                           |
| `Textarea` | `src/components/ui/textarea.tsx` | Report description                                  | X                                                                                           |
| `Label`    | `src/components/ui/label.tsx`    | Labels for all forms                                | X                                                                                           |
| `Select`   | `src/components/ui/select.tsx`   | Report category                                     | X                                                                                           |
| `Badge`    | `src/components/ui/badge.tsx`    | Report statuses: En attente (open) / Résolu         | `destructive` (open), `success` (resolved), `default`, `secondary`, `outline`               |
| `Dialog`   | `src/components/ui/dialog.tsx`   | Photo lightbox (report), future confirmation modals | X                                                                                           |

## Semantic shadcn tokens

The shadcn/ui variables in `src/app/globals.css` are mapped to the Canopée
palette (light mode, the app's default):

| shadcn variable                              | Canopée value                        | Role                                   |
| -------------------------------------------- | ------------------------------------ | -------------------------------------- |
| `--background`                               | `#f6f4df` (cream)                    | Page background                        |
| `--foreground`                               | `#004523` (forest)                   | Primary text                           |
| `--primary` / `--primary-foreground`         | `#17aa55` / `#ffffff`                | Primary buttons                        |
| `--secondary` / `--secondary-foreground`     | `#ffffff` / `#004523`                | Secondary buttons                      |
| `--destructive` / `--destructive-foreground` | `#f06053` / `#ffffff`                | Destructive actions                    |
| `--muted` / `--muted-foreground`             | `#e9e6cd` / `#5f7567`                | Muted areas                            |
| `--accent` / `--accent-foreground`           | `#e8f6ee` / `#004523`                | List / menu hover                      |
| `--border` / `--input`                       | `#b9e5cc` (30% green)                | Field borders                          |
| `--ring`                                     | `#17aa55`                            | Focus ring                             |
| `--card` / `--popover`                       | `#ffffff`                            | Cards and menus                        |
| `--radius`                                   | `0.625rem`                           | Radii (`rounded-lg` on buttons/fields) |
| `--chart-*`                                  | green, coral, sky-dark, lime, forest | Future charts                          |

## Style per component

### Button

- **Primary (`default`)**: `canopee-green` background, white **bold** text,
  `canopee-forest` hover
- **Secondary (`secondary`)**: white background, `canopee-green/30` border,
  `forest` text, `canopee-green/10` hover
- **Destructive (`destructive`)**: `canopee-coral` background, white text,
  `canopee-coral-dark` hover
- Sizes: `default` (h-10), `sm`, `lg`, `icon*` for map controls.
- Interaction: `active:scale-[0.97]`, green focus ring, respects
  `prefers-reduced-motion`.

### Forms (Input, Textarea, Label, Select)

- Fields: white background, `canopee-green/30` border, `forest` text, green
  border and ring on focus (`ring-ring/50`)
- `text-base` kept on mobile to avoid iOS zoom on focus (patrollers use
  phones)
- `Label`: `forest` text, `sm` size, `medium` weight
- `Select`: full-width trigger with the same visual treatment as `Input`
  (replaces the report form's native `<select>`)

### Badge (open / resolved statuses)

- **En attente (open)**: `variant="destructive"` -> `canopee-coral/15`
  background, `canopee-coral-dark` text.
- **Résolu (resolved)**: `variant="success"` -> `canopee-green/15` background,
  `canopee-forest` text.
- Pill shape (`rounded-4xl`), `xs` semibold text, same rendering as the
  current patrol summary pills.

### Dialog / lightbox

- Black overlay `bg-black/60` (modals); the photo lightbox passes
  `overlayClassName="bg-black/85"`.
- Content: white rounded card by default; the lightbox overrides it to
  fullscreen (centered `object-contain` image, max 85% of the viewport
  height, close button top right, closes on Escape or backdrop click).
- Accessibility strings in French ("Fermer").

### Map controls

There is no shadcn "map control" component: they are built from `Button`
(`icon*` size, `rounded-full`) with the current patrol control recipe:

- Round buttons: `rounded-full`, drop shadow, `ring-white/25`, `-translate-y-0.5`
  on hover.
- Colors: `canopee-green` (start), `canopee-sky` / `canopee-sky-dark`
  (pause), `canopee-coral` (stop), frosted glass `canopee-forest/80` for
  containers (control bar, bottom nav).

## Usage examples

```tsx
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

<Button>Envoyer le signalement</Button>
<Button variant="secondary">Choisir une photo</Button>
<Button variant="destructive">Arrêter la patrouille</Button>

<Badge variant="success">Résolu</Badge>
<Badge variant="destructive">En attente</Badge>

<Input type="email" placeholder="adresse@exemple.com" />
```
