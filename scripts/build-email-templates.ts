import * as fs from 'fs'
import * as path from 'path'
import { renderEmail } from '../src/lib/emails/template'

const LOGO = '{{ .SiteURL }}/canopee_blanc.png'
const OUT = path.join(process.cwd(), 'supabase', 'email-templates')

const TEMPLATES: Record<string, string> = {
  'confirm-signup.html': renderEmail({
    logoUrl: LOGO,
    heading: 'Confirmez votre adresse courriel',
    paragraphs: [
      'Bonjour,',
      'Un compte Canopée a été créé avec cette adresse. Confirmez-la pour terminer votre inscription.',
    ],
    button: { label: 'Confirmer mon adresse', url: '{{ .ConfirmationURL }}' },
    closing:
      "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce courriel.",
  }),
  'reset-password.html': renderEmail({
    logoUrl: LOGO,
    heading: 'Réinitialisez votre mot de passe',
    paragraphs: [
      'Bonjour,',
      'Une réinitialisation de mot de passe a été demandée pour votre compte Canopée.',
    ],
    button: {
      label: 'Choisir un nouveau mot de passe',
      url: '{{ .ConfirmationURL }}',
    },
    closing:
      "Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce courriel. Votre mot de passe restera inchangé.",
  }),
}

fs.mkdirSync(OUT, { recursive: true })

for (const [name, html] of Object.entries(TEMPLATES)) {
  fs.writeFileSync(path.join(OUT, name), html + '\n', 'utf8')
  console.log('wrote', path.join('supabase', 'email-templates', name))
}
