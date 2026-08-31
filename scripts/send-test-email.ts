import 'dotenv/config'
import { sendReportResolvedEmail } from '../src/lib/plunk'

const email = process.argv[2]

if (!email) {
  console.error('Usage: npm run email:test -- destinataire@example.com')
  process.exit(1)
}

if (!process.env.PLUNK_API_KEY) {
  console.error('PLUNK_API_KEY is not set in .env')
  process.exit(1)
}

async function main() {
  const now = new Date()
  const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)

  const sent = await sendReportResolvedEmail(email, {
    eventNumber: 42,
    category: 'fallen_tree',
    createdAt: fiveDaysAgo,
    resolvedAt: now,
  })

  if (!sent) {
    console.error(`Could not send to ${email}, see the error above.`)
    process.exit(1)
  }

  console.log(`Sent to ${email}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
