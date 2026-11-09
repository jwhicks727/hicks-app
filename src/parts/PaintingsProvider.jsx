import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { media } from '../lib/media.js'
import { useSession } from '../lib/auth.js'
import { PAINTINGS, fromRow, storedPaths } from '../lib/paintings.js'

// Laurie's paintings, for every screen that shows them. Signed in, they come
// from the `paintings` table and the private bucket, through signed links
// (docs/PAINTINGS-STORAGE.md). Until they've been moved there, only a
// development copy of the app shows the ones bundled with the code; a hosted
// copy shows none, so nothing of hers is ever reachable without signing in.
const Ctx = createContext({ list: [], stored: false, loaded: false, reload: () => {} })
export const usePaintings = () => useContext(Ctx)

export function PaintingsProvider({ children }) {
  const session = useSession()
  const [state, setState] = useState({ list: import.meta.env.DEV ? PAINTINGS : [], stored: false, loaded: false })
  const [n, setN] = useState(0)
  useEffect(() => {
    let live = true
    if (!supabase || !session) { setState({ list: import.meta.env.DEV ? PAINTINGS : [], stored: false, loaded: session === null }); return undefined }
    supabase.from('paintings').select('*').order('added', { ascending: false }).order('slug').then(async ({ data, error }) => {
      if (!live) return
      if (error || !data || !data.length) { setState({ list: import.meta.env.DEV ? PAINTINGS : [], stored: false, loaded: true }); return }
      const paths = data.flatMap((r) => Object.values(storedPaths(r.slug, r)))
      const { data: signed } = await media.from('paintings').createSignedUrls(paths, 7 * 86400)
      const urls = Object.fromEntries((signed || []).filter((x) => x.signedUrl).map((x) => [x.path, x.signedUrl]))
      if (live) setState({ list: data.map((r) => fromRow(r, urls)), stored: true, loaded: true })
    })
    return () => { live = false }
  }, [session, n])
  return <Ctx.Provider value={{ ...state, reload: useCallback(() => setN((x) => x + 1), []) }}>{children}</Ctx.Provider>
}
