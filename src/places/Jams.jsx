import Coming from '../parts/Coming.jsx'

export default function Jams() {
  return (
    <>
      <header className="hero span-6">
        <span className="kicker">Jam bands first</span>
        <h1 className="greet">Jams</h1>
      </header>
      <Coming tint="#8A5BC4" glyph="music" className="span-6" title="Our music" items={[
        'Jam-scene shows near us, found online and added to the calendar',
        'Free live recordings from the Internet Archive, played right here',
        'Chill and relaxing music from free sources, in the same player',
        'Jason’s jam bands, Anna’s favourite bands and Laurie’s favourite Christian artists, each celebrated',
      ]} />
    </>
  )
}
