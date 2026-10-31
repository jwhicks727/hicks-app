// ============================================
// rooms.js -- every kind of room the academy can have, from the start
// ============================================
// Anna can add any of them, as many as she likes, name each, paint its walls,
// change its floor and fill it. Each comes furnished so it's lovely the
// moment it's added. A few have a job: the principal's office holds her
// goals, a classroom's board shows today's tasks, the Hall of Fame keeps
// every trophy, ribbon and cheer.

export const ROOM_N = 6 // squares a side

export const FLOORS = {
  wood: 'Wood', tile: 'Tiles', checker: 'Checkerboard', marble: 'Marble', carpet: 'Carpet', court: 'Court',
  stone: 'Stone', soil: 'Garden soil', water: 'Water', grass: 'Grass', stage: 'Stage', concrete: 'Concrete',
}
export const WALLS = ['#2F4A3A', '#3E7A4C', '#1E1E24', '#7A4E2D', '#E8D5B9', '#D8E8E4', '#5B3E8A', '#C8643B', '#F2E6D0', '#F2C14E', '#1C1B33', '#7A1F2B', '#F4C7B5', '#8AB6C9', '#2A2F5E', '#E3E7EE', '#F7E3C3', '#E9C9E8', '#9FD3C7', '#FFB4A2']

