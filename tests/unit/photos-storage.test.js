// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const { put, get, del } = vi.hoisted(() => ({
  put: vi.fn(async () => ({})),
  get: vi.fn(),
  del: vi.fn(async () => {}),
}))
vi.mock('@vercel/blob', () => ({ put, get, del }))

import { getPhotoStorage } from '@/lib/photos/storage'

let dir
beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fotos-'))
  put.mockClear(); get.mockReset(); del.mockClear()
})
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true })
})

describe('armazenamento local', () => {
  it('grava, lê e apaga uma foto', async () => {
    const s = getPhotoStorage({ env: {}, dir })
    const buf = Buffer.from([1, 2, 3])
    await s.put('fotos/abc/x.webp', buf, 'image/webp')
    const lida = await s.get('fotos/abc/x.webp')
    expect(lida.body.equals(buf)).toBe(true)
    expect(lida.contentType).toBe('image/webp')
    await s.del('fotos/abc/x.webp')
    expect(await s.get('fotos/abc/x.webp')).toBeNull()
  })

  it('get de chave inexistente devolve null e del não lança', async () => {
    const s = getPhotoStorage({ env: {}, dir })
    expect(await s.get('fotos/nada/y.png')).toBeNull()
    await expect(s.del('fotos/nada/y.png')).resolves.toBeUndefined()
  })

  describe.each(['../x', 'fotos/../../x', path.resolve(os.tmpdir(), 'fora.png')])('chave fora da pasta: %s', (chave) => {
    it('put recusa, get devolve null e del não faz nada', async () => {
      const s = getPhotoStorage({ env: {}, dir })
      await expect(s.put(chave, Buffer.from([1]), 'image/png')).rejects.toThrow()
      expect(await s.get(chave)).toBeNull()
      await expect(s.del(chave)).resolves.toBeUndefined()
    })
  })

  it('del com chave fora da pasta não apaga arquivo de fora', async () => {
    const fora = path.join(path.dirname(dir), 'alvo-' + path.basename(dir) + '.png')
    fs.writeFileSync(fora, 'x')
    try {
      const s = getPhotoStorage({ env: {}, dir })
      await s.del('../' + path.basename(fora))
      expect(fs.existsSync(fora)).toBe(true)
      expect(await s.get('../' + path.basename(fora))).toBeNull()
    } finally {
      fs.rmSync(fora, { force: true })
    }
  })})

describe('armazenamento Blob', () => {
  const env = { BLOB_READ_WRITE_TOKEN: 'tok' }

  it('é escolhido com token e grava como privado, sem sufixo aleatório', async () => {
    const s = getPhotoStorage({ env, dir })
    const buf = Buffer.from([9])
    await s.put('fotos/abc/x.webp', buf, 'image/webp')
    expect(put).toHaveBeenCalledTimes(1)
    const [key, body, opts] = put.mock.calls[0]
    expect(key).toBe('fotos/abc/x.webp')
    expect(body).toBe(buf)
    expect(opts).toMatchObject({ access: 'private', addRandomSuffix: false, contentType: 'image/webp' })
    expect(fs.readdirSync(dir)).toEqual([])
  })

  it('lê pelo get privado e devolve Buffer; ausente vira null', async () => {
    get.mockResolvedValueOnce({
      statusCode: 200,
      stream: new Response(Buffer.from([4, 5])).body,
      blob: { contentType: 'image/png' },
    })
    const s = getPhotoStorage({ env, dir })
    const r = await s.get('fotos/abc/x.png')
    expect(get).toHaveBeenCalledWith('fotos/abc/x.png', expect.objectContaining({ access: 'private' }))
    expect([...r.body]).toEqual([4, 5])
    expect(r.contentType).toBe('image/png')
    get.mockResolvedValueOnce(null)
    expect(await s.get('fotos/abc/z.png')).toBeNull()
  })

  it('apaga pelo del', async () => {
    const s = getPhotoStorage({ env, dir })
    await s.del('fotos/abc/x.webp')
    expect(del).toHaveBeenCalledWith('fotos/abc/x.webp', expect.any(Object))
  })
})
