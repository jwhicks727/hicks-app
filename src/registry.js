// ============================================
// registry.js -- what each place adds to Admin, Settings and Reports
// ============================================
// Add a place, a setup section or a report here and it appears in Admin and
// Reports by itself, as SOAR's module registry does. tests/registry.test.mjs
// keeps this list and the router in step.

export const REGISTRY = [
  { key: 'home', name: 'Home', colour: '#5F8A4A', setup: [], reports: [] },
  { key: 'world', name: 'World', colour: '#3BA3A8',
    setup: [{ key: 'stations', title: 'Weather stations', ready: true }, { key: 'places', title: 'Places we love', ready: false }],
    reports: [] },
  { key: 'calendar', name: 'Calendar', colour: '#3E7A4C',
    setup: [{ key: 'sources', title: 'Calendar sources', ready: true }, { key: 'family-days', title: 'Family days', ready: true }, { key: 'mass-times', title: 'Mass times from the parish', ready: true }],
    reports: [{ key: 'sources', title: 'Calendar sources', blurb: 'Every source, what it covers, and which need rolling over', ready: true },
      { key: 'family-days', title: 'Family days', blurb: 'The days we keep, and what’s coming next', ready: true }] },
  { key: 'kitchen', name: 'Kitchen', colour: '#F03E2F',
    setup: [{ key: 'food-rules', title: 'Food rules (Jason and Laurie only)', ready: false }],
    reports: [{ key: 'cookbook', title: 'The cookbook', blurb: 'Our recipes, how they’re rated, and the favourites', ready: true }] },
  { key: 'journal', name: 'Journal', colour: '#6B4A8E',
    setup: [], reports: [] },
  { key: 'garden', name: 'The Garden', colour: '#4E6C3D',
    setup: [], reports: [] },
  { key: 'lifelist', name: 'Life List', colour: '#5F8A4A',
    setup: [],
    reports: [] },
  { key: 'jams', name: 'Jams', colour: '#8A5BC4',
    setup: [{ key: 'artists', title: 'Our favourite artists', ready: false }, { key: 'scouts', title: 'The daily scouts', ready: false }],
    reports: [] },
  { key: 'academy', name: 'Academy', colour: '#3FA34D',
    setup: [{ key: 'pictures', title: 'Pictures we add (each with its licence)', ready: true }, { key: 'qparent', title: 'Grades from QParent', ready: false }],
    reports: [] },
  { key: 'drawings', name: 'Anna’s Gallery', colour: '#C14D83',
    setup: [], reports: [] },
  { key: 'pets', name: 'Pets', colour: '#8A5A33',
    setup: [{ key: 'pets', title: 'Our pets: their pages, vet visits and reminders', ready: false }],
    reports: [] },
]
