import Gallery from './lifelist/Gallery.jsx'
import PaintingPage from './lifelist/PaintingPage.jsx'
import Recent from './lifelist/Recent.jsx'
import Birds from './lifelist/Birds.jsx'
import Trips from './lifelist/Trips.jsx'
import Parks from './lifelist/Parks.jsx'

// /lifelist                          what's new first
// /lifelist/birds/...                Laurie's birds from eBird (parents only): life list, days, months, places, one bird, bring in the file
// /lifelist/trips/...                camping, Disneyland and the other outings
// /lifelist/parks/...                the national parks, checked off
// /lifelist/paintings[/<slug>]       Laurie's gallery
export default function LifeList({ rest = [] }) {
  if (rest[0] === 'paintings') return rest[1] ? <PaintingPage slug={rest[1]} /> : <Gallery />
  if (rest[0] === 'birds') return <Birds rest={rest.slice(1)} />
  if (rest[0] === 'trips') return <Trips rest={rest.slice(1)} />
  if (rest[0] === 'parks') return <Parks rest={rest.slice(1)} />
  return <Recent />
}
