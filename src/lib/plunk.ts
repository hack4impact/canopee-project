import Plunk from '@plunk/node'

type PlunkClient = {
  emails: {
    send: (payload: {
      to: string
      subject: string
      body: string
    }) => Promise<unknown>
  }
}

function getPlunkClient(): PlunkClient | null {
  const apiKey = process.env.PLUNK_API_KEY

  if (!apiKey) {
    console.error('PLUNK_API_KEY is not set; skipping Plunk email send.')
    return null
  }

  return new Plunk(apiKey)
}

async function sendEmail(email: string, subject: string, body: string) {
  try {
    const plunk = getPlunkClient()

    if (!plunk) {
      return
    }

    await plunk.emails.send({ to: email, subject, body })
  } catch (error) {
    console.error('Plunk email send failed:', error)
  }
}

export async function sendApprovalEmail(email: string) {
  await sendEmail(
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
  await sendEmail(
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
