const MAX_EDGE = 1600

const JPEG_QUALITY = 0.8

const OUTPUT_TYPE = 'image/jpeg'

export async function downscalePhoto(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: 'from-image',
    })

    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))

    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')

    if (!context) {
      bitmap.close()
      return file
    }

    context.drawImage(bitmap, 0, 0, width, height)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, OUTPUT_TYPE, JPEG_QUALITY)
    })

    if (!blob) {
      return file
    }

    return new File([blob], renameToJpeg(file.name), { type: OUTPUT_TYPE })
  } catch {
    return file
  }
}

function renameToJpeg(name: string): string {
  const base = name.replace(/\.[^.]+$/, '')

  return `${base || 'photo'}.jpg`
}
