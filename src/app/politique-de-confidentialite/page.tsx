import type { Metadata } from 'next'

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

        <p className="text-sm text-canopee-forest/70">
          Dernière mise à jour : 10 septembre 2026
        </p>
      </header>

      <div className="flex flex-col gap-8 text-sm leading-relaxed text-canopee-forest/80">
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-canopee-forest">
            1. À propos de cette politique
          </h2>

          <p>
            Canopée accorde une grande importance à la protection de vos
            renseignements personnels. Cette politique explique quels
            renseignements nous recueillons lorsque vous utilisez notre site Web
            ou notre application, pourquoi nous les recueillons et comment nous
            les protégeons.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-canopee-forest">
            2. Renseignements personnels recueillis
          </h2>

          <p>Nous pouvons recueillir les renseignements suivants :</p>

          <ul className="list-disc space-y-2 pl-6">
            <li>
              <span className="font-medium text-canopee-forest">
                Création de compte :
              </span>{' '}
              votre nom et votre adresse courriel lorsque vous créez un compte.
            </li>
            <li>
              <span className="font-medium text-canopee-forest">
                Signalement sans compte :
              </span>{' '}
              votre adresse courriel lorsque vous soumettez un signalement sans
              être connecté à un compte.
            </li>
            <li>
              <span className="font-medium text-canopee-forest">
                Contenu du signalement :
              </span>{' '}
              les renseignements que vous fournissez volontairement, comme la
              description, la localisation et les photos ajoutées. Avis
              important : pour protéger la vie privée d’autrui, nous vous
              demandons de ne pas inclure de visages ou de plaques
              d’immatriculation lisibles sur vos photos.
            </li>
            <li>
              <span className="font-medium text-canopee-forest">
                Données techniques :
              </span>{' '}
              les données nécessaires au fonctionnement et à la sécurité de la
              plateforme, comme l’adresse IP et les journaux de connexion.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-canopee-forest">
            3. Utilisation des renseignements
          </h2>

          <p>Nous utilisons vos renseignements personnels afin de :</p>

          <ul className="list-disc space-y-2 pl-6">
            <li>créer et gérer votre compte;</li>
            <li>recevoir, examiner et traiter vos signalements;</li>
            <li>vous informer du suivi de votre signalement;</li>
            <li>communiquer avec vous lorsque cela est nécessaire;</li>
            <li>
              assurer la sécurité et le bon fonctionnement de la plateforme;
            </li>
            <li>prévenir les utilisations frauduleuses ou abusives.</li>
          </ul>

          <p>
            Nous n’utiliserons pas vos renseignements personnels à d’autres fins
            sans vous en informer et obtenir votre consentement lorsque celui-ci
            est requis.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-canopee-forest">
            4. Communication à des tiers et transfert hors Québec
          </h2>

          <p>
            Vos renseignements personnels ne sont pas vendus. Ils peuvent être
            communiqués uniquement aux employés, bénévoles ou fournisseurs de
            services qui en ont besoin pour exploiter la plateforme et traiter
            les signalements.
          </p>

          <p>
            Certains fournisseurs traitent ou hébergent des renseignements pour
            notre compte, notamment Supabase (authentification, base de données
            et stockage des photos), Plunk (envoi des courriels
            transactionnels), Mapbox (affichage des cartes et géocodage) et
            Vercel (hébergement de la plateforme).
          </p>

          <p>
            <span className="font-medium text-canopee-forest">
              Transfert hors Québec :
            </span>{' '}
            ces fournisseurs peuvent héberger, stocker ou traiter vos
            renseignements personnels à l’extérieur de la province de Québec
            (notamment aux États-Unis ou dans d’autres provinces canadiennes).
            Nous effectuons une évaluation des facteurs relatifs à la vie privée
            afin de nous assurer que vos renseignements bénéficient d’une
            protection adéquate et conforme à la Loi 25.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-canopee-forest">
            5. Conservation des renseignements
          </h2>

          <p>
            Nous conservons vos renseignements uniquement pendant la période
            nécessaire aux fins décrites dans cette politique et pour respecter
            nos obligations légales.
          </p>

          <ul className="list-disc space-y-2 pl-6">
            <li>
              <span className="font-medium text-canopee-forest">
                Données de compte :
              </span>{' '}
              les renseignements associés à un compte sont conservés tant que le
              compte demeure actif, puis pendant une période de [TODO : delais]
              après sa fermeture ou son inactivité prolongée.
            </li>
            <li>
              <span className="font-medium text-canopee-forest">
                Données de signalement :
              </span>{' '}
              les renseignements associés à un signalement sont conservés
              pendant [TODO : delais] après la fermeture ou la résolution du
              dossier.
            </li>
          </ul>

          <p>
            À la fin de ces périodes, les renseignements sont supprimés
            définitivement ou anonymisés de manière sécuritaire.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-canopee-forest">
            6. Mesures de sécurité
          </h2>

          <p>
            Canopée applique des mesures de sécurité raisonnables afin de
            protéger vos renseignements contre la perte, l’accès non autorisé,
            l’utilisation abusive ou la divulgation. Toutefois, aucun système
            informatique ne peut garantir une sécurité absolue.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-canopee-forest">
            7. Témoins et technologies similaires
          </h2>

          <p>
            La plateforme peut utiliser des témoins nécessaires à son
            fonctionnement, notamment pour maintenir votre session et protéger
            votre compte. Si des témoins d’analyse ou de publicité sont
            éventuellement utilisés, votre consentement sera demandé lorsque la
            loi l’exige.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-canopee-forest">
            8. Vos droits
          </h2>

          <p>Vous pouvez notamment demander :</p>

          <ul className="list-disc space-y-2 pl-6">
            <li>l’accès à vos renseignements personnels;</li>
            <li>la correction de renseignements inexacts ou incomplets;</li>
            <li>
              le retrait de votre consentement, lorsque cela est applicable;
            </li>
            <li>
              la suppression de vos renseignements, sous réserve de nos
              obligations légales;
            </li>
            <li>
              la portabilité de certains renseignements, lorsque la loi le
              prévoit.
            </li>
          </ul>

          <p>
            Le retrait de votre consentement pourrait empêcher l’utilisation de
            certaines fonctionnalités nécessitant vos renseignements, comme la
            création d’un compte ou le suivi d’un signalement.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-canopee-forest">
            9. Responsable de la protection des renseignements personnels
          </h2>

          <p>
            Pour exercer vos droits ou poser une question concernant cette
            politique, vous pouvez communiquer avec notre responsable :
          </p>

          <address className="not-italic">
            <p>[TODO : nom de la personne responsable]</p>
            <p>[TODO : titre ou fonction]</p>
            <p>
              Courriel :{' '}
              <a
                href="mailto:[TODO: courriel du responsable]"
                className="font-medium underline underline-offset-2"
              >
                [TODO : courriel du responsable]
              </a>
            </p>
            <p>[TODO : adresse postale de Canopée]</p>
          </address>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-canopee-forest">
            10. Modification de la politique
          </h2>

          <p>
            Cette politique peut être modifiée pour refléter les changements
            apportés à nos pratiques ou à nos obligations légales. La date de la
            dernière mise à jour sera toujours indiquée au début de cette page.
          </p>
        </section>
      </div>
    </main>
  )
}
