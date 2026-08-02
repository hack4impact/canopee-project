import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL

function createDb() {
  if (!connectionString) {
    return null
  }

  return postgres(connectionString, { prepare: false })
}

export const db = drizzle((createDb() ?? ({} as never)) as never, { schema })
export * from './schema'
