// ============================================
// claude.js -- asking Claude from the app, always through the `claude` function
// ============================================
// The app never holds a key or names a model: the function picks the latest
// Sonnet and keeps the family's spending caps. Every screen that asks says
// first what it sends (CLAUDE.md, "Personal data goes to an AI service only
// when the app says so").
import { supabase } from './supabase.js'

/** Ask: { task, ...inputs } -> the function's answer, or { error }. */
export async function askClaude(task, inputs = {}) {
  if (!supabase) return { error: 'The app isn’t connected to its database yet' }
  try {
    const { data, error } = await supabase.functions.invoke('claude', { body: { task, ...inputs } })
    if (error) {
      let why = ''
      try { why = (await error.context.json()).error } catch { /* no body */ }
      return { error: why || 'Claude couldn’t be reached just now' }
    }
    return data
  } catch {
    return { error: 'Claude couldn’t be reached just now' }
  }
}

/**
 * A picture ready to send: shrunk so its long side is at most `max` px and
 * re-encoded as JPEG, as { data (base64), media_type, preview (object URL) }.
 * A PDF is sent as it is.
 */
export async function prepareUpload(file, { max = 1600, quality = 0.85 } = {}) {
  if (file.type === 'application/pdf') {
    const data = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = no; r.readAsDataURL(file) })
    return { data, media_type: 'application/pdf', name: file.name, preview: null }
  }
  const bitmap = await createImageBitmap(file)
  const k = Math.min(1, max / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * k), h = Math.round(bitmap.height * k)
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h
  canvas.getContext('2d').drawImage(bitmap, 0, 0, w, h)
  const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/jpeg', quality))
  const data = await new Promise((ok, no) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.onerror = no; r.readAsDataURL(blob) })
  return { data, media_type: 'image/jpeg', name: file.name || 'pasted picture', preview: URL.createObjectURL(blob), blob, width: w, height: h }
}
