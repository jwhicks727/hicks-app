// Small line icons for the things on a list (the tab icons' 24-unit grid), chosen when an item is written.
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' }

export const ITEM_ICONS = {
  bed: ['Bed', <g {...S}><path d="M3 18V7M3 14h18v4M21 14v-2a3 3 0 0 0-3-3h-7v5" /><circle cx="7" cy="11" r="2" /></g>],
  teeth: ['Teeth', <g {...S}><path d="M7 4c-2 0-3.5 1.6-3.5 4 0 3 1.5 4.5 2 8 .3 2 1 4 2 4s1.5-2 2-4.5c.3-1.4 1-2 2.5-2s2.2.6 2.5 2c.5 2.5 1 4.5 2 4.5s1.7-2 2-4c.5-3.5 2-5 2-8 0-2.4-1.5-4-3.5-4-2 0-3 1-5 1S9 4 7 4z" /></g>],
  shower: ['Shower', <g {...S}><path d="M4 20V8a4 4 0 0 1 8 0" /><path d="M9 8h6" /><path d="M10 12v1M14 12v1M12 15v1M10 18v1M14 18v1" /></g>],
  shirt: ['Get dressed', <g {...S}><path d="M8 3 3 6l2 4 2-1v12h10V9l2 1 2-4-5-3c0 1.7-1.3 3-3 3S8 4.7 8 3z" /></g>],
  backpack: ['Backpack', <g {...S}><path d="M6 9a6 6 0 0 1 12 0v11H6z" /><path d="M9 5V3h6v2M9 14h6v3H9z" /></g>],
  book: ['Read', <g {...S}><path d="M3 5c3-1 6-1 9 1v14c-3-2-6-2-9-1zM21 5c-3-1-6-1-9 1v14c3-2 6-2 9-1z" /></g>],
  pill: ['Medicine', <g {...S}><rect x="3" y="9" width="18" height="7" rx="3.5" transform="rotate(-35 12 12.5)" /><path d="M9.5 8.5l5 7" /></g>],
  paw: ['The pets', <g {...S}><circle cx="6.3" cy="11.2" r="1.9" /><circle cx="9.9" cy="6.6" r="1.9" /><circle cx="14.1" cy="6.6" r="1.9" /><circle cx="17.7" cy="11.2" r="1.9" /><path d="M12 12.6c-3 0-5.6 3-5.6 5.2 0 1.6 1.4 2.3 2.8 2 .9-.2 1.7-.5 2.8-.5s1.9.3 2.8.5c1.4.3 2.8-.4 2.8-2 0-2.2-2.6-5.2-5.6-5.2z" /></g>],
  plant: ['Water the plants', <g {...S}><path d="M6.5 14h11l-1.4 6.5H7.9z" /><path d="M12 14v-4.5" /><path d="M12 9.5c-3.2 0-4.9-1.7-4.9-4.6 3.2 0 4.9 1.7 4.9 4.6zM12 9.5c0-3 1.7-4.8 4.9-4.8 0 3-1.7 4.8-4.9 4.8z" /></g>],
  water: ['Drink water', <g {...S}><path d="M7 3h10l-1.5 17a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1z" /><path d="M7.6 9h8.8" /></g>],
  music: ['Practise', <g {...S}><path d="M9 18V6l11-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17.5" cy="16" r="2.5" /></g>],
  pray: ['Pray', <g {...S}><path d="M12 3v18M7 8h10" /></g>],
  dish: ['Dishes', <g {...S}><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="4" /></g>],
  broom: ['Tidy', <g {...S}><path d="M14 3 9.5 12" /><path d="M6 11.5l7 3.5-2.5 6H4.5L3 19z" /><path d="M7 17l1.5-2.5M9.5 18.5 11 16" /></g>],
  sun: ['Outside', <g {...S}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></g>],
  phone: ['Phone away', <g {...S}><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M11 18.5h2" /></g>],
  heart: ['Kindness', <g {...S}><path d="M12 20s-7-4.4-8.6-8.6C2.2 8.3 4 5.5 7 5.5c2 0 3.4 1 5 3 1.6-2 3-3 5-3 3 0 4.8 2.8 3.6 5.9C19 15.6 12 20 12 20z" /></g>],
  star: ['Anything', <g {...S}><path d="M12 3.5l2.5 5.2 5.6.8-4 4 1 5.6L12 16.4l-5.1 2.7 1-5.6-4-4 5.6-.8z" /></g>],
}

export function ItemIcon({ name, className = 'dl-ico' }) {
  const i = ITEM_ICONS[name]
  if (!i) return null
  return <svg className={className} viewBox="0 0 24 24" aria-hidden="true">{i[1]}</svg>
}

export const SunIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><g {...S}><path d="M3.5 17.5h17M7 17.5a5 5 0 0 1 10 0M12 7.5V5M6.3 10.8 4.9 9.4M17.7 10.8l1.4-1.4" /></g></svg>
export const MoonIcon = () => <svg viewBox="0 0 24 24" aria-hidden="true"><g {...S}><path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" /><path d="M17 4v3M15.5 5.5h3" /></g></svg>
export const Flame = () => <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5c1 3.5 5.5 5.5 5.5 11a5.5 5.5 0 0 1-11 0c0-2.6 1.2-4.2 2.4-5.4.2 1.8 1 2.9 2.1 3.4-.6-3.6.5-6.5 1-9z" fill="currentColor" /></svg>
