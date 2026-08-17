import type { Metadata } from 'next'
import { HeatmapLayer } from '@/components/heatmap-layer'

export const metadata: Metadata = {
  title: 'Carte | Canopée',
  description: 'Fréquentation des secteurs boisés de Laval.',
}

export const dynamic = 'force-dynamic'

export default function CartePage() {
  return <HeatmapLayer />
}
