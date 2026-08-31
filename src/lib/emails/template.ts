const FONT_STACK = "'Museo Sans', 'Trebuchet MS', Verdana, Arial, sans-serif"

const FOREST = '#004523'
const GREEN = '#17aa55'
const CREAM = '#f6f4df'
const CREAM_DARK = '#eae7d0'
const BODY_TEXT = '#2b3b31'
const MUTED_TEXT = '#6f7a70'

export type EmailDetail = {
  label: string
  value: string
  highlight?: boolean
}

export type EmailButton = {
  label: string
  url: string
}

export type EmailContent = {
  heading: string
  paragraphs: string[]
  details?: EmailDetail[]
  photoUrl?: string | null
  button?: EmailButton
  closing?: string
  logoUrl?: string
}

function logoUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, '')

  return base ? `${base}/canopee_blanc.png` : null
}

function renderHeader(override?: string): string {
  const logo = override ?? logoUrl()
  const inner = logo
    ? `<img src="${logo}" width="150" alt="Canopée" style="display:block;margin:0 auto;width:150px;max-width:150px;height:auto;border:0;" />`
    : `<span style="font-size:24px;font-weight:bold;letter-spacing:0.08em;color:${CREAM};">CANOPÉE</span>`

  return `
        <tr>
          <td style="background:${FOREST};padding:22px 24px;text-align:center;">${inner}</td>
        </tr>`
}

function renderDetails(details: EmailDetail[]): string {
  const rows = details
    .map(
      ({ label, value, highlight }) => `
              <tr><td style="padding:0 16px 6px;font-size:13px;color:${MUTED_TEXT};">${label}</td></tr>
              <tr><td style="padding:0 16px 12px;font-size:${highlight ? '16px' : '15px'};color:${highlight ? FOREST : BODY_TEXT};${highlight ? 'font-weight:bold;' : ''}">${value}</td></tr>`,
    )
    .join('')

  return `
        <tr>
          <td style="padding:0 24px;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#ffffff;border-radius:6px;">
              <tr><td style="height:14px;line-height:14px;font-size:0;">&nbsp;</td></tr>${rows}
              <tr><td style="height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>
            </table>
          </td>
        </tr>`
}

function renderButton({ label, url }: EmailButton): string {
  return `
        <tr>
          <td style="padding:22px 24px 0;">
            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background:${GREEN};border-radius:6px;">
                  <a href="${url}" style="display:inline-block;padding:13px 26px;font-size:15px;font-weight:bold;color:#ffffff;text-decoration:none;">${label}</a>
                </td>
              </tr>
            </table>
          </td>
        </tr>`
}

function renderPhoto(photoUrl: string): string {
  return `
        <tr>
          <td style="padding:20px 24px 0;">
            <img src="${photoUrl}" alt="Photo du signalement" width="400" style="display:block;width:100%;max-width:400px;height:auto;border-radius:6px;border:0;" />
          </td>
        </tr>`
}

export function renderEmail({
  heading,
  paragraphs,
  details,
  photoUrl,
  button,
  closing,
  logoUrl: logoOverride,
}: EmailContent): string {
  const intro = paragraphs
    .map(
      (text) =>
        `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:${BODY_TEXT};">${text}</p>`,
    )
    .join('')

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${CREAM_DARK};margin:0;padding:0;">
    <tr>
      <td align="center" style="padding:20px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:100%;max-width:600px;background:${CREAM};border-radius:8px;font-family:${FONT_STACK};">${renderHeader(logoOverride)}
          <tr>
            <td style="padding:26px 24px 4px;">
              <h1 style="margin:0 0 14px;font-size:20px;line-height:1.3;color:${FOREST};font-weight:bold;">${heading}</h1>
              ${intro}
            </td>
          </tr>${details?.length ? renderDetails(details) : ''}${photoUrl ? renderPhoto(photoUrl) : ''}${button ? renderButton(button) : ''}
          <tr>
            <td style="padding:22px 24px 26px;">
              ${closing ? `<p style="margin:0;font-size:15px;line-height:1.6;color:${BODY_TEXT};">${closing}</p>` : ''}
            </td>
          </tr>
          <tr>
            <td style="background:${CREAM_DARK};padding:16px 24px;text-align:center;font-size:12px;line-height:1.5;color:${MUTED_TEXT};border-radius:0 0 8px 8px;">
              Canopée &middot; Le réseau des bois de Laval
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`
}
