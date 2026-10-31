import { Link } from '../../shell/Link.jsx'
import { lineup, ROOM_LIGHT } from '../../lib/garden.js'
import PlantArt from './PlantArt.jsx'

// A room's plants from the side, biggest first, each at its size and in its
// pot, standing along the floor under the room's window: which is which and
// how big, not where. Tap one to open it.
export default function PotLineup({ area, spots, plants, mini = false, open = true }) {
  const line = lineup(spots, plants)
  return (
    <div className={'pots' + (mini ? ' mini' : '') + ` light-${area.light || 'medium'}`} role="list" aria-label={`${area.name}’s plants${area.light ? `, ${ROOM_LIGHT[area.light] || ''}` : ''}`}>
      <span className="pots-window" aria-hidden="true" />
      {line.map(({ spot, form, size, pot, plant }) => {
        const art = <PlantArt form={form} size={mini ? (size === 'tree' ? 'medium' : 'small') : size} pot={pot} seed={spot.id} title={spot.name} />
        return (
          <div key={spot.id} className="pots-one" role="listitem">
            {open && !mini ? <Link to={`/garden/spot/${spot.id}`} className="pots-art" aria-label={spot.name}>{art}</Link> : <span className="pots-art">{art}</span>}
            {!mini && <span className="pots-name"><b>{spot.name}</b>{plant && plant.name !== spot.name && <span>{plant.name}</span>}</span>}
          </div>
        )
      })}
      {!line.length && <p className="muted pots-none">No plants in this room yet.</p>}
    </div>
  )
}
