import { describe, expect, it } from 'vitest'
import {
  fromFormData,
  toFormData,
  type QueuedReport,
} from '@/lib/reports/report-queue'

const ID = '11111111-2222-4333-8444-555555555555'

function buildForm(): FormData {
  const formData = new FormData()

  formData.set('category', 'fallen_tree')
  formData.set('description', 'Arbre en travers du sentier')
  formData.set('latitude', '45.588500')
  formData.set('longitude', '-73.723000')

  return formData
}

describe('report queue serialisation', () => {
  it('keeps the text fields and the photo', () => {
    const formData = buildForm()
    const photo = new File(['x'], 'photo.jpg', { type: 'image/jpeg' })

    formData.set('photo', photo)

    const queued = fromFormData(formData, ID)

    expect(queued.id).toBe(ID)
    expect(queued.fields.category).toBe('fallen_tree')
    expect(queued.fields.description).toBe('Arbre en travers du sentier')
    expect(queued.photo?.name).toBe('photo.jpg')
    expect(queued.photo?.type).toBe('image/jpeg')
  })

  it('drops an empty photo', () => {
    const formData = buildForm()

    formData.set('photo', new File([], 'empty.jpg', { type: 'image/jpeg' }))

    expect(fromFormData(formData, ID).photo).toBeNull()
  })

  it('never stores the id among the fields', () => {
    const formData = buildForm()

    formData.set('id', 'something-else')

    expect(fromFormData(formData, ID).fields.id).toBeUndefined()
  })

  it('round trips back into a form carrying the same id', () => {
    const queued = fromFormData(buildForm(), ID)
    const rebuilt = toFormData(queued)

    expect(rebuilt.get('id')).toBe(ID)
    expect(rebuilt.get('category')).toBe('fallen_tree')
    expect(rebuilt.get('latitude')).toBe('45.588500')
  })

  it('puts the photo back when there is one', () => {
    const queued: QueuedReport = {
      id: ID,
      fields: { category: 'littering' },
      photo: new File(['x'], 'photo.png', { type: 'image/png' }),
      queuedAt: new Date().toISOString(),
    }

    const photo = toFormData(queued).get('photo')

    expect(photo).toBeInstanceOf(File)
    expect((photo as File).name).toBe('photo.png')
  })
})
