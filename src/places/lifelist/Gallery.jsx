import { Link, Crumb } from '../../shell/Link.jsx'
import { PAINTINGS } from '../../lib/paintings.js'
import '../../parts/paintings.css'

// /lifelist/paintings: Laurie's gallery, framed and hung, newest first.
// It grows as each painting is photographed (docs/ART-CAPTURE.md).
export default function Gallery() {
  return (
    <>
      <header className="hero span-6">
        <Crumb to="/lifelist">Life List</Crumb>
        <span className="kicker">Painted by Laurie</span>
        <h1 className="greet">Laurie’s gallery</h1>
      </header>
      <section className="gallery-wall span-6" aria-label="Laurie’s paintings">
        {PAINTINGS.map((p) => (
          <Link key={p.slug} className="gallery-piece" to={'/lifelist/paintings/' + p.slug}>
            <span className="gallery-frame"><img src={p.small} alt={`${p.title}, a painting by Laurie`} width={p.w} height={p.h} loading="lazy" /></span>
            <b>{p.title}</b>
            <small>{[p.year, p.medium].filter(Boolean).join(' · ') || (p.named ? 'By Laurie' : 'A working title, until Laurie names it')}</small>
          </Link>
        ))}
      </section>
      <p className="gallery-note span-6">{PAINTINGS.length === 1 ? 'The first of her paintings here.' : `${PAINTINGS.length} of her paintings so far.`} More as each one is photographed.</p>
    </>
  )
}
