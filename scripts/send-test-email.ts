import 'dotenv/config'
import {
  sendApprovalEmail,
  sendRejectionEmail,
  sendReportResolvedEmail,
} from '../src/lib/plunk'

const [email, scenario] = process.argv.slice(2)

const SCENARIOS = ['approval', 'rejection', 'report-resolved'] as const
type Scenario = (typeof SCENARIOS)[number]

if (!email) {
  console.error(
    'Usage: npm run email:test -- destinataire@example.com [approval|rejection|report-resolved]',
  )
  process.exit(1)
}

if (scenario && !SCENARIOS.includes(scenario as Scenario)) {
  console.error(
    `Unknown scenario "${scenario}". Expected one of: ${SCENARIOS.join(', ')}`,
  )
  process.exit(1)
}

if (!process.env.PLUNK_API_KEY) {
  console.error('PLUNK_API_KEY is not set in .env')
  process.exit(1)
}

const senders: Record<Scenario, () => Promise<boolean>> = {
  approval: () => sendApprovalEmail(email),
  rejection: () => sendRejectionEmail(email),
  'report-resolved': () => {
    const now = new Date()
    const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)

    return sendReportResolvedEmail(email, {
      eventNumber: 42,
      category: 'fallen_tree',
      createdAt: fiveDaysAgo,
      resolvedAt: now,
    })
  },
}

async function main() {
  const scenariosToRun = scenario ? [scenario as Scenario] : SCENARIOS
  const results: { scenario: Scenario; sent: boolean }[] = []

  for (const s of scenariosToRun) {
    const sent = await senders[s]()
    results.push({ scenario: s, sent })
    console.log(`[${sent ? 'OK' : 'FAILED'}] ${s} -> ${email}`)
  }

  if (results.some((r) => !r.sent)) {
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