// [item, i, j, size]: what a new room comes with
export const ROOM_KINDS = {
  office: { name: 'Principal’s office', sign: 'crown', wall: '#2F4A3A', floor: 'wood', detail: 'goals', blurb: 'Her goals, on the board', items: [['chair', 2, 1], ['globe-showing-americas', 0, 3, 0.8], ['potted-plant', 0, 0], ['books', 1, 0, 0.8], ['trophy', 4, 0, 0.8], ['couch-and-lamp', 4, 4, 1.2]] },
  classroom: { name: 'Classroom', sign: 'pencil', wall: '#3E7A4C', floor: 'tile', detail: 'tasks', blurb: 'Today’s tasks on the board', items: [['chair', 2, 2], ['chair', 4, 2], ['chair', 2, 4], ['chair', 4, 4], ['backpack', 3, 3, 0.7], ['globe-showing-americas', 5, 0, 0.8], ['books', 0, 5, 0.8], ['alarm-clock', 1, 1, 0.6]] },
  hall: { name: 'Hall of Fame', sign: 'trophy', wall: '#1E1E24', floor: 'marble', detail: 'fame', blurb: 'Every trophy, ribbon and cheer', items: [['crown', 3, 3, 0.9], ['sparkles', 1, 4, 0.7], ['potted-plant', 5, 5]] },
  library: { name: 'Library', sign: 'books', wall: '#7A4E2D', floor: 'wood', detail: 'shelves', blurb: 'Shelves to the ceiling', items: [['couch-and-lamp', 3, 3, 1.2], ['open-book', 2, 4, 0.6], ['books', 4, 1, 0.9], ['potted-plant', 5, 5], ['teddy-bear', 1, 2, 0.7], ['hot-beverage', 3, 2, 0.5]] },
  art: { name: 'Art studio', sign: 'artist-palette', wall: '#E8D5B9', floor: 'concrete', detail: 'art', blurb: 'Paint everywhere', items: [['artist-palette', 2, 2], ['paintbrush', 3, 2, 0.7], ['crayon', 4, 3, 0.6], ['framed-picture', 1, 0], ['framed-picture', 0, 2], ['chair', 3, 3], ['yarn', 5, 4, 0.7]] },
  lab: { name: 'Science lab', sign: 'test-tube', wall: '#D8E8E4', floor: 'tile', detail: 'lab', blurb: 'Bubbling beakers', items: [['microscope', 2, 1], ['test-tube', 3, 1, 0.7], ['alembic', 1, 2, 0.8], ['dna', 4, 4, 0.8], ['magnet', 2, 4, 0.7], ['atom-symbol', 0, 0, 0.8]] },
  music: { name: 'Music room', sign: 'musical-notes', wall: '#5B3E8A', floor: 'wood', detail: 'music', blurb: 'A stage for every instrument', items: [['musical-keyboard', 1, 1, 1.1], ['guitar', 3, 1], ['drum', 4, 3], ['violin', 1, 3, 0.9], ['microphone', 3, 4, 0.8], ['headphone', 5, 5, 0.7]] },
  gym: { name: 'Gym', sign: 'basketball', wall: '#C8643B', floor: 'court', detail: 'gym', blurb: 'Court lines and a hoop', items: [['basketball', 3, 3, 0.7], ['soccer-ball', 1, 4, 0.7], ['volleyball', 4, 1, 0.7], ['trophy', 0, 0, 0.8], ['running-shoe', 5, 5, 0.6]] },
  chapel: { name: 'Chapel', sign: 'latin-cross', wall: '#F2E6D0', floor: 'stone', detail: 'chapel', blurb: 'Stained glass and candles', items: [['candle', 1, 0, 0.7], ['candle', 0, 1, 0.7], ['dove', 0, 0, 0.8], ['folded-hands', 3, 3, 0.7], ['bouquet', 2, 1, 0.8], ['prayer-beads', 4, 2, 0.6]] },
  cafe: { name: 'Cafeteria', sign: 'pizza', wall: '#F2C14E', floor: 'checker', detail: 'menu', blurb: 'Today’s menu on the board', items: [['pizza', 2, 2, 0.7], ['taco', 3, 3, 0.7], ['bubble-tea', 4, 2, 0.6], ['cupcake', 2, 4, 0.6], ['chair', 1, 3], ['chair', 3, 1], ['ice-cream', 5, 5, 0.7]] },
  greenhouse: { name: 'Greenhouse', sign: 'seedling', wall: 'glass', floor: 'soil', detail: 'glass', blurb: 'Glass walls and growing things', items: [['sunflower', 1, 1], ['tulip', 2, 1, 0.8], ['potted-plant', 1, 3], ['cactus', 4, 1, 0.8], ['herb', 3, 3, 0.7], ['seedling', 4, 4, 0.7], ['butterfly', 2, 2, 0.6], ['mushroom', 5, 3, 0.6]] },
  observatory: { name: 'Observatory', sign: 'telescope', wall: '#1C1B33', floor: 'wood', detail: 'stars', blurb: 'The real moon in its window', items: [['telescope', 2, 2, 1.2], ['ringed-planet', 4, 1, 0.8], ['rocket', 1, 4, 0.9], ['comet', 4, 4, 0.7], ['crystal-ball', 0, 2, 0.7]] },
  theater: { name: 'Theater', sign: 'performing-arts', wall: '#7A1F2B', floor: 'stage', detail: 'theater', blurb: 'Red curtains and a stage', items: [['microphone', 3, 3, 0.9], ['performing-arts', 1, 1], ['clapper-board', 4, 1, 0.7], ['ballet-shoes', 2, 4, 0.7], ['admission-tickets', 5, 4, 0.6]] },
  pets: { name: 'Cat café', sign: 'cat', wall: '#F4C7B5', floor: 'carpet', detail: 'paws', blurb: 'Cats, cushions and tea', items: [['cat', 2, 2], ['black-cat', 4, 1], ['cat', 1, 4, 0.9], ['teapot', 3, 3, 0.6], ['cupcake', 4, 4, 0.6], ['basket', 0, 0, 0.8], ['yarn', 3, 5, 0.6]] },
  commons: { name: 'Common room', sign: 'couch-and-lamp', wall: '#8AB6C9', floor: 'carpet', detail: 'lights', blurb: 'Couches and string lights', items: [['couch-and-lamp', 2, 1, 1.3], ['television', 0, 3], ['teddy-bear', 3, 3, 0.7], ['potted-plant', 5, 0], ['game-die', 4, 4, 0.6], ['hot-beverage', 3, 2, 0.5]] },
  games: { name: 'Game room', sign: 'video-game', wall: '#2A2F5E', floor: 'carpet', detail: 'neon', blurb: 'Neon and arcade', items: [['joystick', 1, 1], ['video-game', 3, 1, 0.8], ['pool-8-ball', 3, 3, 0.7], ['chess-pawn', 1, 4, 0.8], ['puzzle-piece', 4, 4, 0.7], ['game-die', 5, 2, 0.6]] },
  computer: { name: 'Computer lab', sign: 'laptop', wall: '#E3E7EE', floor: 'tile', detail: 'code', blurb: 'Screens and code', items: [['desktop-computer', 1, 1], ['desktop-computer', 3, 1], ['laptop', 2, 3, 0.8], ['keyboard', 4, 3, 0.7], ['headphone', 1, 4, 0.6], ['printer', 5, 0, 0.8]] },
  bakery: { name: 'Bakery', sign: 'croissant', wall: '#F7E3C3', floor: 'checker', detail: 'bakery', blurb: 'Warm from the oven', items: [['croissant', 1, 1, 0.8], ['bread', 2, 1, 0.8], ['birthday-cake', 3, 3, 0.9], ['cookie', 4, 2, 0.6], ['doughnut', 2, 4, 0.6], ['cooking', 0, 3, 0.8], ['shortcake', 4, 4, 0.7]] },
  pool: { name: 'Pool', sign: 'dolphin', wall: '#DDEFF5', floor: 'water', detail: 'pool', blurb: 'Splash', items: [['dolphin', 3, 2, 0.9], ['tropical-fish', 2, 4, 0.6], ['beach-with-umbrella', 0, 0], ['duck', 4, 4, 0.6], ['whale', 1, 1, 0.8]] },
  courtyard: { name: 'Courtyard', sign: 'fountain', wall: 'none', floor: 'grass', detail: 'courtyard', blurb: 'Open sky, a fountain', items: [['fountain', 2, 2, 1.3], ['deciduous-tree', 0, 0, 1.2], ['evergreen-tree', 5, 0, 1.1], ['cherry-blossom', 0, 5, 0.9], ['butterfly', 4, 3, 0.6], ['rabbit', 3, 5, 0.7], ['sunflower', 5, 4, 0.9]] },
  dorm: { name: 'Dorm room', sign: 'bed', wall: '#E9C9E8', floor: 'wood', detail: 'lights', blurb: 'A bed, posters, fairy lights', items: [['bed', 1, 1, 1.3], ['teddy-bear', 3, 1, 0.7], ['mirror', 0, 3], ['potted-plant', 5, 0], ['headphone', 3, 3, 0.6], ['dress', 4, 4, 0.8]] },
}
export const KIND_ORDER = Object.keys(ROOM_KINDS)

