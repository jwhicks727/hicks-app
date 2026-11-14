// ============================================
// chatPhotos.js -- pictures attached in the Kitchen chat
// ============================================
// A photo is read once and never kept: the chat's saved history (on the device)
// holds only how many photos a message had, and the pictures themselves stay in
// memory until the chat closes. Only the newest message that still has its
// pictures sends them again; older ones go as a line saying photos were there.
// Pure: tests/kitchen-chat-photos.test.mjs.

export const MAX_PHOTOS = 4
export const DEFAULT_WORDS = 'Here’s what I have. What could I make this week?'

/**
 * The history as Claude gets it: { role, content } turns only. `shots` maps a
 * message's place in the history to its pictures ({ data, media_type }).
 */
export function forClaude(messages = [], shots = {}) {
  let newest = -1
  messages.forEach((m, i) => { if (m.role === 'user' && m.photos && shots[i] && shots[i].length) newest = i })
  return messages.map((m, i) => {
    if (m.role !== 'user' || !m.photos) return { role: m.role, content: m.content }
    const text = typeof m.content === 'string' ? m.content : ''
    if (i !== newest) return { role: 'user', content: `${text}\n\n(${m.photos} ${m.photos === 1 ? 'photo was' : 'photos were'} attached here; what they showed is in the replies above and below)`.trim() }
    return {
      role: 'user',
      content: [
        ...shots[i].slice(0, MAX_PHOTOS).map((f) => ({ type: 'image', source: { type: 'base64', media_type: f.media_type, data: f.data } })),
        { type: 'text', text },
      ],
    }
  })
}
