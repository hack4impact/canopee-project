import type { Metadata } from 'next'
import { PrivacyPolicyContent } from '@/components/privacy-policy-content'

export const metadata: Metadata = {
  title: 'Politique de confidentialité | Canopée',
}

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto flex min-h-full max-w-2xl flex-col gap-8 px-6 py-16 font-sans text-canopee-forest">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Politique de confidentialité
        </h1>
      </header>

      <PrivacyPolicyContent />
    </main>
  )
}
