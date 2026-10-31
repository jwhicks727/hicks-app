import './icon-tile.css'

/**
 * A place's icon: its picture on a tile of its own colour. `colours` is
 * [light, deep]. The picture is a line icon (24-unit grid, drawn in the
 * app's cream) or an image. Two looks, chosen by where it's used:
 *
 * - `flat` (the apps): a solid deep colour with nearly square corners, an
 *   outline set just inside the edge, and a soft glow of its own colour.
 *   No gradient, sheen or shadow.
 * - the default, glossy and 3D (the academy's rooms): a gradient from
 *   light to deep, a sheen from the top-left, a soft shadow. `alive` adds
 *   motion to it: it floats, a glint crosses it, a halo breathes behind it
 *   and its picture breathes (all transform and opacity; still under less
 *   motion).
 */
export default function IconTile({ colours, size = 56, flat = false, alive = false, children, className = '' }) {
  const vars = { '--k1': colours[0], '--k2': colours[1], '--sz': `${size}px` }
  const tile = (
    <span className={'itile ' + (flat ? 'flat ' : '') + (size < 32 ? 'sm ' : '') + className} aria-hidden="true" style={vars}>
      {alive && !flat && <i className="itile-glint" />}
      {children}
    </span>
  )
  if (!alive || flat) return tile
  return (
    <span className="itile-alive" aria-hidden="true" style={vars}>
      <i className="itile-halo" />
      {tile}
    </span>
  )
}
