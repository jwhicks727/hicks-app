const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
export const GLYPHS = {
  sunmoon: <path {...S} d="M3.5 17.5h17M7 17.5a5 5 0 0 1 10 0M12 7.5V5M6.3 10.8 4.9 9.4M17.7 10.8l1.4-1.4" />,
  weather: <g {...S}><circle cx="9" cy="9" r="3.2" /><path d="M9 3.2v1.2M3.2 9h1.2M5 5l.8.8M13 5l-.8.8" /><path d="M8 19.5h9a3.5 3.5 0 0 0 0-7 4.6 4.6 0 0 0-8.8 1.4A2.8 2.8 0 0 0 8 19.5z" /></g>,
  calendar: <g {...S}><rect x="4" y="5.5" width="16" height="14" rx="2" /><path d="M4 10h16M8.5 3.5v4M15.5 3.5v4" /></g>,
  pot: <g {...S}><path d="M4.5 11h15v3a5.5 5.5 0 0 1-5.5 5.5h-4A5.5 5.5 0 0 1 4.5 14z" /><path d="M2.5 11h19M9.5 4c-1 1.2 1 2 0 3.4M13.5 4c-1 1.2 1 2 0 3.4" /></g>,
  bird: <g {...S}><path d="M3.5 15c3 0 5-2 6-5s3-5 6-5c2 0 3 1 3 3l2.5 1-2.5 1c0 4-3 7-8 7h-4z" /><path d="M9 20l1-3M12 20l1-3" /></g>,
  music: <g {...S}><path d="M9 18V6l11-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17.5" cy="16" r="2.5" /></g>,
  star: <path {...S} d="M12 3.5l2.5 5.2 5.6.8-4 4 1 5.6L12 16.4l-5.1 2.7 1-5.6-4-4 5.6-.8z" />,
}

/** A card: warm paper, a blush of its place's colour, a label with an outlined picture tile. */
export function Card({ tint = '#E8B98A', label, glyph, tag, className = '', children, as: As = 'article', ...rest }) {
  return (
    <As className={'card ' + className} style={{ '--tint': tint }} {...rest}>
      {label && (
        <span className="label">
          <span className="dot" style={{ '--c': tint }}>{glyph && <svg viewBox="0 0 24 24" aria-hidden="true">{GLYPHS[glyph]}</svg>}</span>
          {label}
          {tag && <span className="ex">{tag}</span>}
        </span>
      )}
      {children}
    </As>
  )
}
