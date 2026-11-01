import './livingsky.css'

/**
 * A soft sky behind a weather card, drawn from what the weather is: a sun's
 * glow, clouds drifting, rain falling, snow, fog, stars at night, a flash of
 * lightning. Gradients and transforms only (no blur, which iPhones repaint
 * slowly); still under Reduce Motion (livingsky.css).
 */
export default function LivingSky({ pic }) {
  const night = pic === 'night' || pic === 'night-partly'
  const clouds = { clear: 0, night: 0, partly: 2, 'night-partly': 2, cloudy: 4, fog: 1, drizzle: 3, rain: 4, snow: 3, thunder: 4 }[pic] ?? 2
  return (
    <div className={'ls ls-' + pic} aria-hidden="true">
      {(pic === 'clear' || pic === 'partly') && <i className="ls-sun" />}
      {night && <i className="ls-moon" />}
      {night && <i className="ls-stars" />}
      {Array.from({ length: clouds }, (_, i) => <i key={i} className={'ls-cloud ls-c' + i} />)}
      {(pic === 'rain' || pic === 'drizzle' || pic === 'thunder') && <i className={'ls-rain' + (pic === 'drizzle' ? ' light' : '')} />}
      {pic === 'snow' && <i className="ls-snow" />}
      {pic === 'fog' && <i className="ls-fog" />}
      {pic === 'thunder' && <i className="ls-flash" />}
    </div>
  )
}
