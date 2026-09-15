// scripts/start-db.js
// Starts an embedded PostgreSQL instance for local development.
// Run this in a separate terminal FIRST, then run `npm run dev`.

const EmbeddedPostgres = require('embedded-postgres').default
const { execSync } = require('child_process')
const path = require('path')
const fs = require('fs')

const DB_DIR = path.join(__dirname, '..', '.pgdata')
const PORT = 5432
const USER = 'postgres'
const PASSWORD = 'password'
const DATABASE = 'reachflow'

const DB_URL = `postgresql://${USER}:${PASSWORD}@localhost:${PORT}/${DATABASE}`
// Use the real Prisma entry point (works on Windows without .cmd/.ps1 issues)
const PRISMA_BIN = path.join(__dirname, '..', 'node_modules', 'prisma', 'build', 'index.js')

async function main() {
  console.log('🐘 Starting embedded PostgreSQL...')

  // Check if already initialized (directory has PG_VERSION file)
  const isInitialized = fs.existsSync(path.join(DB_DIR, 'PG_VERSION'))

  const pg = new EmbeddedPostgres({
    databaseDir: DB_DIR,
    port: PORT,
    user: USER,
    password: PASSWORD,
    persistent: true,
  })

  try {
    if (!isInitialized) {
      console.log('📦 Initializing database cluster for the first time...')
      await pg.initialise()
    } else {
      console.log('♻️  Existing database cluster found, skipping init.')
    }

    await pg.start()

    // Create the application database if it doesn't exist yet
    try {
      await pg.createDatabase(DATABASE)
      console.log(`✅ Database "${DATABASE}" created.`)
    } catch (e) {
      if (String(e).includes('already exists')) {
        console.log(`ℹ️  Database "${DATABASE}" already exists.`)
      } else {
        throw e
      }
    }

    console.log(`✅ PostgreSQL running on localhost:${PORT}`)
    console.log('🔄 Syncing Prisma schema...')

    try {
      execSync(`node "${PRISMA_BIN}" db push --accept-data-loss`, {
        stdio: 'inherit',
        env: { ...process.env, DATABASE_URL: DB_URL },
      })
      console.log('✅ Schema synced.')
    } catch (e) {
      console.warn('⚠️  Schema push warning:', e.message)
    }

    console.log('\n🚀 Database is ready! Run `npm run dev` in another terminal.\n')
    console.log(`   DATABASE_URL = ${DB_URL}\n`)

    // Keep running so the DB stays up while you develop
    process.on('SIGINT', async () => {
      console.log('\n🛑 Stopping PostgreSQL...')
      await pg.stop()
      process.exit(0)
    })

    process.on('SIGTERM', async () => {
      await pg.stop()
      process.exit(0)
    })

    // Keep the process alive
    setInterval(() => {}, 60_000)
  } catch (err) {
    console.error('❌ Failed to start embedded PostgreSQL:', err)
    process.exit(1)
  }
}

main()
