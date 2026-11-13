import { useEffect, useMemo, useState } from 'react'
import WindShow from './WindShow.jsx'
import { sheetsFor } from './harvest/kit.js'

// Autumn's wind where no leaves have been cut yet (src/lib/seasonShows.js, `cut`): the phone cuts them from the autumn
// painting itself, once (the cut-leaves button on its page would have kept them), and then the wind plays as usual.
// If the painting has too little foliage to cut, nothing plays and nothing stands in for it.
export default function CutWind({ show, list, path }) {
  const [sheets, setSheets] = useState(null)
  useEffect(() => {
    let live = true
    setSheets(null)
    sheetsFor(show.painting, show).then((s) => { if (live) setSheets(s) }).catch(() => { if (live) setSheets([]) })
    return () => { live = false }
  }, [show.painting.slug, show.painting.src])
  const cutShow = useMemo(() => (sheets && sheets.length ? { ...show, sheets } : null), [show, sheets])
  return cutShow ? <WindShow show={cutShow} list={list} path={path} /> : null
}
