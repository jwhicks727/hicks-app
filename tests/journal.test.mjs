// The journal's shape, its questions and its reader. Every entry here is made up:
// nobody's journal belongs in this repository.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { promptFor, seasonSet, parseJournalText, readImport, cleanEntry, onThisDay, journalBirthday, gratitudeWords, entriesWithWord, openDate, notesDue, agoWords, longDate } from '../src/lib/journal.js'

test('each weekday has its question, from the school-year set or summer’s, or none', () => {
  assert.equal(promptFor('2026-11-02').title, 'Set the target.') // a Monday in term
  assert.equal(promptFor('2026-07-13').title, 'Line up the fun.') // a Monday in summer
  assert.equal(promptFor('2026-10-31').title, 'Claim the day.') // Saturday
  assert.equal(promptFor('2026-11-01', 'summer').title, 'Zoom out.')
  assert.equal(promptFor('2026-11-01', 'none'), null)
  assert.equal(seasonSet('2026-06-14'), 'school'); assert.equal(seasonSet('2026-06-15'), 'summer'); assert.equal(seasonSet('2026-08-10'), 'school')
  const mine = Array.from({ length: 7 }, (_, i) => [`Day ${i}.`, `Question ${i}?`])
  assert.deepEqual(promptFor('2026-11-04', 'custom', mine), { title: 'Day 3.', prompt: 'Question 3?' })
  assert.equal(longDate('2026-10-31'), 'Saturday, October 31, 2026')
})

const DOC = `March 3, 2025
Gratitudes
1.​ I am grateful for the rain on the
roof last night.
2.​ I am grateful for warm socks.
3.​ I am grateful for pancakes.
Tuesday, March 4, 2025
The garden needs work, and that is fine. One bed at a time is how it
gets done, and the seedlings are already up.
Gratitudes
1.​ I am grateful for seedlings.
Thursday, March 4, 2025
Credit yourself. "What have I done well lately — and not just at
work?"
I kept the kitchen clean all week.
Gratitudes.
1.​ Kitties
2.​ Coffee
Friday, March 7, 2026
Claim the day. "What's something today that's just for me?"
A long walk.
Outlets
Music
●​ Records
●​ A live show on a big
screen
Nature
●​ Look at the sky
Saturday, March 8, 2025
Gratitudes
1.​ Sunrises`

test('a journal’s text becomes entries: question, answer, reflection, numbered gratitudes', () => {
  const { entries, outlets } = parseJournalText(DOC)
  assert.deepEqual(entries.map((e) => e.date), ['2025-03-03', '2025-03-04', '2025-03-06', '2025-03-07', '2025-03-08'])
  assert.equal(entries[0].gratitudes[0], 'I am grateful for the rain on the roof last night.')
  assert.equal(entries[0].gratitudes.length, 3)
  assert.match(entries[1].reflection, /^The garden needs work, and that is fine\. One bed at a time is how it gets done/)
  assert.equal(entries[2].prompt_title, 'Credit yourself.')
  assert.equal(entries[2].prompt, 'What have I done well lately — and not just at work?')
  assert.equal(entries[2].answer, 'I kept the kitchen clean all week.')
  assert.deepEqual(entries[2].gratitudes, ['Kitties', 'Coffee'])
  assert.equal(entries[3].answer, 'A long walk.')
  assert.deepEqual(outlets, [{ title: 'Music', items: ['Records', 'A live show on a big screen'] }, { title: 'Nature', items: ['Look at the sky'] }])
})

test('slips in the dates are put right from their neighbours', () => {
  // "Thursday, March 4" is the 6th; "March 7, 2026" sits among 2025's entries
  const { entries } = parseJournalText(DOC)
  assert.equal(entries[2].date, '2025-03-06')
  assert.equal(entries[3].date, '2025-03-07')
})

test('a file to bring in is checked field by field', () => {
  assert.throws(() => readImport({ entries: [] }), /isn’t a journal/)
  const r = readImport({ kind: 'teamhicks-journal', version: 1, entries: [{ date: '2025-03-03', gratitudes: ['Rain', 7, ''] }, { date: 'soon', gratitudes: ['x'] }, { date: '2025-03-04' }], outlets: [{ title: 'Music', items: ['Records', 3] }] })
  assert.equal(r.entries.length, 1)
  assert.deepEqual(r.entries[0].gratitudes, ['Rain'])
  assert.deepEqual(r.outlets, [{ title: 'Music', items: ['Records'] }])
})

test('an empty entry isn’t kept; a full one is trimmed', () => {
  assert.equal(cleanEntry({ on_date: '2026-10-31', answer: '  ', gratitudes: ['', ' '] }), null)
  assert.deepEqual(cleanEntry({ on_date: '2026-10-31', answer: ' A walk ', gratitudes: [' Rain ', ''] }).gratitudes, ['Rain'])
})

const ENTRIES = [
  { on_date: '2024-11-01', gratitudes: ['I am grateful for the rain.', 'I am grateful for my kitties.'] },
  { on_date: '2025-11-01', gratitudes: ['I’m grateful for sunrises!', 'Kitty cuddles'] },
  { on_date: '2025-11-02', gratitudes: ['The rain, again', 'Coffee'] },
]

test('on this day, and the journal’s birthday', () => {
  assert.deepEqual(onThisDay(ENTRIES, '2026-11-01').map((x) => x.years), [1, 2])
  assert.equal(journalBirthday(ENTRIES, '2026-11-01'), 2)
  assert.equal(journalBirthday(ENTRIES, '2026-11-02'), 0)
})

test('what comes up most in the gratitudes, and the entries behind a word', () => {
  const words = gratitudeWords(ENTRIES)
  assert.deepEqual(words.slice(0, 2).map(({ word, n }) => ({ word, n })), [{ word: 'kitty', n: 2 }, { word: 'rain', n: 2 }])
  assert.equal(gratitudeWords([{ gratitudes: ['Time with Laurie'] }, { gratitudes: ['I am grateful for Laurie'] }])[0].shown, 'Laurie')
  assert.deepEqual(entriesWithWord(ENTRIES, 'kitty').map((e) => e.on_date), ['2025-11-01', '2024-11-01'])
})

test('notes to your future self open on their day', () => {
  assert.equal(openDate('2026-10-31', 'week'), '2026-11-07')
  assert.equal(openDate('2026-10-31', 'surprise', () => 0), '2026-11-21')
  assert.equal(openDate('2026-10-31', 'surprise', () => 0.999), '2026-12-26')
  const notes = [{ id: 1, open_on: '2026-11-01', written_on: '2026-10-01' }, { id: 2, open_on: '2026-12-01', written_on: '2026-09-01' }, { id: 3, open_on: '2026-10-01', written_on: '2026-09-02', opened_at: 'x' }]
  assert.deepEqual(notesDue(notes, '2026-11-01').map((n) => n.id), [1])
  assert.equal(agoWords('2025-10-31', '2026-10-31'), 'a year ago')
  assert.equal(agoWords('2026-10-10', '2026-10-31'), '3 weeks ago')
})
