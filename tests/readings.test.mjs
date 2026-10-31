import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readingsPageUrl, parseReadings, textOf } from '../supabase/functions/_shared/readings.js'

// Shaped like USCCB's readings page as known (unverified against today's site).
const PAGE = `<html><head><title>Christmas Vigil Mass | USCCB</title><script>var x = "<h3>Reading I</h3>"</script></head><body>
<div class="b-lectionary"><div class="innerblock"><h2>The Nativity of the Lord (Christmas)</h2><p>Lectionary: 13</p></div></div>
<ul class="masses"><li><a href="/bible/readings/122526-Vigil.cfm">Vigil Mass</a></li><li><a href="/bible/readings/122526-Night.cfm">Mass at Night</a></li><li><a href="/bible/readings/122526-Dawn.cfm">Mass at Dawn</a></li><li><a href="/bible/readings/122526-Day.cfm">Mass during the Day</a></li><li><a href="/bible/readings/122626.cfm">Tomorrow</a></li></ul>
<div class="wr-block b-verse"><div class="innerblock"><div class="content-header"><h3 class="name">Reading I</h3><div class="address"><a href="https://bible.usccb.org/bible/isaiah/62?1">Is 62:1-5</a></div></div>
<div class="content-body">For Zion&rsquo;s sake I will not be silent,<br />for Jerusalem&#8217;s sake I will not be quiet.</div></div></div>
<div class="wr-block b-verse"><div class="innerblock"><div class="content-header"><h3 class="name">Responsorial Psalm</h3><div class="address"><a href="#">Ps 89:4-5, 16-17, 27, 29</a></div></div>
<div class="content-body"><p>R. (2a) For ever I will sing the goodness of the Lord.</p><p>I have made a covenant with my chosen one.</p></div></div></div>
<div class="wr-block b-verse"><div class="innerblock"><div class="content-header"><h3 class="name">Gospel</h3><div class="address"><a href="#">Mt 1:1-25</a></div></div>
<div class="content-body">The book of the genealogy of Jesus Christ &amp; more.<img src=x onerror=alert(1)></div></div></div>
<h3>Other things</h3><div class="content-body">Not a reading</div>
</body></html>`

test('the page for a date, and for each of its Masses', () => {
  assert.equal(readingsPageUrl('2026-12-25'), 'https://bible.usccb.org/bible/readings/122526.cfm')
  assert.equal(readingsPageUrl('2026-12-25', 'Vigil'), 'https://bible.usccb.org/bible/readings/122526-Vigil.cfm')
  assert.equal(readingsPageUrl('2026-12-25', '../../etc'), 'https://bible.usccb.org/bible/readings/122526.cfm', 'odd variants are dropped')
  assert.equal(readingsPageUrl('soon'), null)
})

test('a page becomes its readings, in order, as plain text', () => {
  const r = parseReadings(PAGE, '2026-12-25')
  assert.equal(r.title, 'The Nativity of the Lord (Christmas)'); assert.equal(r.lectionary, '13')
  assert.deepEqual(r.readings.map((x) => [x.name, x.citation]), [['Reading I', 'Is 62:1-5'], ['Responsorial Psalm', 'Ps 89:4-5, 16-17, 27, 29'], ['Gospel', 'Mt 1:1-25']])
  assert.equal(r.readings[0].text, 'For Zion’s sake I will not be silent,\nfor Jerusalem’s sake I will not be quiet.')
  assert.match(r.readings[1].text, /^R\. \(2a\) For ever/)
  assert.doesNotMatch(r.readings[2].text, /<|onerror/)
  assert.deepEqual(r.masses.map((m) => m.variant), ['Vigil', 'Night', 'Dawn', 'Day'])
})

test('an unrecognised page gives no readings rather than a guess', () => {
  assert.deepEqual(parseReadings('<html><body><p>Page not found</p></body></html>', '2026-12-25').readings, [])
  assert.equal(textOf('a&nbsp;b &#x2014; c &bogus;'), 'a b — c &bogus;')
})
