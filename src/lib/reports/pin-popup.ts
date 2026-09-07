import {
  REPORT_CATEGORY_LABELS,
  REPORT_GROUP_LABELS,
  type ReportCategory,
  type ReportGroup,
} from '@/lib/reports/categories'
import { formatEventNumber, formatPinDate } from '@/lib/reports/format'
import {
  REPORT_GROUP_COLORS,
  REPORT_GROUP_ICON_PATHS,
} from '@/lib/reports/group-style'

export type PinPopupProperties = {
  id: string
  eventNumber: number
  category: ReportCategory
  group: ReportGroup
  hasPhoto: boolean
  createdAt: string
  resolved: boolean
  species?: string | null
}

export function prefersHover(): boolean {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

const SVG_NS = 'http://www.w3.org/2000/svg'

const CHECK_PATH = 'M20 6 9 17l-5-5'

function iconSvg(paths: readonly string[], className: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg')

  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('fill', 'none')
  svg.setAttribute('stroke', 'currentColor')
  svg.setAttribute('stroke-width', '2.4')
  svg.setAttribute('stroke-linecap', 'round')
  svg.setAttribute('stroke-linejoin', 'round')
  svg.setAttribute('aria-hidden', 'true')
  svg.setAttribute('class', className)

  for (const d of paths) {
    const path = document.createElementNS(SVG_NS, 'path')

    path.setAttribute('d', d)
    svg.append(path)
  }

  return svg
}

function statusBadge(resolved: boolean): HTMLElement {
  const badge = document.createElement('span')

  badge.className =
    'ml-auto inline-flex items-center gap-1.5 rounded bg-white/25 px-1.5 py-0.5 text-[11px] font-bold'

  if (resolved) {
    badge.append(
      iconSvg([CHECK_PATH], 'size-3 shrink-0'),
      document.createTextNode('Résolu'),
    )

    return badge
  }

  badge.append(document.createTextNode('Ouvert'))

  return badge
}

async function fillPhoto(frame: HTMLElement, id: string): Promise<void> {
  try {
    const response = await fetch(`/api/reports/${id}/photo`, {
      redirect: 'manual',
    })

    if (!response.ok) {
      throw new Error(
        `Photo request failed (${response.status}): ${await response.text()}`,
      )
    }

    const { url } = (await response.json()) as { url: string }
    const image = new Image()

    image.alt = ''
    image.className = 'h-full w-full object-cover'
    image.src = url

    await image.decode()

    frame.classList.remove('photo-skeleton')
    frame.replaceChildren(image)
  } catch (cause) {
    console.warn('Unable to load the report photo', cause)

    const failed = document.createElement('p')

    failed.className =
      'flex h-full items-center justify-center text-xs text-canopee-forest/50'
    failed.textContent = 'Photo indisponible'
    frame.classList.remove('photo-skeleton')
    frame.replaceChildren(failed)
  }
}

function photoFrame(id: string): HTMLElement {
  const frame = document.createElement('div')

  frame.className = 'photo-skeleton h-29 w-full'
  void fillPhoto(frame, id)

  return frame
}

const CHEVRON_PATH = 'm9 18 6-6-6-6'

export function pinPopupContent(
  properties: PinPopupProperties,
  onOpen: ((id: string) => void) | null,
): HTMLElement {
  const root = document.createElement('div')
  root.className = 'flex w-66 flex-col'

  const band = document.createElement('div')

  band.className =
    'flex items-center gap-2 px-3 py-2 text-xs font-bold tracking-[0.06em] text-white uppercase'
  band.style.backgroundColor = REPORT_GROUP_COLORS[properties.group]
  band.append(
    iconSvg(REPORT_GROUP_ICON_PATHS[properties.group], 'size-4 shrink-0'),
    document.createTextNode(REPORT_GROUP_LABELS[properties.group]),
    statusBadge(properties.resolved),
  )

  const body = document.createElement(onOpen ? 'a' : 'div')
  body.className = onOpen
    ? 'flex items-center gap-2 px-3.5 py-3 no-underline transition-colors hover:bg-canopee-forest/5'
    : 'flex flex-col gap-1.5 px-3.5 py-3'

  const text = document.createElement('span')
  text.className = 'flex min-w-0 flex-1 flex-col gap-1.5'

  const category = document.createElement('p')
  category.className =
    'font-heading text-[0.95rem] leading-tight font-bold text-canopee-forest'
  category.textContent =
    REPORT_CATEGORY_LABELS[properties.category] ?? properties.category

  const meta = document.createElement('p')
  meta.className = 'text-xs text-canopee-forest/65'
  meta.textContent = [
    formatPinDate(properties.createdAt),
    formatEventNumber(Number(properties.eventNumber)),
  ]
    .filter(Boolean)
    .join(' · ')

  text.append(category)

  if (properties.species) {
    const species = document.createElement('p')

    species.className = 'text-xs text-canopee-forest/75 italic'
    species.textContent = properties.species
    text.append(species)
  }

  text.append(meta)
  body.append(text)

  if (onOpen) {
    const anchor = body as HTMLAnchorElement

    anchor.href = `/admin/issues/${properties.id}`
    anchor.append(
      iconSvg([CHEVRON_PATH], 'size-4 shrink-0 text-canopee-forest/40'),
    )
    anchor.addEventListener('click', (event) => {
      event.preventDefault()
      onOpen(properties.id)
    })
  }

  root.append(band)

  if (properties.hasPhoto) {
    root.append(photoFrame(properties.id))
  }

  root.append(body)

  return root
}
