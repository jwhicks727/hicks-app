// Everything under Us, each with its line icon and its own colour: the Us
// page's tiles and the computer's rail both draw from this one list. The
// colours are the mockup's outdoor ones (plum, ochre, sea, rust, lake,
// moss), light to deep; the academy's kinds of room keep brighter ones.
const S = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' }

export const US_PLACES = [
  { key: 'journal', to: '/us/journal', name: 'Journal', sub: 'Yours alone', signedIn: true, colours: ['#B49AD0', '#6B4A8E'],
    icon: <g {...S}><rect x="5" y="3.5" width="14" height="17" rx="2.2" /><path d="M8.5 3.5v17" /><path d="M11.5 8.5h4.5M11.5 12h4.5M11.5 15.5h2.5" /></g> },
  { key: 'academy', to: '/academy', name: 'The Academy', sub: 'Anna’s school', colours: ['#F2C14E', '#C47A12'],
    icon: <g {...S}><path d="M3.5 20.5h17M5 20.5V11l7-4.5 7 4.5v9.5" /><path d="M10 20.5v-4.5h4v4.5" /><path d="M12 6.5V2.5l3.5 1.2L12 5" /><circle cx="12" cy="11.5" r="1.4" /></g> },
  { key: 'lifelist', to: '/lifelist', name: 'Life List', sub: 'Birds, trips, parks', colours: ['#7FC6C2', '#2E7F86'],
    icon: <g {...S}><path d="M3 15c3 0 5-2 6-5 1-3 3-5 6-5 2 0 3 1 3 3l3 1-3 1c0 4-3 7-8 7H6z" /><path d="M9 20l1-3M12 20l1-3" /><circle cx="15.2" cy="7.6" r=".4" fill="currentColor" /></g> },
  { key: 'gallery', to: '/lifelist/paintings', name: 'The Gallery', sub: 'Laurie’s paintings', colours: ['#E9A08A', '#B3401A'],
    icon: <g {...S}><rect x="3.5" y="5" width="17" height="14" rx="2" /><path d="M3.5 16l4.8-4.8 3.8 3.8 2.6-2.6 5.8 5.6" /><circle cx="15.5" cy="9" r="1.6" /></g> },
  { key: 'jams', to: '/jams', name: 'Jams', sub: 'Our music', colours: ['#94BDEB', '#3E63A8'],
    icon: <g {...S}><path d="M9 18V6l11-2v12" /><circle cx="6.5" cy="18" r="2.5" /><circle cx="17.5" cy="16" r="2.5" /></g> },
  { key: 'garden', to: '/us/garden', name: 'The Garden', sub: 'Yard and rooms', colours: ['#A9C98F', '#4E6C3D'],
    icon: <g {...S}><path d="M6.5 14h11l-1.4 6.5H7.9z" /><path d="M12 14v-4.5" /><path d="M12 9.5c-3.2 0-4.9-1.7-4.9-4.6 3.2 0 4.9 1.7 4.9 4.6zM12 9.5c0-3 1.7-4.8 4.9-4.8 0 3-1.7 4.8-4.9 4.8z" /></g> },
]
