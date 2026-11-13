// The hold-tap menu on a piece of Anna's or Laurie's art (src/ui/PieceMenu.jsx): what holding means, and what each
// choice does with the picture. Logic with no React, so `npm test` can run it. A choice only ever hands on the
// picture as it was kept (never changed), and the link it copies is the app's own page for the piece, which needs
// sign-in: never the signed link to the file, which anyone holding it could open.

export const HOLD_MS = 500 // about as long as a phone's own touch-and-hold
export const HOLD_SLOP = 10 // pixels a finger may wander and still be holding

/** Has the pointer moved far enough from where it went down that this is a scroll or a drag, not a hold? */
export const heldStill = (a, b, slop = HOLD_SLOP) => Math.hypot(b.x - a.x, b.y - a.y) <= slop

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }
export const extOf = (mime) => EXT[String(mime || '').split(';')[0].trim().toLowerCase()] || 'jpg'

/** A name a phone or computer will keep: the piece's title and whose it is, no slashes or odd marks. */
export function pieceFileName(title, by, mime) {
  const base = String(title || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9 _-]+/g, ' ').trim().replace(/\s+/g, '-').slice(0, 60).replace(/-+$/, '')
  return `${base || 'art'}-by-${by}.${extOf(mime)}`
}

/** The app's own page for a piece, as a full address to copy. */
export const pieceAddress = (origin, path) => String(origin || '').replace(/\/+$/, '') + path

/** What this device can do, so the menu offers only what will work. */
export function abilities(env = globalThis) {
  const nav = env.navigator || {}
  return {
    download: typeof env.document !== 'undefined',
    copyImage: Boolean(nav.clipboard && nav.clipboard.write && env.ClipboardItem),
    copyLink: Boolean(nav.clipboard && nav.clipboard.writeText),
    share: Boolean(nav.share),
  }
}

async function fetchBlob(url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('The picture didn’t open. Try again in a moment.')
  return res.blob()
}

/** A clipboard takes PNG for sure; a JPEG is redrawn as PNG, pixel for pixel. */
async function asPng(blob) {
  if (blob.type === 'image/png') return blob
  const bmp = await createImageBitmap(blob)
  const c = document.createElement('canvas')
  c.width = bmp.width; c.height = bmp.height
  c.getContext('2d').drawImage(bmp, 0, 0)
  bmp.close && bmp.close()
  return new Promise((ok, no) => c.toBlob((b) => (b ? ok(b) : no(new Error('Couldn’t copy that picture.'))), 'image/png'))
}

/** Each returns the words to tell the person on success, or throws a plain-words Error. */
export const DO = {
  async download({ url, name }) {
    const blob = await fetchBlob(url)
    const a = document.createElement('a'), href = URL.createObjectURL(blob)
    a.href = href; a.download = name(blob.type)
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(href), 10000)
    return 'Saved to this device.'
  },
  async copyImage({ url }) {
    // Safari wants the clipboard write started inside the tap, so the blob is handed over as a promise
    const png = fetchBlob(url).then(asPng)
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })])
    return 'Picture copied.'
  },
  async copyLink({ address }) {
    await navigator.clipboard.writeText(address)
    return 'Link copied. It opens only for someone signed in.'
  },
  async share({ url, name, title }) {
    const blob = await fetchBlob(url)
    const file = new File([blob], name(blob.type), { type: blob.type })
    const data = navigator.canShare && navigator.canShare({ files: [file] }) ? { files: [file], title } : null
    if (!data) throw new Error('This device can’t share the picture itself. Save it, then share it from there.')
    try { await navigator.share(data) } catch (e) { if (e && e.name === 'AbortError') return null; throw e }
    return null
  },
}
