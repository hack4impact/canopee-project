export function PrivacyPolicyContent() {
  return (
    <div className="flex flex-col gap-8 text-sm leading-relaxed text-canopee-forest/80">
      <p className="text-sm text-canopee-forest/70">
        Dernière mise à jour : 18 septembre 2026
      </p>

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
            description, la localisation et les photos ajoutées. Avis important
            : pour protéger la vie privée d’autrui, nous vous demandons de ne
            pas inclure de visages ou de plaques d’immatriculation lisibles sur
            vos photos.
          </li>
          <li>
            <span className="font-medium text-canopee-forest">
              Patrouilles :
            </span>{' '}
            lorsque vous démarrez une patrouille dans l’application mobile, nous
            enregistrons le tracé GPS de votre parcours, sa durée et sa
            distance. L’enregistrement se poursuit en arrière-plan, écran
            verrouillé, jusqu’à ce que vous arrêtiez la patrouille, et
            l’application lit votre podomètre afin de distinguer une véritable
            marche d’une dérive du signal GPS. Aucune position n’est enregistrée
            en dehors d’une patrouille que vous avez démarrée vous-même.
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
          services qui en ont besoin pour exploiter la plateforme et traiter les
          signalements.
        </p>

        <p>
          Certains fournisseurs traitent ou hébergent des renseignements pour
          notre compte, notamment Supabase (authentification, base de données et
          stockage des photos), Plunk (envoi des courriels transactionnels),
          Mapbox (affichage des cartes et géocodage) et Vercel (hébergement de
          la plateforme). Ces fournisseurs peuvent héberger vos renseignements à
          l’extérieur du Québec; voir la politique générale de Canopée
          ci-dessous pour les modalités applicables à un tel transfert.
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
            compte demeure actif.
          </li>
          <li>
            <span className="font-medium text-canopee-forest">
              Données de signalement :
            </span>{' '}
            les renseignements associés à un signalement sont conservés le temps
            nécessaire au traitement du dossier.
          </li>
          <li>
            <span className="font-medium text-canopee-forest">
              Données de patrouille :
            </span>{' '}
            les tracés de patrouille sont conservés tant que le compte demeure
            actif et sont supprimés avec celui-ci.
          </li>
        </ul>

        <p>
          À la fin de ces périodes, les renseignements sont supprimés
          définitivement ou anonymisés de manière sécuritaire.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-canopee-forest">
          6. Témoins et technologies similaires
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
          7. Vos droits
        </h2>

        <p>
          Vos droits à l’égard de vos renseignements personnels (accès,
          rectification, suppression, retrait du consentement, plainte auprès
          d’une autorité de contrôle, etc.) sont décrits dans la politique
          générale de Canopée ci-dessous. Notez que le retrait de votre
          consentement pourrait empêcher l’utilisation de certaines
          fonctionnalités nécessitant vos renseignements, comme la création d’un
          compte ou le suivi d’un signalement.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-canopee-forest">
          8. Responsable de la protection des renseignements personnels
        </h2>

        <p>
          Pour exercer vos droits ou poser une question concernant cette
          politique, vous pouvez communiquer avec notre responsable :
        </p>

        <address className="not-italic">
          <p>Sandrine Gaudelet</p>
          <p>Directrice générale</p>
          <p>
            Courriel :{' '}
            <a
              href="mailto:direction@reseaucanopee.org"
              className="font-medium underline underline-offset-2"
            >
              direction@reseaucanopee.org
            </a>
          </p>
          <p>Téléphone : 438 923-0582 poste 6-1</p>

          <p className="mt-3">Sophie Léger</p>
          <p>Agente vie associative et bénévolat</p>
          <p>
            Courriel :{' '}
            <a
              href="mailto:vie.associative@reseaucanopee.org"
              className="font-medium underline underline-offset-2"
            >
              vie.associative@reseaucanopee.org
            </a>
          </p>
          <p>Téléphone : 438 923-0582 poste 4-1</p>
        </address>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-canopee-forest">
          9. Politique de confidentialité générale de Canopée
        </h2>

        <p>
          Pour consulter la politique de confidentialité générale de Canopée,
          veuillez consulter :{' '}
          <a
            href="https://www.reseaucanopee.org/fr/politique-confidentialite/"
            className="font-medium underline underline-offset-2"
          >
            https://www.reseaucanopee.org/fr/politique-confidentialite/
          </a>
          .
        </p>
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
  )
}
