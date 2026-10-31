// ============================================
// mindful.js -- a line a day from Thich Nhat Hanh and the Buddha's teaching,
// a word now and then on what the teaching means, the line that opens a
// morning sit, and the bowl that starts and ends it.
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

// Lines to clear the mind before sitting: short, and nothing to do but sit.
// The Dhammapada in Max Müller's 1881 translation; the old Zen sayings and
// the suttas' own short phrases belong to everyone.
export const SIT_LINES = [
  ['When sitting, just sit.', 'a Zen saying'],
  ['Let go of what is before, let go of what is behind, let go of what is between.', 'The Dhammapada, 348'],
  ['As a solid rock is not shaken by the wind, the wise are not moved by blame or praise.', 'The Dhammapada, 81'],
  ['Wise people become serene, like a deep, smooth, and still lake.', 'The Dhammapada, 82'],
  ['Nothing whatsoever should be clung to.', 'the Buddha, Majjhima Nikāya 37'],
  ['Breathing in a long breath, know that you breathe in long.', 'the Ānāpānasati Sutta'],
  ['Be a lamp unto yourselves.', 'the Buddha, the Mahāparinibbāna Sutta'],
  ['I have arrived. I am home.', 'Thich Nhat Hanh'],
  ['All that we are is the result of what we have thought.', 'The Dhammapada, 1'],
  ['Just this.', 'a Zen saying'],
]
/** The line for a morning's sit: one a day, in turn. */
export function sitLineFor(date) {
  const n = Math.round(Date.parse(date + 'T12:00:00Z') / 864e5)
  return SIT_LINES[((n % SIT_LINES.length) + SIT_LINES.length) % SIT_LINES.length]
}

// A word on the teaching, lightly: one each Sunday, for someone who reads
// about it and doesn't practise it as a religion. A few plain sentences and
// one small thing to try that week; never a lesson plan.
export const TEACHINGS = [
  { name: 'Impermanence', word: 'Everything that arises passes: moods, seasons, our own cells. Seeing it plainly is meant to loosen our grip, not to make us sad.', try: 'Notice one thing this week that is already changing, and enjoy it while it lasts.' },
  { name: 'The middle way', word: 'The Buddha tried luxury and then hard austerity, and found the path ran between them: neither indulging nor punishing yourself.', try: 'Find one place where you are pushing too hard, or not at all, and ease toward the middle.' },
  { name: 'Interbeing', word: 'Thich Nhat Hanh’s word for how nothing exists on its own: there is a cloud in this sheet of paper, because without rain no tree would grow.', try: 'At one meal, think of everyone and everything it took to reach your plate.' },
  { name: 'Loving-kindness', word: 'Metta: wishing well to yourself, then to someone you love, someone neutral, someone difficult, and finally everyone.', try: 'After your sit, wish one difficult person well: “May you be at ease.”' },
  { name: 'The four noble truths', word: 'There is suffering; it has causes, chiefly craving; it can end; and there is a path to its ending. A doctor’s diagnosis more than a creed.', try: 'When something stings this week, ask quietly what you were wanting.' },
  { name: 'Right speech', word: 'Speech that is true, kind, helpful and well-timed, and silence when it would be none of those.', try: 'Before one hard conversation, ask: is it true, is it kind, is it needed now?' },
  { name: 'Beginner’s mind', word: 'Meeting each moment, even a familiar one, as if for the first time, without the expert’s certainty about what it is.', try: 'Cook one dish you know well as if you had never made it.' },
  { name: 'Equanimity', word: 'Upekkha: a steadiness that stays with you through praise and blame, gain and loss. It is calm, not indifference.', try: 'When news is good or bad this week, take one breath before you react.' },
  { name: 'Sympathetic joy', word: 'Mudita: being glad for others’ good fortune, as if it were your own. It is the cure the teaching offers for envy.', try: 'Tell someone you’re glad about something good that happened to them.' },
  { name: 'Compassion', word: 'Karuna: the wish that others be free of suffering, with the willingness to stay present with it rather than look away.', try: 'Sit with someone’s trouble for a minute longer than is comfortable, without fixing it.' },
  { name: 'The present moment', word: 'The past is gone and the future has not come; life is only available here. Thich Nhat Hanh called it the one appointment we must keep.', try: 'Wash the dishes just to wash the dishes, once this week.' },
  { name: 'The three jewels', word: 'The Buddha (the one who woke up), the Dharma (what he taught) and the Sangha (the community that practises it): what Buddhists take refuge in.', try: 'Think of who your own sangha is: the people who help you live well.' },
]
/** On a Sunday, the week's word on the teaching, in turn; otherwise null. */
export function teachingFor(date) {
  const d = new Date(Date.parse(date + 'T12:00:00Z'))
  if (d.getUTCDay() !== 0) return null
  const week = Math.floor(Date.parse(date + 'T12:00:00Z') / (7 * 864e5))
  return TEACHINGS[((week % TEACHINGS.length) + TEACHINGS.length) % TEACHINGS.length]
}

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
