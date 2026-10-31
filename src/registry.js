// ============================================
// registry.js -- what each place adds to Setup, Settings and Reports
// ============================================
// Add a place, a setup section or a report here and it appears in Setup and
// Reports by itself, as SOAR's module registry does. tests/registry.test.mjs
// keeps this list and the router in step.

export const REGISTRY = [
  { key: 'home', name: 'Home', colour: '#5F8A4A', setup: [], reports: [] },
  { key: 'world', name: 'World', colour: '#3BA3A8',
    setup: [{ key: 'stations', title: 'Weather stations', ready: false }, { key: 'places', title: 'Places we love', ready: false }],
    reports: [] },
  { key: 'calendar', name: 'Calendar', colour: '#3E7A4C',
    setup: [{ key: 'sources', title: 'Calendar sources', ready: true }, { key: 'family-days', title: 'Family days', ready: true }],
    reports: [{ key: 'sources', title: 'Calendar sources', blurb: 'Every source, what it covers, and which need rolling over', ready: true },
      { key: 'family-days', title: 'Family days', blurb: 'The days we keep, and what’s coming next', ready: true }] },
  { key: 'kitchen', name: 'Kitchen', colour: '#F03E2F',
    setup: [{ key: 'food-rules', title: 'Food rules (Jason and Laurie only)', ready: false }],
    reports: [] },
  { key: 'lifelist', name: 'Life List', colour: '#5F8A4A',
    setup: [{ key: 'ebird', title: 'Laurie’s eBird account (her yes)', ready: false }],
    reports: [] },
  { key: 'music', name: 'Music', colour: '#8A5BC4',
    setup: [{ key: 'artists', title: 'Our favourite artists', ready: false }, { key: 'scouts', title: 'The daily scouts', ready: false }],
    reports: [] },
]
