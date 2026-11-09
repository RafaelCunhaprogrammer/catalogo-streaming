import { randomBytes } from 'node:crypto'
import sharp from 'sharp'

const MAX_BYTES = 200 * 1024
const LADO = 256

// Descobre o tipo pelos primeiros bytes (não confia no nome do arquivo).
function detectarTipo(buf) {
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') {
    return { ext: 'webp', contentType: 'image/webp' }
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { ext: 'jpg', contentType: 'image/jpeg' }
  }
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { ext: 'png', contentType: 'image/png' }
  }
  return null
}

// Confere tipo, tamanho (até 200 KB) e dimensões (256 x 256).
export async function checkPhoto(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0 || buffer.length > MAX_BYTES) return { ok: false }
  const tipo = detectarTipo(buffer)
  if (!tipo) return { ok: false }
  try {
    const { width, height } = await sharp(buffer).metadata()
    if (width !== LADO || height !== LADO) return { ok: false }
  } catch {
    return { ok: false }
  }
  return { ok: true, ...tipo }
}

export function newPhotoKey(profileId, ext) {
  return `fotos/${profileId}/${randomBytes(8).toString('hex')}.${ext}`
}
