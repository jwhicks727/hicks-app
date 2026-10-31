// ============================================
// mindful.js -- a line a day from Thich Nhat Hanh, and a few from the
// Dhammapada; and the bowl that starts and ends a breathing pause.
// ============================================
// Thay's words are his publishers' (Parallax Press, Plum Village): short
// lines, credited, read privately by the family. The Dhammapada lines are
// Max Müller's 1881 translation, which belongs to everyone.

export const WORDS = [
  ['Breathing in, I calm my body. Breathing out, I smile. Dwelling in the present moment, I know this is a wonderful moment.', 'Thich Nhat Hanh', 'Being Peace'],
  ['Walk as if you are kissing the Earth with your feet.', 'Thich Nhat Hanh', 'Peace Is Every Step'],
  ['Feelings come and go like clouds in a windy sky. Conscious breathing is my anchor.', 'Thich Nhat Hanh', 'Stepping into Freedom'],
  ['People usually consider walking on water or in thin air a miracle. But I think the real miracle is not to walk either on water or in thin air, but to walk on earth.', 'Thich Nhat Hanh', 'The Miracle of Mindfulness'],
  ['Waking up this morning, I smile. Twenty-four brand new hours are before me. I vow to live fully in each moment and to look at beings with eyes of compassion.', 'Thich Nhat Hanh', 'Present Moment Wonderful Moment'],
  ['Drink your tea slowly and reverently, as if it is the axis on which the world earth revolves: slowly, evenly, without rushing toward the future.', 'Thich Nhat Hanh', 'The Miracle of Mindfulness'],
  ['No mud, no lotus.', 'Thich Nhat Hanh', 'No Mud, No Lotus'],
  ['I have arrived. I am home.', 'Thich Nhat Hanh', 'a Plum Village practice'],
  ['Hope is important because it can make the present moment less difficult to bear. If we believe that tomorrow will be better, we can bear a hardship today.', 'Thich Nhat Hanh', 'Peace Is Every Step'],
  ['On the altar in my hermitage I have images of Buddha and Jesus, and every time I light incense, I touch both of them as my spiritual ancestors.', 'Thich Nhat Hanh', 'Living Buddha, Living Christ'],
  ['Smile, breathe and go slowly.', 'Thich Nhat Hanh', null],
  ['Hatred does not cease by hatred at any time: hatred ceases by love; this is an old rule.', 'The Dhammapada, 5', 'tr. Max Müller'],
  ['Even though a speech be a thousand words, but made up of senseless words, one word of sense is better, which if a man hears, he becomes quiet.', 'The Dhammapada, 100', 'tr. Max Müller'],
]
export const DISHES = ['While washing the dishes one should only be washing the dishes, which means that while washing the dishes one should be completely aware of the fact that one is washing the dishes.', 'Thich Nhat Hanh', 'The Miracle of Mindfulness']

/** The line for a date: the same all day, a different one tomorrow. */
export function wordsFor(date) {
  const n = Math.round(Date.parse(date + 'T12:00:00Z') / 864e5)
  return WORDS[((n % WORDS.length) + WORDS.length) % WORDS.length]
}

/** A struck bowl, made by the phone: a few slightly out-of-tune partials, ringing out. */
export function strikeBowl(ctx, volume = 0.25) {
  const now = ctx.currentTime
  ;[[220, 1, 7], [597, 0.5, 5], [1131, 0.25, 3.5], [1812, 0.12, 2.5]].forEach(([f, a, decay]) => {
    const o = ctx.createOscillator(), g = ctx.createGain()
    o.type = 'sine'; o.frequency.value = f
    g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(volume * a, now + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, now + decay)
    o.connect(g).connect(ctx.destination); o.start(now); o.stop(now + decay + 0.1)
  })
}
