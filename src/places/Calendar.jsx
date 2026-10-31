import Coming from '../parts/Coming.jsx'

export default function Calendar() {
  return (
    <>
      <header className="hero span-6">
        <span className="kicker">Calendar</span>
        <h1 className="greet">Calendar</h1>
      </header>
      <Coming tint="#3E7A4C" glyph="calendar" className="span-6" title="A full calendar" items={[
        'Day, week, month and year views',
        'Synced both ways with our Google calendars',
        'A year view that lays the three school calendars side by side',
        'The Church year: feasts, saints, prayers and readings, with warm invitations to pray',
        'Mass times at Sacred Heart, Laurie’s lectoring, Anna’s altar serving and ministry',
        'Family days celebrated big; holidays, civil rights and heritage days, seasons and nature, each with its own art',
        'Concerts as special events, with their ticket and scrapbook',
      ]} />
    </>
  )
}
