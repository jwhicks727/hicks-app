import { useMemo } from 'react'
import { useDrawings, useDrawingUrls } from '../lib/useDrawings.js'
import { usePaintings } from '../parts/PaintingsProvider.jsx'
import { artList, artUrl, artName, drawingFilesFor, drawingFile } from './ownArt.js'

/**
 * Anna's drawings and Laurie's paintings for a room: what's placed in it always, and every one for the catalog only
 * while it's open (`all`), so a room signs just the thumbnails it shows.
 */
export function useOwnArt(items, all) {
  const { list: drawings } = useDrawings()
  const { list: paintings } = usePaintings()
  const files = useMemo(() => (all ? drawings.map(drawingFile).filter(Boolean) : drawingFilesFor(items.map((x) => x.k), drawings)), [all, items, drawings])
  const urls = useDrawingUrls(files)
  const src = { drawings, paintings, urls }
  return {
    drawings, paintings,
    list: all ? artList(drawings, paintings) : [],
    urlOf: (k) => artUrl(k, src),
    nameOf: (k) => artName(k, src),
    urls,
  }
}
