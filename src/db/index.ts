import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

type DbInstance = ReturnType<typeof drizzle>

let dbInstance: DbInstance | undefined

type PostgresClient = ReturnType<typeof postgres>

const globalForDb = globalThis as { canopeeDbClient?: PostgresClient }

function getDbInstance(): DbInstance {
  if (dbInstance) {
    return dbInstance
  }

  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }

  const client =
    globalForDb.canopeeDbClient ??
    postgres(connectionString, {
      prepare: false,
      max: 5,
      idle_timeout: 20,
    })

  if (process.env.NODE_ENV !== 'production') {
    globalForDb.canopeeDbClient = client
  }

  dbInstance = drizzle(client, { schema })
  return dbInstance
}

export const db = new Proxy({} as DbInstance, {
  get(_target, prop, receiver) {
    const instance = getDbInstance()
    const value = Reflect.get(instance, prop, receiver)
    return typeof value === 'function' ? value.bind(instance) : value
  },
})

export function getDb() {
  return getDbInstance()
}

export * from './schema'
