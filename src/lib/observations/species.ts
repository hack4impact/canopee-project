import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const speciesTsv = readFileSync(
  join(process.cwd(), 'src/lib/observations/species.tsv'),
  'utf8',
)

export type SpeciesMetadata = {
  scientificName: string
  commonName: string
  provincialStatus: string
}

const speciesByScientificName = new Map<string, SpeciesMetadata>()
const speciesByCommonName = new Map<string, SpeciesMetadata>()

for (const line of speciesTsv.split(/\r?\n/).slice(1)) {
  const columns = line.split('\t').map((column) => column.trim())
  const scientificName = columns[2] ?? ''
  const commonName = columns[3] ?? ''
  const provincialStatus = columns[4] ?? ''

  if (!scientificName || !commonName || !provincialStatus) continue

  const metadata = { scientificName, commonName, provincialStatus }
  speciesByScientificName.set(scientificName.toLocaleLowerCase(), metadata)
  speciesByCommonName.set(commonName.toLocaleLowerCase(), metadata)
}

export function speciesMetadata(
  species: string | null,
): SpeciesMetadata | null {
  const normalized = species?.trim().toLocaleLowerCase()
  if (!normalized) return null

  return (
    speciesByScientificName.get(normalized) ??
    speciesByCommonName.get(normalized) ??
    null
  )
}
