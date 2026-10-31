import Coming from '../parts/Coming.jsx'
import PaintingsCard from '../parts/PaintingsCard.jsx'
import Gallery from './lifelist/Gallery.jsx'
import PaintingPage from './lifelist/PaintingPage.jsx'

// /lifelist                          everything we've seen and done
// /lifelist/paintings                Laurie's gallery
// /lifelist/paintings/<slug>         one of her paintings
export default function LifeList({ rest = [] }) {
  if (rest[0] === 'paintings') return rest[1] ? <PaintingPage slug={rest[1]} /> : <Gallery />
  return (
    <>
      <header className="hero span-6">
        <span className="kicker">Everything we’ve seen and done</span>
        <h1 className="greet">Life List</h1>
      </header>
      <PaintingsCard className="span-3" />
      <Coming tint="#5F8A4A" glyph="bird" className="span-3" title="Recent, first" items={[
        'A Recent dashboard that opens first: new birds, outings, paintings, trips',
        'Laurie’s birds from eBird and Merlin, with drill-downs by day, bird, month and place',
        'Camping trips and Disneyland trips, celebrated',
        'The national parks we want to see, checked off as we go',
        'Laurie’s paintings in place of photos wherever she has painted the thing',
      ]} />
    </>
  )
}
