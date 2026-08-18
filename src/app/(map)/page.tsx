import type { Metadata } from 'next'
import { TopPanel } from '@/components/top-panel'

export const metadata: Metadata = {
  title: 'Accueil | Canopée',
  description: 'Carte de Laval et accès à vos patrouilles.',
}

export const dynamic = 'force-dynamic'

export default function AccueilPage() {
  return <TopPanel />
}
