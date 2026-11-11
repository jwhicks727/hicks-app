// ============================================
// items.js -- what can go in a room of the academy
// ============================================
// Each picture is from Microsoft's Fluent Emoji (MIT licence, made by
// Microsoft's designers), drawn once to public/academy/items/<key>.webp by
// scripts/academy-art.mjs; the licence is beside them. Pictures the family
// adds (a pack bought for her, say) live in the private `academy` bucket
// with their own licence recorded (src/academy/Assets.jsx).
//
// `earned`: only placed by doing something (a goal reached, a grade, a
// celebration), never picked from the catalog.

export const CATEGORIES = ['School', 'Furniture', 'Science & space', 'Art & music', 'Sports', 'Faith', 'Food', 'Animals', 'Plants & nature', 'Fun', 'Seasons', 'Prizes']

// A few read better with their own names
const NAMES = { 'couch-and-lamp': 'Couch and lamp', 'globe-showing-americas': 'Globe', 'magnifying-glass-tilted-left': 'Magnifying glass', 'hourglass-not-done': 'Hourglass', 'snowman-without-snow': 'Snowman', 'sun-with-face': 'Sun', 'diya-lamp': 'Little lamp', 'pool-8-ball': 'Pool ball', 'lady-beetle': 'Ladybug', '1st-place-medal': 'Gold medal', '2nd-place-medal': 'Silver medal', '3rd-place-medal': 'Bronze medal', 'reminder-ribbon': 'Ribbon', ribbon: 'Bow', 'musical-notes': 'Music notes', 'atom-symbol': 'Atom', 'spiral-calendar': 'Desk calendar', 'card-file-box': 'File box', 'beach-with-umbrella': 'Beach' }
const L = (cat, list) => list.trim().split(/\s+/).map((k) => ({ k, cat, name: NAMES[k] || k.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) }))

export const ITEMS = [
  ...L('School', 'books open-book blue-book green-book orange-book closed-book notebook ledger scroll memo pencil crayon straight-ruler triangular-ruler abacus globe-showing-americas world-map compass backpack graduation-cap school bell alarm-clock mantelpiece-clock hourglass-not-done stopwatch calendar spiral-calendar pushpin paperclip scissors magnifying-glass-tilted-left light-bulb desktop-computer laptop keyboard printer placard file-cabinet card-file-box'),
  ...L('Furniture', 'chair couch-and-lamp bed door window mirror bathtub framed-picture television radio teddy-bear basket broom bucket diya-lamp flashlight candle'),
  ...L('Science & space', 'telescope microscope test-tube alembic dna magnet atom-symbol rocket satellite ringed-planet milky-way comet crescent-moon crystal-ball'),
  ...L('Art & music', 'artist-palette paintbrush yarn thread sewing-needle camera film-projector clapper-board performing-arts musical-keyboard guitar violin trumpet saxophone drum long-drum accordion banjo microphone studio-microphone headphone musical-notes ballet-shoes'),
  ...L('Sports', 'basketball soccer-ball volleyball american-football baseball softball tennis badminton ping-pong ice-skate roller-skate skateboard goal-net bowling running-shoe'),
  ...L('Faith', 'church latin-cross dove folded-hands prayer-beads'),
  ...L('Food', 'cookie cupcake birthday-cake shortcake doughnut croissant bread pizza taco bubble-tea ice-cream teapot hot-beverage bowl-with-spoon cooking green-apple red-apple strawberry cherries grapes watermelon rice-ball sushi dumpling'),
  ...L('Animals', 'bird cat black-cat dog guide-dog fish tropical-fish turtle hamster rabbit parrot owl unicorn dragon tiger leopard eagle hedgehog butterfly lady-beetle snail frog duck swan peacock flamingo koala panda sloth otter fox bear lion horse penguin whale dolphin octopus jellyfish'),
  ...L('Plants & nature', 'potted-plant evergreen-tree deciduous-tree palm-tree cactus sunflower tulip rose hibiscus cherry-blossom blossom bouquet seedling herb four-leaf-clover mushroom fountain rock wood coral bubbles'),
  ...L('Fun', 'video-game joystick game-die puzzle-piece chess-pawn pool-8-ball magic-wand nesting-dolls kite balloon party-popper confetti-ball wrapped-gift tent carousel-horse ferris-wheel circus-tent admission-tickets t-shirt dress rainbow sparkles glowing-star shooting-star'),
  ...L('Seasons', 'jack-o-lantern ghost bat spider-web maple-leaf fallen-leaf christmas-tree snowman-without-snow snowflake fireworks sparkler beach-with-umbrella sun-with-face'),
  ...L('Prizes', 'trophy sports-medal 1st-place-medal 2nd-place-medal 3rd-place-medal military-medal rosette reminder-ribbon ribbon crown gem-stone star').map((x) => ({ ...x, earned: true })),
]
export const ITEM = Object.fromEntries(ITEMS.map((x) => [x.k, x]))
export const itemSrc = (k) => `/academy/items/${k}.webp`
