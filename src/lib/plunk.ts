import Plunk from '@plunk/node'
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
    `
      <p>Bonjour,</p>
      <p>Votre compte a été approuvé.
      Vous pouvez à présent vous connecter et enregistrer vos patrouilles.</p>
      <p>Bienvenue chez Canopée!</p>
    `,
  )
}

export async function sendRejectionEmail(email: string) {
  return sendEmail(
    email,
    'Votre demande de création de compte Canopée',
    `
      <p>Bonjour,</p>
      <p>Malheureusement, votre demande de création de compte
      n'a pas pu être approuvée.</p>
      <p>Veuillez nous contacter pour plus d'informations.</p>
    `,
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
  const photo = report.photoUrl
    ? `<p><img src="${report.photoUrl}" alt="Photo du signalement" width="400" /></p>`
    : ''

  return sendEmail(
    email,
    `Votre signalement ${eventNumber} a été résolu`,
    `
      <p>Bonjour,</p>
      <p>Le signalement que vous nous avez transmis a été traité.</p>
      <p>
        <strong>Numéro d'événement :</strong> ${eventNumber}<br />
        <strong>Catégorie :</strong> ${REPORT_CATEGORY_LABELS[report.category]}<br />
        <strong>Signalé le :</strong> ${reportDateFormatter.format(report.createdAt)}<br />
        <strong>Résolu le :</strong> ${reportDateFormatter.format(report.resolvedAt)}
      </p>
      ${photo}
      <p>Merci de contribuer à la protection de nos milieux naturels.</p>
    `,
  )
}
