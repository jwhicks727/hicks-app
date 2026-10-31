import { useEffect, useRef, useState } from 'react'
import './dropzone.css'

/**
 * Somewhere to give the app a picture or a file, every way there is: choose
 * one, take a photo (phones), paste it (a screenshot on the clipboard, from
 * anywhere on the screen while this is showing, or the Paste button), or drag
 * it in (desktop). `onFiles(files)` gets File objects; `onText(text)` gets
 * pasted or dropped text, if the place wants text too.
 */
export default function Dropzone({ accept = 'image/*', multiple = false, onFiles, onText, label = 'Add a picture', hint, camera = true, disabled = false }) {
  const [over, setOver] = useState(false)
  const [note, setNote] = useState(null)
  const pick = useRef(null), snap = useRef(null)
  const ok = (f) => accept.split(',').some((a) => { a = a.trim(); return a.endsWith('/*') ? f.type.startsWith(a.slice(0, -1)) : f.type === a })
  const take = (list) => {
    const files = [...(list || [])].filter(ok)
    if (!files.length) { setNote(accept.includes('pdf') ? 'That isn’t a picture or a PDF.' : accept.startsWith('image') ? 'That isn’t a picture.' : 'That isn’t a file this takes.'); return false }
    setNote(null); onFiles(multiple ? files : files.slice(0, 1)); return true
  }
  // A paste anywhere on the screen, unless it's into a box being typed in
  useEffect(() => {
    if (disabled) return undefined
    const onPaste = (e) => {
      const files = [...(e.clipboardData?.files || [])]
      const typing = e.target instanceof HTMLElement && e.target.closest('input, textarea, [contenteditable="true"]')
      if (files.length) { if (take(files)) e.preventDefault(); return }
      if (!typing && onText) { const t = e.clipboardData?.getData('text/plain'); if (t && t.trim()) { e.preventDefault(); onText(t) } }
    }
    window.addEventListener('paste', onPaste)
    return () => window.removeEventListener('paste', onPaste)
  }, [disabled, onText, multiple, accept]) // eslint-disable-line react-hooks/exhaustive-deps
  // The Paste button: the clipboard's picture, where the browser allows reading it
  const pasteNow = async () => {
    try {
      const items = await navigator.clipboard.read()
      for (const it of items) {
        const type = it.types.find((t) => t.startsWith('image/'))
        if (type) { const blob = await it.getType(type); take([new File([blob], 'pasted picture.' + type.split('/')[1], { type })]); return }
        if (onText && it.types.includes('text/plain')) { const t = await (await it.getType('text/plain')).text(); if (t.trim()) { onText(t); return } }
      }
      setNote('There’s no picture on the clipboard.')
    } catch {
      setNote('This browser won’t let the button read the clipboard: press Ctrl-V or ⌘V instead, or long-press and Paste.')
    }
  }
  return (
    <div
      className={'drop' + (over ? ' over' : '') + (disabled ? ' off' : '')}
      onDragOver={(e) => { if (disabled) return; e.preventDefault(); setOver(true) }}
      onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOver(false) }}
      onDrop={(e) => {
        if (disabled) return
        e.preventDefault(); setOver(false)
        if (e.dataTransfer.files.length) take(e.dataTransfer.files)
        else if (onText) { const t = e.dataTransfer.getData('text/plain'); if (t.trim()) onText(t) }
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" className="drop-i"><path d="M4 16.5V19a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-2.5M12 4v11M7.5 8.5 12 4l4.5 4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
      <b>{label}</b>
      <span className="drop-how">{hint || 'Drop it here, paste it, or choose one.'}</span>
      <div className="drop-b">
        <button type="button" className="btn ghost" disabled={disabled} onClick={() => pick.current.click()}>Choose{multiple ? ' files' : ' a file'}</button>
        {camera && <button type="button" className="btn ghost drop-cam" disabled={disabled} onClick={() => snap.current.click()}>Take a photo</button>}
        <button type="button" className="btn ghost" disabled={disabled} onClick={pasteNow}>Paste</button>
      </div>
      <input ref={pick} type="file" accept={accept} multiple={multiple} hidden onChange={(e) => { take(e.target.files); e.target.value = '' }} />
      {camera && <input ref={snap} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { take(e.target.files); e.target.value = '' }} />}
      {note && <p className="drop-note" role="status">{note}</p>}
    </div>
  )
}
