import type { Metadata } from 'next'
import Link from 'next/link'
import { LOGIN_ROUTE } from '@/lib/auth/routes'

export const metadata: Metadata = {
  title: 'Supprimer votre compte | Canopée',
}

const LINK = 'font-medium underline underline-offset-2'

const EMPHASIS = 'font-medium text-canopee-forest'

export default function AccountDeletionPage() {
  return (
    <main className="mx-auto flex min-h-full max-w-2xl flex-col gap-8 px-6 py-16 font-sans text-canopee-forest">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Supprimer votre compte
        </h1>
      </header>

      <div className="flex flex-col gap-8 text-sm leading-relaxed text-canopee-forest/80">
        <p>
          Cette page explique comment supprimer votre compte de l’application
          Canopée, publiée par Réseau Canopée, ainsi que les données qui y sont
          associées.
        </p>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-canopee-forest">
            Depuis l’application ou le site Web
          </h2>

          <ol className="list-decimal space-y-2 pl-6">
            <li>
              Connectez-vous à l’application Canopée ou à{' '}
              <Link href={LOGIN_ROUTE} className={LINK}>
                app.reseaucanopee.org
              </Link>
              .
            </li>
            <li>
              Ouvrez l’onglet <span className={EMPHASIS}>Profil</span>.
            </li>
            <li>
              Touchez <span className={EMPHASIS}>Supprimer mon compte</span>.
            </li>
            <li>
              Saisissez <span className={EMPHASIS}>SUPPRIMER</span>, puis
              touchez <span className={EMPHASIS}>Supprimer définitivement</span>
              .
            </li>
          </ol>

          <p>
            Si votre compte est encore en attente d’approbation, le bouton{' '}
            <span className={EMPHASIS}>Supprimer mon compte</span> se trouve
            directement sur l’écran d’attente. La suppression est immédiate et
            ne peut pas être annulée.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-canopee-forest">
            Sans accès à votre compte
          </h2>

          <p>
            Écrivez à{' '}
            <a href="mailto:direction@reseaucanopee.org" className={LINK}>
              direction@reseaucanopee.org
            </a>{' '}
            à partir de l’adresse courriel associée à votre compte pour demander
            sa suppression. Nous traitons votre demande dans un délai de 30
            jours.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-canopee-forest">
            Données supprimées et conservées
          </h2>

          <ul className="list-disc space-y-2 pl-6">
            <li>
              <span className={EMPHASIS}>Supprimées définitivement :</span>{' '}
              votre compte, votre nom, votre adresse courriel et vos
              identifiants de connexion, ainsi que vos patrouilles et leurs
              tracés GPS.
            </li>
            <li>
              <span className={EMPHASIS}>Conservées sans lien avec vous :</span>{' '}
              vos signalements, y compris leur description, leur localisation et
              leurs photos. Ils ne sont plus associés à votre compte ni à votre
              adresse courriel, et sont conservés le temps nécessaire au
              traitement du dossier, comme le prévoit notre{' '}
              <Link href="/politique-de-confidentialite" className={LINK}>
                politique de confidentialité
              </Link>
              .
            </li>
          </ul>
        </section>
      </div>
    </main>
  )
}
