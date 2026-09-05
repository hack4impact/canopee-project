import type { reportCategoryEnum } from '@/db/schema'

export type ReportCategory = (typeof reportCategoryEnum.enumValues)[number]

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  dangerous_tree: 'Arbre / branche dangereux',
  fallen_tree: 'Arbre tombé',
  littering: 'Déchets',
  blocked_trail: 'Sentier entravé (végétation, neige, eau)',
  damaged_trail: 'Sentier endommagé',
  unofficial_trail: 'Sentier non officiel',
  bridge_repair: 'Passerelle à réparer / déplacer',
  damaged_infrastructure:
    'Infrastructure endommagée, à entretenir (escalier, bancs…)',
  signage_fix: 'Signalisation à corriger',
  site_maintenance: 'Site à entretenir (végétation, déchets…)',
  maintenance_other: 'Autres',

  bicycles: 'Vélos',
  motor_vehicle: 'Véhicule motorisé',
  foraging: 'Récolte, cueillette',
  off_trail: 'Hors sentier, piétinement',
  encroachment: 'Empiètement',
  unleashed_dog: 'Chien sans laisse',
  dog_waste: 'Excrémements de chien',
  campfire: 'Feux de camp',
  built_shelter: 'Abris construit',
  homeless_camp: 'Camp de personne en situation d’itinérance',
  illegal_dumping: 'Dépôt sauvage (déchets, animaux en captivité…)',
  citizen_other: 'Autres',

  reptile: 'Reptiles',
  insecte: 'Insectes',
  oiseau: 'Oiseaux',
  amphibien: 'Amphibiens',
  mammifere: 'Mammifères',
  invertebre: 'Invertébrés',
  mollusque: 'Mollusques',
  poisson: 'Poissons',
  plante_vasculaire: 'Plantes vasculaires',
  bryophyte: 'Bryophytes',
  faune_flore_other: 'Autres',
}

export const REPORT_CATEGORIES = Object.keys(
  REPORT_CATEGORY_LABELS,
) as ReportCategory[]

/** The 3 large entry buttons of the reporting screen */
export const REPORT_GROUPS = ['entretien', 'citoyen', 'faune_flore'] as const

export type ReportGroup = (typeof REPORT_GROUPS)[number]

export const REPORT_GROUP_LABELS: Record<ReportGroup, string> = {
  entretien: 'Entretien',
  citoyen: 'Intervention',
  faune_flore: 'Faune / flore',
}

/** Sub-categories selectable within each entry group. */
export const REPORT_GROUP_CATEGORIES: Record<
  ReportGroup,
  readonly ReportCategory[]
> = {
  entretien: [
    'dangerous_tree',
    'fallen_tree',
    'littering',
    'blocked_trail',
    'damaged_trail',
    'unofficial_trail',
    'bridge_repair',
    'damaged_infrastructure',
    'signage_fix',
    'site_maintenance',
    'maintenance_other',
  ],
  citoyen: [
    'bicycles',
    'motor_vehicle',
    'foraging',
    'off_trail',
    'encroachment',
    'unleashed_dog',
    'dog_waste',
    'campfire',
    'built_shelter',
    'homeless_camp',
    'illegal_dumping',
    'citizen_other',
  ],
  faune_flore: [
    'reptile',
    'insecte',
    'oiseau',
    'amphibien',
    'mammifere',
    'invertebre',
    'mollusque',
    'poisson',
    'plante_vasculaire',
    'bryophyte',
    'faune_flore_other',
  ],
}

export const REPORT_FAUNE_CATEGORIES = [
  'oiseau',
  'mammifere',
  'reptile',
  'amphibien',
  'poisson',
  'insecte',
  'invertebre',
  'mollusque',
] as const satisfies readonly ReportCategory[]

export const REPORT_FLORE_CATEGORIES = [
  'plante_vasculaire',
  'bryophyte',
] as const satisfies readonly ReportCategory[]

export function isReportCategory(value: unknown): value is ReportCategory {
  return (
    typeof value === 'string' && Object.hasOwn(REPORT_CATEGORY_LABELS, value)
  )
}

export function isReportGroup(value: unknown): value is ReportGroup {
  return (
    typeof value === 'string' &&
    (REPORT_GROUPS as readonly string[]).includes(value)
  )
}

export function reportGroupOfCategory(category: ReportCategory): ReportGroup {
  for (const group of REPORT_GROUPS) {
    if (REPORT_GROUP_CATEGORIES[group].includes(category)) {
      return group
    }
  }

  return 'entretien'
}

export const REPORT_TYPOLOGIES = [
  'probleme_observe',
  'debut_correction',
  'probleme_corrige',
  'intervention_urgente',
] as const

export type ReportTypology = (typeof REPORT_TYPOLOGIES)[number]

export const REPORT_TYPOLOGY_LABELS: Record<ReportTypology, string> = {
  probleme_observe: 'Problème observé',
  debut_correction: 'Début de correction',
  probleme_corrige: 'Problème corrigé',
  intervention_urgente: 'Intervention urgente',
}

export function isReportTypology(value: unknown): value is ReportTypology {
  return (
    typeof value === 'string' &&
    (REPORT_TYPOLOGIES as readonly string[]).includes(value)
  )
}

export const FAUNE_FLORE_STATUTS = [
  { value: 'menace', label: 'Menacé' },
  { value: 'susceptible', label: 'Susceptible' },
  { value: 'vulnerable', label: 'Vulnérable' },
  { value: 'candidate', label: 'Candidate' },
  { value: 'non_menacee', label: 'Non menacée' },
  {
    value: 'exotique_envahissante',
    label: 'Espèce exotique envahissante',
  },
] as const

export type FauneFloreStatut = (typeof FAUNE_FLORE_STATUTS)[number]['value']

/** 👇 Déprécié — conservé pour la rétrocompatibilité avec l'ancien schema de validation */
export const FAUNE_SUBCATEGORIES = [
  { value: 'reptile', label: 'Reptile' },
  { value: 'amphibien', label: 'Amphibien' },
  { value: 'insecte', label: 'Insecte' },
  { value: 'mammifere', label: 'Mammifère' },
  { value: 'oiseau', label: 'Oiseau' },
  { value: 'autre', label: 'Autre' },
] as const

/** 👇 Déprécié — conservé pour la rétrocompatibilité */
export const FLORE_SUBCATEGORIES = [
  {
    value: 'exotique_envahissante',
    label: 'Espèce exotique envahissante',
  },
  {
    value: 'menacee_vulnerable',
    label: 'Espèce menacée, vulnérable',
  },
] as const

export type FauneSubcategory = (typeof FAUNE_SUBCATEGORIES)[number]['value']
export type FloreSubcategory = (typeof FLORE_SUBCATEGORIES)[number]['value']

export const REPORT_UNITS = ['individus', 'nids'] as const

export type ReportUnit = (typeof REPORT_UNITS)[number]
