import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

export const metadata: Metadata = {
  title: 'Carte de test | Canopée',
}

export default function CarteTestPage() {
  redirect('/carte')
}
