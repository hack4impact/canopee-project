import * as fs from 'fs'
import * as path from 'path'
import * as readline from 'readline'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

type WizardCategory =
  | 'amphibien'
  | 'bryophyte'
  | 'insecte'
  | 'invertebre'
  | 'mammifere'
  | 'mollusque'
  | 'oiseau'
  | 'plante_vasculaire'
  | 'poisson'
  | 'reptile'

type SourceGroup =
  | 'Amphibiens'
  | 'Bryophytes'
  | 'Charophyte'
  | 'Embryophytes'
  | 'Insectes'
  | 'Invertébrés'
  | 'Mammifères'
  | 'Mollusques'
  | 'Oiseaux'
  | 'Poissons'
  | 'Reptiles'

interface RawSpecies {
  group: SourceGroup
  scientificName: string
  commonName: string
  status: string
}

interface ParsedSpecies {
  category: WizardCategory
  sourceGroup: SourceGroup
  scientificName: string
  commonName: string
  status: string
}

const CATEGORY_MAPPING: Record<string, WizardCategory> = {
  Amphibiens: 'amphibien',
  Bryophytes: 'bryophyte',
  Insectes: 'insecte',
  Invertébrés: 'invertebre',
  Mammifères: 'mammifere',
  Mollusques: 'mollusque',
  Oiseaux: 'oiseau',
  'Plantes vasculaires': 'plante_vasculaire',
  Embryophytes: 'plante_vasculaire',
  Charophyte: 'plante_vasculaire',
  Poissons: 'poisson',
  Reptiles: 'reptile',
}

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let insideQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    const nextChar = line[i + 1]

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        current += '"'
        i++
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (char === ',' && !insideQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  result.push(current.trim())
  return result
}

async function readCSV(filePath: string): Promise<RawSpecies[]> {
  const species: RawSpecies[] = []
  const fileStream = fs.createReadStream(filePath, { encoding: 'utf-8' })

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  })

  let isFirstLine = true

  for await (const line of rl) {
    if (isFirstLine) {
      isFirstLine = false
      continue
    }

    const parts = parseCSVLine(line)
    if (parts.length < 5 || !parts[0] || !(parts[0] in CATEGORY_MAPPING))
      continue

    species.push({
      group: parts[0] as SourceGroup,
      scientificName: parts[2],
      commonName: parts[3],
      status: parts[4],
    })
  }

  return species
}

function convertSpecies(raw: RawSpecies[]): ParsedSpecies[] {
  const parsed: ParsedSpecies[] = []
  const unmappedGroups = new Set<string>()

  for (const item of raw) {
    const category = CATEGORY_MAPPING[item.group]
    if (!category) {
      unmappedGroups.add(item.group)
      continue
    }

    const capitalizedCommonName =
      item.commonName.charAt(0).toUpperCase() + item.commonName.slice(1)

    parsed.push({
      category,
      sourceGroup: item.group,
      scientificName: item.scientificName,
      commonName: capitalizedCommonName,
      status: item.status,
    })
  }

  if (unmappedGroups.size > 0) {
    console.warn('Warning: Unmapped groups found:', Array.from(unmappedGroups))
  }

  return parsed
}

function generateTypeScript(species: ParsedSpecies[]): string {
  const speciesData = species
    .map(
      (s) =>
        `  {
    category: '${s.category}',
    sourceGroup: '${s.sourceGroup}',
    scientificName: '${s.scientificName.replace(/'/g, "\\'")}',
    commonName: '${s.commonName.replace(/'/g, "\\'")}',
    status: '${s.status}',
  }`,
    )
    .join(',\n')

  return `export type ReportCategory =
  | 'amphibien'
  | 'bryophyte'
  | 'insecte'
  | 'invertebre'
  | 'mammifere'
  | 'mollusque'
  | 'oiseau'
  | 'plante_vasculaire'
  | 'poisson'
  | 'reptile'

export type SpeciesSourceGroup =
  | 'Amphibiens'
  | 'Bryophytes'
  | 'Charophyte'
  | 'Embryophytes'
  | 'Insectes'
  | 'Invertébrés'
  | 'Mammifères'
  | 'Mollusques'
  | 'Oiseaux'
  | 'Poissons'
  | 'Reptiles'

export interface Species {
  category: ReportCategory
  sourceGroup: SpeciesSourceGroup
  scientificName: string
  commonName: string
  status: string
}

export const SPECIES_DATABASE: readonly Species[] = [
${speciesData}
] as const

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function getSpeciesByCategory(category: ReportCategory): Species[] {
  return SPECIES_DATABASE.filter(s => s.category === category)
}

export function searchSpecies(
  query: string,
  category?: ReportCategory,
  limit: number = 20,
): Species[] {
  if (!query.trim()) {
    return []
  }

  const normalizedQuery = normalizeText(query)
  let candidates = SPECIES_DATABASE

  if (category) {
    candidates = candidates.filter(s => s.category === category)
  }

  const results = candidates
    .map(species => {
      const normalizedCommon = normalizeText(species.commonName)
      const normalizedScientific = normalizeText(species.scientificName)

      const commonPrefixMatch = normalizedCommon.startsWith(normalizedQuery)
      const scientificPrefixMatch = normalizedScientific.startsWith(
        normalizedQuery,
      )
      const commonSubstringMatch = normalizedCommon.includes(normalizedQuery)
      const scientificSubstringMatch = normalizedScientific.includes(
        normalizedQuery,
      )

      let score = 0
      if (commonPrefixMatch) score = 4
      else if (scientificPrefixMatch) score = 3
      else if (commonSubstringMatch) score = 2
      else if (scientificSubstringMatch) score = 1
      else score = 0

      return { species, score }
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.species)

  return results
}
`
}

async function main() {
  const csvPath = path.join(
    __dirname,
    '..',
    '20260806_CanopéexHack4Impact_Signalements_Catégories - Elements ministere.csv',
  )
  const outputPath = path.join(
    __dirname,
    '..',
    'src',
    'lib',
    'reports',
    'species.ts',
  )

  console.log(`Reading CSV from: ${csvPath}`)
  const raw = await readCSV(csvPath)
  console.log(`✓ Read ${raw.length} species`)

  const parsed = convertSpecies(raw)
  console.log(`✓ Parsed and converted ${parsed.length} species`)

  const counts = parsed.reduce(
    (acc, s) => {
      acc[s.category] = (acc[s.category] || 0) + 1
      return acc
    },
    {} as Record<string, number>,
  )
  console.log('Species count by category:')
  Object.entries(counts)
    .sort()
    .forEach(([cat, count]) => console.log(`  ${cat}: ${count}`))

  const typescript = generateTypeScript(parsed)

  fs.mkdirSync(path.dirname(outputPath), { recursive: true })
  fs.writeFileSync(outputPath, typescript, 'utf-8')

  console.log(`✓ Generated TypeScript file: ${outputPath}`)
  console.log(`Total lines: ${parsed.length}`)
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