// Each kind's own colour, light to deep, for its tile on the buttons and the campus's list
export const KIND_COLOURS = {
  office: ['#C4B5FD', '#7C3AED'], classroom: ['#86EFAC', '#16A34A'], hall: ['#FDE68A', '#D97706'], library: ['#FDBA74', '#B45309'],
  art: ['#F9A8D4', '#DB2777'], lab: ['#5EEAD4', '#0F766E'], music: ['#A5B4FC', '#4338CA'], gym: ['#FDBA74', '#EA580C'],
  chapel: ['#BFDBFE', '#3B82F6'], cafe: ['#FCA5A5', '#DC2626'], greenhouse: ['#D9F99D', '#4D7C0F'], observatory: ['#818CF8', '#1E1B4B'],
  theater: ['#FDA4AF', '#9F1239'], pets: ['#BAE6FD', '#0284C7'], commons: ['#A5F3FC', '#0891B2'], games: ['#F0ABFC', '#A21CAF'],
  computer: ['#CBD5E1', '#475569'], bakery: ['#EAD7C7', '#7C4A2D'], pool: ['#7DD3FC', '#0369A1'], courtyard: ['#6EE7B7', '#047857'],
  dorm: ['#E9D5FF', '#9333EA'],
}
export const kindColours = (kind) => KIND_COLOURS[kind] || KIND_COLOURS.classroom

/** A new room of a kind: furnished, on the first free square of the campus. */
export function newRoom(kind, rooms, campusN) {
  const k = ROOM_KINDS[kind] || ROOM_KINDS.classroom
  const spot = freeSquare(rooms, campusN)
  return {
    kind, name: k.name, cx: spot.i, cy: spot.j, sort: rooms.length,
    style: { wall: k.wall, floor: k.floor },
    items: k.items.map(([key, i, j, s = 1], n) => ({ id: `${kind}-${n}`, k: key, i, j, s })),
  }
}

/** The campus grows with its rooms, a ring at a time. */
export const campusSize = (count) => Math.max(5, Math.min(10, Math.ceil(Math.sqrt(count + 1)) + 2))

/** The free square nearest the middle of the campus, the front ones first: it grows outward. */
export function freeSquare(rooms, n) {
  const used = new Set(rooms.map((r) => `${r.cx},${r.cy}`))
  const cells = [], mid = (n - 1) / 2
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) cells.push({ i, j, d: Math.abs(i - mid) + Math.abs(j - mid) })
  cells.sort((a, b) => a.d - b.d || (b.i + b.j) - (a.i + a.j) || a.i - b.i)
  const c = cells.find((x) => !used.has(`${x.i},${x.j}`))
  return c ? { i: c.i, j: c.j } : { i: 0, j: 0 }
}

/** An item moved by one square, kept on the floor. */
export function moveItem(it, di, dj, n = ROOM_N) {
  return { ...it, i: Math.min(n - 1, Math.max(0, it.i + di)), j: Math.min(n - 1, Math.max(0, it.j + dj)) }
}
/** A room moved on the campus, unless another room is there. */
export function moveRoom(room, di, dj, rooms, n) {
  const i = Math.min(n - 1, Math.max(0, room.cx + di)), j = Math.min(n - 1, Math.max(0, room.cy + dj))
  if (rooms.some((r) => r.id !== room.id && r.cx === i && r.cy === j)) return room
  return { ...room, cx: i, cy: j }
}
