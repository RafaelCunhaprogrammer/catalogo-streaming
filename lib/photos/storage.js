import fs from 'node:fs/promises'
import path from 'node:path'
import * as blob from '@vercel/blob'

const TIPOS = { webp: 'image/webp', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png' }

// Vercel Blob privado (produção, quando há token).
function blobStorage(token) {
  return {
    async put(key, buffer, contentType) {
      await blob.put(key, buffer, { access: 'private', addRandomSuffix: false, contentType, token })
    },
    async get(key) {
      const r = await blob.get(key, { access: 'private', token })
      if (!r || r.statusCode !== 200 || !r.stream) return null
      const body = Buffer.from(await new Response(r.stream).arrayBuffer())
      return { body, contentType: r.blob.contentType }
    },
    async del(key) {
      await blob.del(key, { token })
    },
  }
}

// Pasta local (desenvolvimento, sem token).
function localStorage(dir) {
  const raiz = path.resolve(/*turbopackIgnore: true*/ dir)
  // Resolve a chave e recusa (null) o que cair fora da pasta de fotos.
  const caminho = (key) => {
    if (typeof key !== 'string' || key === '') return null
    const p = path.resolve(raiz, key)
    return p.startsWith(raiz + path.sep) ? p : null
  }
  return {
    async put(key, buffer) {
      const p = caminho(key)
      if (!p) throw new Error('Chave de foto inválida')
      await fs.mkdir(path.dirname(p), { recursive: true })
      await fs.writeFile(/*turbopackIgnore: true*/ p, buffer)
    },
    async get(key) {
      const p = caminho(key)
      if (!p) return null
      try {
        const body = await fs.readFile(/*turbopackIgnore: true*/ p)
        const ext = path.extname(key).slice(1).toLowerCase()
        return { body, contentType: TIPOS[ext] ?? 'application/octet-stream' }
      } catch (e) {
        if (e.code === 'ENOENT') return null
        throw e
      }
    },
    async del(key) {
      const p = caminho(key)
      if (p) await fs.rm(/*turbopackIgnore: true*/ p, { force: true })
    },
  }
}

export function getPhotoStorage({ env = process.env, dir } = {}) {
  const token = env.BLOB_READ_WRITE_TOKEN
  return token ? blobStorage(token) : localStorage(dir ?? path.join(/*turbopackIgnore: true*/ process.cwd(), '.data', 'fotos'))
}
