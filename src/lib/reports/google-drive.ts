'use server'

import { google } from 'googleapis'
import { Readable } from 'node:stream'

const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID
const SHARED_DRIVE_ID = process.env.GOOGLE_DRIVE_SHARED_DRIVE_ID
const SERVICE_ACCOUNT_CREDENTIALS =
  process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS

type DriveErrorLike = {
  code?: number
  status?: number
  message?: string
  errors?: Array<{ reason?: string; location?: string }>
}

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`${name} is not configured`)
  }
  return value
}

function isMissingParentError(error: unknown): boolean {
  const maybe = error as DriveErrorLike | undefined
  if (!maybe) return false

  if (maybe.code === 404 || maybe.status === 404) return true
  if (
    typeof maybe.message === 'string' &&
    /file not found|not found/i.test(maybe.message)
  ) {
    return true
  }

  return (
    maybe.errors?.some(
      (entry) => entry.reason === 'notFound' || entry.location === 'fileId',
    ) ?? false
  )
}

function buildFolderRequestBody(
  name: string,
  parentId?: string,
  driveId?: string,
) {
  const requestBody: Record<string, unknown> = {
    name,
    mimeType: 'application/vnd.google-apps.folder',
  }

  if (parentId) {
    requestBody.parents = [parentId]
  }

  if (driveId) {
    requestBody.driveId = driveId
  }

  return requestBody
}

function getDriveClient() {
  const credentials = JSON.parse(
    required(SERVICE_ACCOUNT_CREDENTIALS, 'GOOGLE_SERVICE_ACCOUNT_CREDENTIALS'),
  ) as { client_email: string; private_key: string }

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  })

  return google.drive({ version: 'v3', auth })
}

async function getOrCreateFolder(
  drive: ReturnType<typeof google.drive>,
  name: string,
  parentId: string,
): Promise<string> {
  const fallbackParentId = parentId === 'root' ? undefined : parentId
  const query = fallbackParentId
    ? `'${fallbackParentId}' in parents and name = '${name.replaceAll("'", "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
    : `name = '${name.replaceAll("'", "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and 'root' in parents and trashed = false`

  let existingId: string | undefined

  try {
    const result = await drive.files.list({
      q: query,
      fields: 'files(id)',
      spaces: 'drive',
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      pageSize: 1,
    })

    existingId = result.data.files?.[0]?.id ?? undefined
  } catch (error) {
    if (!fallbackParentId || !isMissingParentError(error)) {
      throw error
    }
  }

  if (existingId) return existingId

  let parentForCreate: string | undefined = fallbackParentId

  try {
    const created = await drive.files.create({
      requestBody: buildFolderRequestBody(
        name,
        parentForCreate,
        SHARED_DRIVE_ID,
      ),
      supportsAllDrives: true,
      fields: 'id',
    })

    return required(created.data.id ?? undefined, 'Google Drive folder ID')
  } catch (error) {
    if (!parentForCreate || !isMissingParentError(error)) {
      throw error
    }

    parentForCreate = undefined
    const created = await drive.files.create({
      requestBody: buildFolderRequestBody(
        name,
        parentForCreate,
        SHARED_DRIVE_ID,
      ),
      supportsAllDrives: true,
      fields: 'id',
    })

    return required(created.data.id ?? undefined, 'Google Drive folder ID')
  }
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
    `${resolvedAt.getUTCFullYear()}-${String(resolvedAt.getUTCMonth() + 1).padStart(2, '0')}`,
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
    requestBody: {
      name: fileName,
      parents: [monthFolderId],
      ...(SHARED_DRIVE_ID ? { driveId: SHARED_DRIVE_ID } : {}),
    },
    media: { mimeType: contentType, body: Readable.from(body) },
    supportsAllDrives: true,
    fields: 'id',
  })
}
