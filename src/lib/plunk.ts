import Plunk from '@plunk/node'
import { renderEmail } from '@/lib/emails/template'
import {
  REPORT_CATEGORY_LABELS,
  type ReportCategory,
} from '@/lib/reports/categories'
import { formatEventNumber } from '@/lib/reports/format'

type PlunkClient = {
  emails: {
    send: (payload: {
      to: string
      subject: string
      body: string
      from?: string
      name?: string
    }) => Promise<unknown>
  }
}

function getPlunkClient(): PlunkClient | null {
  const apiKey = process.env.PLUNK_API_KEY

  if (!apiKey) {
    console.error('PLUNK_API_KEY is not set; skipping Plunk email send.')
    return null
  }

  return new Plunk(apiKey, {
    ...(process.env.PLUNK_API_URL && { baseUrl: process.env.PLUNK_API_URL }),
  })
}

async function sendEmail(
  email: string,
  subject: string,
  body: string,
): Promise<boolean> {
  try {
    const plunk = getPlunkClient()

    if (!plunk) {
      return false
    }

    await plunk.emails.send({
      to: email,
      subject,
      body,
      ...(process.env.PLUNK_FROM_EMAIL && {
        from: process.env.PLUNK_FROM_EMAIL,
      }),
      ...(process.env.PLUNK_FROM_NAME && { name: process.env.PLUNK_FROM_NAME }),
    })

    return true
  } catch (error) {
    console.error('Plunk email send failed:', error)
    return false
  }
}

export async function sendApprovalEmail(email: string) {
  return sendEmail(
    email,
    'Votre compte Canopée a été approuvé',
    renderEmail({
      heading: 'Votre compte a été approuvé',
      paragraphs: [
        'Bonjour,',
        'Votre compte a été approuvé. Vous pouvez à présent vous connecter et enregistrer vos patrouilles.',
      ],
      closing: 'Bienvenue chez Canopée!',
    }),
  )
}

export async function sendRejectionEmail(email: string) {
  return sendEmail(
    email,
    'Votre demande de création de compte Canopée',
    renderEmail({
      heading: 'Votre demande de création de compte',
      paragraphs: [
        'Bonjour,',
        "Malheureusement, votre demande de création de compte n'a pas pu être approuvée.",
      ],
      closing: "Veuillez nous contacter pour plus d'informations.",
    }),
  )
}

const reportDateFormatter = new Intl.DateTimeFormat('fr-CA', {
  dateStyle: 'long',
  timeZone: 'America/Toronto',
})

export type ResolvedReportEmail = {
  eventNumber: number
  category: ReportCategory
  createdAt: Date
  resolvedAt: Date
  photoUrl?: string | null
}

export async function sendReportResolvedEmail(
  email: string,
  report: ResolvedReportEmail,
) {
  const eventNumber = formatEventNumber(report.eventNumber)

  return sendEmail(
    email,
    `Votre signalement ${eventNumber} a été résolu`,
    renderEmail({
      heading: 'Votre signalement a été résolu',
      paragraphs: [
        'Bonjour,',
        'Le signalement que vous nous avez transmis a été traité.',
      ],
      details: [
        { label: "Numéro d'événement", value: eventNumber, highlight: true },
        {
          label: 'Catégorie',
          value: REPORT_CATEGORY_LABELS[report.category],
        },
        {
          label: 'Signalé le',
          value: reportDateFormatter.format(report.createdAt),
        },
        {
          label: 'Résolu le',
          value: reportDateFormatter.format(report.resolvedAt),
          highlight: true,
        },
      ],
      photoUrl: report.photoUrl,
      closing: 'Merci de contribuer à la protection de nos milieux naturels.',
    }),
  )
}
