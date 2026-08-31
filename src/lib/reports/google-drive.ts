'use server'

import { google } from 'googleapis'
import { Readable } from 'node:stream'

const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID
const SERVICE_ACCOUNT_CREDENTIALS =
  process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is not configured`)
  }
  return value
}

function getDriveClient() {
  const credentials = JSON.parse(
    required(SERVICE_ACCOUNT_CREDENTIALS, 'GOOGLE_SERVICE_ACCOUNT_CREDENTIALS'),
  ) as { client_email: string; private_key: string }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.file'],
  })

  return google.drive({ version: 'v3', auth })
}

async function getOrCreateFolder(
  drive: ReturnType<typeof google.drive>,
  name: string,
  parentId: string,
): Promise<string> {
  const result = await drive.files.list({
    q: `'${parentId}' in parents and name = '${name.replaceAll("'", "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id)',
    spaces: 'drive',
    pageSize: 1,
  })

  const existingId = result.data.files?.[0]?.id
  if (existingId) return existingId

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id',
  })

  return required(created.data.id ?? undefined, 'Google Drive folder ID')
}

export async function archiveReportPhoto(
  path: string,
  eventNumber: number,
  resolvedAt: Date,
): Promise<void> {
  const rootFolderId = required(DRIVE_FOLDER_ID, 'GOOGLE_DRIVE_FOLDER_ID')
  const drive = getDriveClient()
  const yearFolderId = await getOrCreateFolder(
    drive,
    String(resolvedAt.getUTCFullYear()),
    rootFolderId,
  )
  const monthFolderId = await getOrCreateFolder(
    drive,
    String(resolvedAt.getUTCMonth() + 1).padStart(2, '0'),
    yearFolderId,
  )

  const supabaseUrl = required(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    'NEXT_PUBLIC_SUPABASE_URL',
  )
  const serviceRoleKey = required(
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    'SUPABASE_SERVICE_ROLE_KEY',
  )
  const response = await fetch(
    `${supabaseUrl}/storage/v1/object/${encodeURIComponent('report-photos')}/${path}`,
    { headers: { Authorization: `Bearer ${serviceRoleKey}` } },
  )
  if (!response.ok)
    throw new Error(`Unable to download report photo (${response.status})`)

  const body = Buffer.from(await response.arrayBuffer())
  const contentType =
    response.headers.get('content-type') ?? 'application/octet-stream'
  const extension = path.split('.').pop() || 'jpg'
  const fileName = `${eventNumber}.${extension}`

  await drive.files.create({
    requestBody: { name: fileName, parents: [monthFolderId] },
    media: { mimeType: contentType, body: Readable.from(body) },
    fields: 'id',
  })
}
