import type { Metadata, Viewport } from 'next'
import { CitizenReport } from './citizen-report'

export const metadata: Metadata = {
  title: 'Signaler | Canopée',
  description: 'Signalez un problème observé dans les bois de Laval.',
}

export const viewport: Viewport = {
  themeColor: '#004523',
}

export default function CitizenReportPage() {
  return <CitizenReport />
}
