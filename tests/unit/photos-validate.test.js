// @vitest-environment node
import { describe, it, expect } from 'vitest'
import sharp from 'sharp'
import { checkPhoto, newPhotoKey } from '@/lib/photos/validate'

const base = (w, h) => sharp({ create: { width: w, height: h, channels: 3, background: '#2a8f5a' } })

describe('checkPhoto', () => {
  it('aceita WebP 256x256', async () => {
    const r = checkPhoto(await base(256, 256).webp().toBuffer())
    expect(await r).toEqual({ ok: true, ext: 'webp', contentType: 'image/webp' })
  })
  it('aceita JPEG 256x256', async () => {
    expect(await checkPhoto(await base(256, 256).jpeg().toBuffer())).toEqual({ ok: true, ext: 'jpg', contentType: 'image/jpeg' })
  })
  it('aceita PNG 256x256', async () => {
    expect(await checkPhoto(await base(256, 256).png().toBuffer())).toEqual({ ok: true, ext: 'png', contentType: 'image/png' })
  })
  it('recusa PNG 300x300', async () => {
    expect(await checkPhoto(await base(300, 300).png().toBuffer())).toEqual({ ok: false })
  })
  it('recusa arquivo de 201 KB', async () => {
    const png = await base(256, 256).png().toBuffer()
    const grande = Buffer.concat([png, Buffer.alloc(201 * 1024)])
    expect(await checkPhoto(grande)).toEqual({ ok: false })
  })
  it('recusa texto disfarçado de .jpg', async () => {
    expect(await checkPhoto(Buffer.from('isto não é uma imagem'))).toEqual({ ok: false })
  })
  it('recusa entrada que não é Buffer', async () => {
    expect(await checkPhoto(null)).toEqual({ ok: false })
  })
})

describe('newPhotoKey', () => {
  it('segue o formato fotos/<id>/<16 hex>.<ext>', () => {
    const k = newPhotoKey('perfil-1', 'webp')
    expect(k).toMatch(/^fotos\/perfil-1\/[0-9a-f]{16}\.webp$/)
    expect(newPhotoKey('perfil-1', 'webp')).not.toBe(k)
  })
})
