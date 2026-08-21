# shadcn/ui components in Canopée

The goal here was to work out which shadcn/ui components the app needs, and
then give each one the Canopée look.

## Where we started

Canopée runs on Next.js 16, Tailwind v4 and React 19. It had no component
library at all. Every button, every field and every status pill was written by
hand, with the same long list of Tailwind classes copied from one file to the
next.

The colours are already defined in globals.css:

| Name               | Value   |
| ------------------ | ------- |
| canopee-forest     | #004523 |
| canopee-green      | #17aa55 |
| canopee-cream      | #f6f4df |
| canopee-coral      | #f06053 |
| canopee-coral-dark | #c53f31 |
| canopee-sky        | #77d0ec |
| canopee-sky-dark   | #3f9bc0 |
| canopee-lime       | #c7de35 |

There are two fonts. Museo Sans is used for body text and Averia Serif Libre
for headings.

## The components we keep

| Component | File                           | What it is for                                | Variants                                                               |
| --------- | ------------------------------ | --------------------------------------------- | ---------------------------------------------------------------------- |
| Button    | src/components/ui/button.tsx   | Login, signup and report forms, map controls  | default, secondary, destructive, outline, ghost, link, plus icon sizes |
| Input     | src/components/ui/input.tsx    | Email, password and rejection reason fields   | none                                                                   |
| Textarea  | src/components/ui/textarea.tsx | The description of a report                   | none                                                                   |
| Label     | src/components/ui/label.tsx    | Every form                                    | none                                                                   |
| Select    | src/components/ui/select.tsx   | The category of a report                      | none                                                                   |
| Badge     | src/components/ui/badge.tsx    | The status of a report, open or resolved      | destructive, success, default, secondary, outline                      |
| Dialog    | src/components/ui/dialog.tsx   | The photo lightbox, confirmation modals later | none                                                                   |

So far only Button and Dialog are actually wired into a page, in the report
form. The others are ready to use, but the pages that need them still have
their own hand-written markup. Swapping them over is the next step.

## Colour variables

shadcn/ui reads its colours from a set of variables. We point them at the
Canopée palette in src/app/globals.css. The app only uses light mode for now.

| Variable                                   | Value                                | What it is for                 |
| ------------------------------------------ | ------------------------------------ | ------------------------------ |
| --background                               | #f6f4df, our cream                   | The page background            |
| --foreground                               | #004523, our forest green            | Normal text                    |
| --primary and --primary-foreground         | #17aa55 and #ffffff                  | Primary buttons                |
| --secondary and --secondary-foreground     | #ffffff and #004523                  | Secondary buttons              |
| --destructive and --destructive-foreground | #f06053 and #ffffff                  | Anything that deletes or stops |
| --muted and --muted-foreground             | #e9e6cd and #5f7567                  | Quieter areas of a page        |
| --accent and --accent-foreground           | #e8f6ee and #004523                  | Hover on lists and menus       |
| --border and --input                       | #b9e5cc, which is green at 30%       | Borders around fields          |
| --ring                                     | #17aa55                              | The ring shown on focus        |
| --card and --popover                       | #ffffff                              | Cards and menus                |
| --radius                                   | 0.625rem                             | How round the corners are      |
| --chart-*                                  | green, coral, sky-dark, lime, forest | Charts, if we add some         |

## How each one looks

### Button

The primary button is green with white bold text, and it turns forest green
when you hover it. The secondary button is white with a thin green border and
forest green text. The destructive button is coral and goes a darker coral on
hover.

The default size is 40 pixels tall. There is also an extra small, a small and
a large one, plus four square icon sizes for round buttons like the map
controls. A button shrinks a little while you press it and shows a green ring
when it has focus. If the person has asked their system for less motion, we
skip the animation.

### Forms

Fields are white, with the same thin green border and forest green text. When
you click into one, the border and the ring turn green.

Text inside a field stays at its normal size on small screens. iOS zooms in on
anything smaller, and patrollers work from their phones, so that would be
annoying. Labels are small, a bit bolder than normal text, and forest green.

The select box takes the full width and looks just like an input. It is meant
to replace the plain browser select in the report form, which still uses the
native one for now.

### Badge

A report that is still open shows En attente, in dark coral on a pale coral
background. A report that is done shows Résolu, in forest green on a pale green
background. Both are pills with small bold text. They look the same as the
pills we already show in the patrol summary.

### Dialog and the photo lightbox

Modals sit on a black overlay at 60% opacity. The photo lightbox is darker, at
85%, so the photo stands out.

By default the content of a dialog is a white card with rounded corners. The
lightbox replaces that with a full screen view. The photo sits in the middle,
never taller than 85% of the screen, with a close button in the top right
corner. It closes when you press Escape or click outside the photo. All the
labels are in French.

## Map controls

shadcn has nothing for map controls, so the plan is to build them out of
Button. They use one of the icon sizes and are fully round, with a drop shadow,
a faint white ring, and they lift up slightly when you hover them. That is the
recipe the patrol controls already use today, written by hand.

Green starts a patrol, light blue pauses it and coral stops it. The bars behind
them, meaning the control bar and the bottom nav, use forest green at 80%
opacity with a blur behind it.

## Examples

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
