import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

const connectionString = process.env.DATABASE_URL

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>

let dbInstance: DrizzleDb | null = null

function getDb(): DrizzleDb {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }

  if (!dbInstance) {
    const client = postgres(connectionString, { prepare: false })
    dbInstance = drizzle(client, { schema })
  }

  return dbInstance
}

export const db = new Proxy({} as DrizzleDb, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop)
  },
})
export * from './schema'
