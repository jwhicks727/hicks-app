import Coming from '../parts/Coming.jsx'

export default function LifeList() {
  return (
    <>
      <header className="hero span-6">
        <span className="kicker">Everything we’ve seen and done</span>
        <h1 className="greet">Life List</h1>
      </header>
      <Coming tint="#5F8A4A" glyph="bird" className="span-6" title="Recent, first" items={[
        'A Recent dashboard that opens first: new birds, outings, paintings, trips',
        'Laurie’s birds from eBird and Merlin, with drill-downs by day, bird, month and place',
        'Camping trips and Disneyland trips, celebrated',
        'The national parks we want to see, checked off as we go',
        'Laurie’s paintings in place of photos wherever she has painted the thing',
      ]} />
    </>
  )
}
