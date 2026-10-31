import './icon-tile.css'

/**
 * A place's icon: its picture on a tile of its own colour, the way a phone's
 * app icons are: a gradient from light to deep, a sheen from the top-left,
 * a soft shadow in its colour. `colours` is [light, deep]. The picture is a
 * line icon (24-unit grid, drawn in white) or an image.
 */
export default function IconTile({ colours, size = 56, children, className = '' }) {
  return (
    <span className={'itile ' + className} aria-hidden="true" style={{ '--k1': colours[0], '--k2': colours[1], '--sz': `${size}px` }}>
      {children}
    </span>
  )
}
