// ============================================
// liturgy.js -- the Church's day for any date: the General Roman Calendar
// with the United States' proper days, as kept in the Diocese of San
// Bernardino (Province of Los Angeles)
// ============================================
// Worked out here rather than by a package, with tests against known years
// (tests/liturgy.test.mjs). Which day wins follows the Church's Table of
// Liturgical Days: each candidate gets its row number there (`PREC`), and the
// lower number wins. In this province the Ascension and Corpus Christi are
// kept on Sundays, and the Epiphany on the Sunday from January 2 to 8.
// The saints' list follows the U.S. calendar as we know it; anything added
// since (a new optional memorial) is a line in SANCTORAL.

import { ds, parts, addDays, dow, diffDays, sundayOnOrBefore, sundayOnOrAfter, WEEKDAYS, ordinalWord, ordinal } from './dates.js'

export const COLOURS = { white: '#D9B95A', red: '#B8322A', violet: '#6B4A8E', rose: '#D98AA6', green: '#3E7A4C' }
export const COLOUR_NAMES = { white: 'White', red: 'Red', violet: 'Violet', rose: 'Rose', green: 'Green' }

/** Rows of the Table of Liturgical Days (lower wins). */
const PREC = { triduum: 1, principal: 2, solemnity: 3, souls: 3, lordFeast: 5, sunday: 6, feast: 7, privileged: 9, memorial: 10, optional: 12, weekday: 13 }
const RANK_WORDS = { triduum: 'Paschal Triduum', principal: 'Solemnity', solemnity: 'Solemnity', souls: 'Commemoration', lordFeast: 'Feast', sunday: 'Sunday', feast: 'Feast', privileged: 'Weekday', memorial: 'Memorial', optional: 'Optional memorial', weekday: 'Weekday' }

/** Easter Sunday (the Anonymous Gregorian computus). */
export function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451)
  return ds(y, Math.floor((h + l - 7 * m + 114) / 31), ((h + l - 7 * m + 114) % 31) + 1)
}

/** The moveable days of a calendar year. */
export function keyDates(y) {
  const e = easter(y)
  const epiphany = sundayOnOrAfter(ds(y, 1, 2))
  const baptism = parts(epiphany)[2] >= 7 ? addDays(epiphany, 1) : addDays(epiphany, 7)
  const advent1 = sundayOnOrAfter(ds(y, 11, 27))
  let holyFamily = sundayOnOrAfter(ds(y, 12, 26))
  if (holyFamily > ds(y, 12, 31)) holyFamily = ds(y, 12, 30)
  return {
    epiphany, baptism, ashWednesday: addDays(e, -46), lent1: addDays(e, -42), palmSunday: addDays(e, -7),
    holyThursday: addDays(e, -3), goodFriday: addDays(e, -2), holySaturday: addDays(e, -1), easter: e,
    divineMercy: addDays(e, 7), ascension: addDays(e, 42), pentecost: addDays(e, 49),
    maryMotherOfChurch: addDays(e, 50), trinity: addDays(e, 56), corpusChristi: addDays(e, 63),
    sacredHeart: addDays(e, 68), immaculateHeart: addDays(e, 69), christTheKing: addDays(advent1, -7),
    advent1, christmas: ds(y, 12, 25), holyFamily,
  }
}

// The saints and fixed feasts: [MM-DD, name, rank, colour].
export const SANCTORAL = [
  ['01-01', 'Mary, the Holy Mother of God', 'solemnity', 'white'],
  ['01-02', 'Sts Basil the Great and Gregory Nazianzen', 'memorial', 'white'],
  ['01-03', 'The Most Holy Name of Jesus', 'optional', 'white'],
  ['01-04', 'St Elizabeth Ann Seton', 'memorial', 'white'],
  ['01-05', 'St John Neumann', 'memorial', 'white'],
  ['01-06', 'St André Bessette', 'optional', 'white'],
  ['01-07', 'St Raymond of Penyafort', 'optional', 'white'],
  ['01-13', 'St Hilary', 'optional', 'white'],
  ['01-17', 'St Anthony, Abbot', 'memorial', 'white'],
  ['01-20', 'St Fabian, or St Sebastian', 'optional', 'red'],
  ['01-21', 'St Agnes', 'memorial', 'red'],
  ['01-23', 'St Vincent, or St Marianne Cope', 'optional', 'white'],
  ['01-24', 'St Francis de Sales', 'memorial', 'white'],
  ['01-25', 'The Conversion of St Paul', 'feast', 'white'],
  ['01-26', 'Sts Timothy and Titus', 'memorial', 'white'],
  ['01-27', 'St Angela Merici', 'optional', 'white'],
  ['01-28', 'St Thomas Aquinas', 'memorial', 'white'],
  ['01-31', 'St John Bosco', 'memorial', 'white'],
  ['02-02', 'The Presentation of the Lord', 'lordFeast', 'white'],
  ['02-03', 'St Blaise, or St Ansgar', 'optional', 'red'],
  ['02-05', 'St Agatha', 'memorial', 'red'],
  ['02-06', 'St Paul Miki and Companions', 'memorial', 'red'],
  ['02-08', 'St Jerome Emiliani, or St Josephine Bakhita', 'optional', 'white'],
  ['02-10', 'St Scholastica', 'memorial', 'white'],
  ['02-11', 'Our Lady of Lourdes', 'optional', 'white'],
  ['02-14', 'Sts Cyril and Methodius', 'memorial', 'white'],
  ['02-17', 'The Seven Holy Founders of the Servite Order', 'optional', 'white'],
  ['02-21', 'St Peter Damian', 'optional', 'white'],
  ['02-22', 'The Chair of St Peter', 'feast', 'white'],
  ['02-23', 'St Polycarp', 'memorial', 'red'],
  ['02-27', 'St Gregory of Narek', 'optional', 'white'],
  ['03-03', 'St Katharine Drexel', 'optional', 'white'],
  ['03-04', 'St Casimir', 'optional', 'white'],
  ['03-07', 'Sts Perpetua and Felicity', 'memorial', 'red'],
  ['03-08', 'St John of God', 'optional', 'white'],
  ['03-09', 'St Frances of Rome', 'optional', 'white'],
  ['03-17', 'St Patrick', 'optional', 'white'],
  ['03-18', 'St Cyril of Jerusalem', 'optional', 'white'],
  ['03-19', 'St Joseph, Spouse of the Blessed Virgin Mary', 'solemnity', 'white'],
  ['03-23', 'St Turibius of Mogrovejo', 'optional', 'white'],
  ['03-25', 'The Annunciation of the Lord', 'solemnity', 'white'],
  ['04-02', 'St Francis of Paola', 'optional', 'white'],
  ['04-04', 'St Isidore', 'optional', 'white'],
  ['04-05', 'St Vincent Ferrer', 'optional', 'white'],
  ['04-07', 'St John Baptist de la Salle', 'memorial', 'white'],
  ['04-11', 'St Stanislaus', 'memorial', 'red'],
  ['04-13', 'St Martin I', 'optional', 'red'],
  ['04-21', 'St Anselm', 'optional', 'white'],
  ['04-23', 'St George, or St Adalbert', 'optional', 'red'],
  ['04-24', 'St Fidelis of Sigmaringen', 'optional', 'red'],
  ['04-25', 'St Mark', 'feast', 'red'],
  ['04-28', 'St Peter Chanel, or St Louis Grignion de Montfort', 'optional', 'red'],
  ['04-29', 'St Catherine of Siena', 'memorial', 'white'],
  ['04-30', 'St Pius V', 'optional', 'white'],
  ['05-01', 'St Joseph the Worker', 'optional', 'white'],
  ['05-02', 'St Athanasius', 'memorial', 'white'],
  ['05-03', 'Sts Philip and James', 'feast', 'red'],
  ['05-10', 'St Damien de Veuster, or St John of Avila', 'optional', 'white'],
  ['05-12', 'Sts Nereus and Achilleus, or St Pancras', 'optional', 'red'],
  ['05-13', 'Our Lady of Fatima', 'optional', 'white'],
  ['05-14', 'St Matthias', 'feast', 'red'],
  ['05-15', 'St Isidore the Farmer', 'optional', 'white'],
  ['05-18', 'St John I', 'optional', 'red'],
  ['05-20', 'St Bernardine of Siena', 'optional', 'white'],
  ['05-21', 'St Christopher Magallanes and Companions', 'optional', 'red'],
  ['05-22', 'St Rita of Cascia', 'optional', 'white'],
  ['05-25', 'St Bede the Venerable, St Gregory VII, or St Mary Magdalene de’ Pazzi', 'optional', 'white'],
  ['05-26', 'St Philip Neri', 'memorial', 'white'],
  ['05-27', 'St Augustine of Canterbury', 'optional', 'white'],
  ['05-29', 'St Paul VI', 'optional', 'white'],
  ['05-31', 'The Visitation of the Blessed Virgin Mary', 'feast', 'white'],
  ['06-01', 'St Justin', 'memorial', 'red'],
  ['06-02', 'Sts Marcellinus and Peter', 'optional', 'red'],
  ['06-03', 'Sts Charles Lwanga and Companions', 'memorial', 'red'],
  ['06-05', 'St Boniface', 'memorial', 'red'],
  ['06-06', 'St Norbert', 'optional', 'white'],
  ['06-09', 'St Ephrem', 'optional', 'white'],
  ['06-11', 'St Barnabas', 'memorial', 'red'],
  ['06-13', 'St Anthony of Padua', 'memorial', 'white'],
  ['06-19', 'St Romuald', 'optional', 'white'],
  ['06-21', 'St Aloysius Gonzaga', 'memorial', 'white'],
  ['06-22', 'St Paulinus of Nola, or Sts John Fisher and Thomas More', 'optional', 'red'],
  ['06-24', 'The Nativity of St John the Baptist', 'solemnity', 'white'],
  ['06-27', 'St Cyril of Alexandria', 'optional', 'white'],
  ['06-28', 'St Irenaeus', 'memorial', 'red'],
  ['06-29', 'Sts Peter and Paul, Apostles', 'solemnity', 'red'],
  ['06-30', 'The First Martyrs of the Holy Roman Church', 'optional', 'red'],
  ['07-01', 'St Junípero Serra', 'optional', 'white'],
  ['07-03', 'St Thomas, Apostle', 'feast', 'red'],
  ['07-05', 'St Elizabeth of Portugal, or St Anthony Zaccaria', 'optional', 'white'],
  ['07-06', 'St Maria Goretti', 'optional', 'red'],
  ['07-09', 'St Augustine Zhao Rong and Companions', 'optional', 'red'],
  ['07-11', 'St Benedict', 'memorial', 'white'],
  ['07-13', 'St Henry', 'optional', 'white'],
  ['07-14', 'St Kateri Tekakwitha', 'memorial', 'white'],
  ['07-15', 'St Bonaventure', 'memorial', 'white'],
  ['07-16', 'Our Lady of Mount Carmel', 'optional', 'white'],
  ['07-18', 'St Camillus de Lellis', 'optional', 'white'],
  ['07-20', 'St Apollinaris', 'optional', 'red'],
  ['07-21', 'St Lawrence of Brindisi', 'optional', 'white'],
  ['07-22', 'St Mary Magdalene', 'feast', 'white'],
  ['07-23', 'St Bridget of Sweden', 'optional', 'white'],
  ['07-24', 'St Sharbel Makhlūf', 'optional', 'white'],
  ['07-25', 'St James, Apostle', 'feast', 'red'],
  ['07-26', 'Sts Joachim and Anne', 'memorial', 'white'],
  ['07-29', 'Sts Martha, Mary and Lazarus', 'memorial', 'white'],
  ['07-30', 'St Peter Chrysologus', 'optional', 'white'],
  ['07-31', 'St Ignatius of Loyola', 'memorial', 'white'],
  ['08-01', 'St Alphonsus Liguori', 'memorial', 'white'],
  ['08-02', 'St Eusebius of Vercelli, or St Peter Julian Eymard', 'optional', 'white'],
  ['08-04', 'St John Vianney', 'memorial', 'white'],
  ['08-05', 'The Dedication of the Basilica of St Mary Major', 'optional', 'white'],
  ['08-06', 'The Transfiguration of the Lord', 'lordFeast', 'white'],
  ['08-07', 'Sts Sixtus II and Companions, or St Cajetan', 'optional', 'red'],
  ['08-08', 'St Dominic', 'memorial', 'white'],
  ['08-09', 'St Teresa Benedicta of the Cross', 'optional', 'red'],
  ['08-10', 'St Lawrence', 'feast', 'red'],
  ['08-11', 'St Clare', 'memorial', 'white'],
  ['08-12', 'St Jane Frances de Chantal', 'optional', 'white'],
  ['08-13', 'Sts Pontian and Hippolytus', 'optional', 'red'],
  ['08-14', 'St Maximilian Kolbe', 'memorial', 'red'],
  ['08-15', 'The Assumption of the Blessed Virgin Mary', 'solemnity', 'white'],
  ['08-16', 'St Stephen of Hungary', 'optional', 'white'],
  ['08-19', 'St John Eudes', 'optional', 'white'],
  ['08-20', 'St Bernard', 'memorial', 'white'],
  ['08-21', 'St Pius X', 'memorial', 'white'],
  ['08-22', 'The Queenship of the Blessed Virgin Mary', 'memorial', 'white'],
  ['08-23', 'St Rose of Lima', 'optional', 'white'],
  ['08-24', 'St Bartholomew, Apostle', 'feast', 'red'],
  ['08-25', 'St Louis, or St Joseph Calasanz', 'optional', 'white'],
  ['08-27', 'St Monica', 'memorial', 'white'],
  ['08-28', 'St Augustine', 'memorial', 'white'],
  ['08-29', 'The Passion of St John the Baptist', 'memorial', 'red'],
  ['09-03', 'St Gregory the Great', 'memorial', 'white'],
  ['09-08', 'The Nativity of the Blessed Virgin Mary', 'feast', 'white'],
  ['09-09', 'St Peter Claver', 'memorial', 'white'],
  ['09-12', 'The Most Holy Name of Mary', 'optional', 'white'],
  ['09-13', 'St John Chrysostom', 'memorial', 'white'],
  ['09-14', 'The Exaltation of the Holy Cross', 'lordFeast', 'red'],
  ['09-15', 'Our Lady of Sorrows', 'memorial', 'white'],
  ['09-16', 'Sts Cornelius and Cyprian', 'memorial', 'red'],
  ['09-17', 'St Robert Bellarmine, or St Hildegard of Bingen', 'optional', 'white'],
  ['09-19', 'St Januarius', 'optional', 'red'],
  ['09-20', 'Sts Andrew Kim Tae-gŏn, Paul Chŏng Ha-sang and Companions', 'memorial', 'red'],
  ['09-21', 'St Matthew, Apostle and Evangelist', 'feast', 'red'],
  ['09-23', 'St Pius of Pietrelcina (Padre Pio)', 'memorial', 'white'],
  ['09-26', 'Sts Cosmas and Damian', 'optional', 'red'],
  ['09-27', 'St Vincent de Paul', 'memorial', 'white'],
  ['09-28', 'St Wenceslaus, or St Lawrence Ruiz and Companions', 'optional', 'red'],
  ['09-29', 'Sts Michael, Gabriel and Raphael, Archangels', 'feast', 'white'],
  ['09-30', 'St Jerome', 'memorial', 'white'],
  ['10-01', 'St Thérèse of the Child Jesus', 'memorial', 'white'],
  ['10-02', 'The Holy Guardian Angels', 'memorial', 'white'],
  ['10-04', 'St Francis of Assisi', 'memorial', 'white'],
  ['10-05', 'Bl. Francis Xavier Seelos, or St Faustina Kowalska', 'optional', 'white'],
  ['10-06', 'St Bruno, or Bl. Marie Rose Durocher', 'optional', 'white'],
  ['10-07', 'Our Lady of the Rosary', 'memorial', 'white'],
  ['10-09', 'St Denis and Companions, or St John Leonardi', 'optional', 'red'],
  ['10-11', 'St John XXIII', 'optional', 'white'],
  ['10-14', 'St Callistus I', 'optional', 'red'],
  ['10-15', 'St Teresa of Jesus', 'memorial', 'white'],
  ['10-16', 'St Hedwig, or St Margaret Mary Alacoque', 'optional', 'white'],
  ['10-17', 'St Ignatius of Antioch', 'memorial', 'red'],
  ['10-18', 'St Luke, Evangelist', 'feast', 'red'],
  ['10-19', 'Sts John de Brébeuf, Isaac Jogues and Companions', 'memorial', 'red'],
  ['10-20', 'St Paul of the Cross', 'optional', 'white'],
  ['10-22', 'St John Paul II', 'optional', 'white'],
  ['10-23', 'St John of Capistrano', 'optional', 'white'],
  ['10-24', 'St Anthony Mary Claret', 'optional', 'white'],
  ['10-28', 'Sts Simon and Jude, Apostles', 'feast', 'red'],
  ['11-01', 'All Saints', 'solemnity', 'white'],
  ['11-02', 'All Souls: the Commemoration of All the Faithful Departed', 'souls', 'violet'],
  ['11-03', 'St Martin de Porres', 'optional', 'white'],
  ['11-04', 'St Charles Borromeo', 'memorial', 'white'],
  ['11-09', 'The Dedication of the Lateran Basilica', 'lordFeast', 'white'],
  ['11-10', 'St Leo the Great', 'memorial', 'white'],
  ['11-11', 'St Martin of Tours', 'memorial', 'white'],
  ['11-12', 'St Josaphat', 'memorial', 'red'],
  ['11-13', 'St Frances Xavier Cabrini', 'memorial', 'white'],
  ['11-15', 'St Albert the Great', 'optional', 'white'],
  ['11-16', 'St Margaret of Scotland, or St Gertrude', 'optional', 'white'],
  ['11-17', 'St Elizabeth of Hungary', 'memorial', 'white'],
  ['11-18', 'The Dedication of the Basilicas of Sts Peter and Paul, or St Rose Philippine Duchesne', 'optional', 'white'],
  ['11-21', 'The Presentation of the Blessed Virgin Mary', 'memorial', 'white'],
  ['11-22', 'St Cecilia', 'memorial', 'red'],
  ['11-23', 'St Clement I, St Columban, or Bl. Miguel Agustín Pro', 'optional', 'red'],
  ['11-24', 'St Andrew Dũng-Lạc and Companions', 'memorial', 'red'],
  ['11-25', 'St Catherine of Alexandria', 'optional', 'red'],
  ['11-30', 'St Andrew, Apostle', 'feast', 'red'],
  ['12-03', 'St Francis Xavier', 'memorial', 'white'],
  ['12-04', 'St John Damascene', 'optional', 'white'],
  ['12-06', 'St Nicholas', 'optional', 'white'],
  ['12-07', 'St Ambrose', 'memorial', 'white'],
  ['12-08', 'The Immaculate Conception of the Blessed Virgin Mary', 'solemnity', 'white'],
  ['12-09', 'St Juan Diego Cuauhtlatoatzin', 'optional', 'white'],
  ['12-10', 'Our Lady of Loreto', 'optional', 'white'],
  ['12-11', 'St Damasus I', 'optional', 'white'],
  ['12-12', 'Our Lady of Guadalupe', 'feast', 'white'],
  ['12-13', 'St Lucy', 'memorial', 'red'],
  ['12-14', 'St John of the Cross', 'memorial', 'white'],
  ['12-21', 'St Peter Canisius', 'optional', 'white'],
  ['12-23', 'St John of Kanty', 'optional', 'white'],
  ['12-25', 'The Nativity of the Lord (Christmas)', 'principal', 'white'],
  ['12-26', 'St Stephen, the First Martyr', 'feast', 'red'],
  ['12-27', 'St John, Apostle and Evangelist', 'feast', 'white'],
  ['12-28', 'The Holy Innocents', 'feast', 'red'],
  ['12-29', 'St Thomas Becket', 'optional', 'red'],
  ['12-31', 'St Sylvester I', 'optional', 'white'],
]
const FIXED = new Map(SANCTORAL.map((r) => [r[0], r]))
const mmdd = (d) => d.slice(5)

export function seasonOf(d) {
  const y = parts(d)[0], k = keyDates(y)
  if (d >= k.advent1 && d < k.christmas) return 'advent'
  if (d >= k.christmas || d <= k.baptism) return 'christmas'
  if (d >= k.ashWednesday && d < k.holyThursday) return 'lent'
  if (d >= k.holyThursday && d < k.easter) return 'triduum'
  if (d >= k.easter && d <= k.pentecost) return 'easter'
  return 'ordinary'
}

/** Week of Ordinary Time: counted forward from the Baptism, and back from Christ the King. */
function otWeek(d, k) {
  if (d > k.pentecost) return 34 - Math.round(diffDays(sundayOnOrBefore(d), k.christTheKing) / 7)
  return Math.floor(diffDays(sundayOnOrBefore(k.baptism), d) / 7) + 1
}

/** The day of the season itself: its name, colour and row in the table. */
function seasonalDay(d, k, season) {
  const wd = dow(d), name = WEEKDAYS[wd], [, m, dd] = parts(d)
  if (season === 'advent') {
    const n = Math.floor(diffDays(k.advent1, d) / 7) + 1
    if (wd === 0) return { name: `${ordinalWord(n)} Sunday of Advent`, colour: n === 3 ? 'rose' : 'violet', prec: 'principal', sunday: true }
    if (dd >= 17) return { name: `Advent Weekday, December ${dd}`, colour: 'violet', prec: 'privileged' }
    return { name: `${name} of the ${ordinalWord(n)} Week of Advent`, colour: 'violet', prec: 'weekday' }
  }
  if (season === 'christmas') {
    if (m === 12 && dd > 25) return { name: `${ordinalWord(dd - 24)} Day in the Octave of Christmas`, colour: 'white', prec: 'privileged' }
    if (d > k.epiphany) return { name: `${name} after Epiphany`, colour: 'white', prec: 'weekday' }
    return { name: 'Christmas Weekday', colour: 'white', prec: wd === 0 ? 'sunday' : 'weekday', sunday: wd === 0 }
  }
  if (season === 'lent') {
    if (d === k.ashWednesday) return { name: 'Ash Wednesday', colour: 'violet', prec: 'principal' }
    if (d < k.lent1) return { name: `${name} after Ash Wednesday`, colour: 'violet', prec: 'privileged' }
    const n = Math.floor(diffDays(k.lent1, d) / 7) + 1
    if (d === k.palmSunday) return { name: 'Palm Sunday of the Passion of the Lord', colour: 'red', prec: 'principal', sunday: true }
    if (n === 6) return { name: `${name} of Holy Week`, colour: 'violet', prec: 'principal' }
    if (wd === 0) return { name: `${ordinalWord(n)} Sunday of Lent`, colour: n === 4 ? 'rose' : 'violet', prec: 'principal', sunday: true }
    return { name: `${name} of the ${ordinalWord(n)} Week of Lent`, colour: 'violet', prec: 'privileged' }
  }
  if (season === 'triduum') {
    if (d === k.holyThursday) return { name: 'Holy Thursday: the Mass of the Lord’s Supper', colour: 'white', prec: 'triduum' }
    if (d === k.goodFriday) return { name: 'Good Friday of the Passion of the Lord', colour: 'red', prec: 'triduum' }
    return { name: 'Holy Saturday, and the Easter Vigil tonight', colour: 'white', prec: 'triduum' }
  }
  if (season === 'easter') {
    if (d === k.easter) return { name: 'Easter Sunday of the Resurrection of the Lord', colour: 'white', prec: 'triduum', sunday: true }
    const n = Math.floor(diffDays(k.easter, d) / 7) + 1
    if (n === 1) return { name: `${name} in the Octave of Easter`, colour: 'white', prec: 'principal' }
    if (d === k.divineMercy) return { name: 'Second Sunday of Easter (Divine Mercy Sunday)', colour: 'white', prec: 'principal', sunday: true }
    if (wd === 0) return { name: `${ordinalWord(n)} Sunday of Easter`, colour: 'white', prec: 'principal', sunday: true }
    return { name: `${name} of the ${ordinalWord(n)} Week of Easter`, colour: 'white', prec: 'weekday' }
  }
  const n = otWeek(d, k)
  if (wd === 0) return { name: `${ordinal(n)} Sunday in Ordinary Time`, colour: 'green', prec: 'sunday', sunday: true }
  return { name: `${name} of the ${ordinal(n)} Week in Ordinary Time`, colour: 'green', prec: 'weekday' }
}

/** The moveable celebrations of year `y`, by date: [name, prec, colour]. */
function moveables(k) {
  return {
    [k.epiphany]: ['The Epiphany of the Lord', 'principal', 'white', 'epiphany'],
    [k.baptism]: ['The Baptism of the Lord', 'lordFeast', 'white', 'baptism'],
    [k.ascension]: ['The Ascension of the Lord', 'principal', 'white', 'ascension'],
    [k.pentecost]: ['Pentecost Sunday', 'principal', 'red', 'pentecost'],
    [k.maryMotherOfChurch]: ['The Blessed Virgin Mary, Mother of the Church', 'memorial', 'white', 'maryMotherOfChurch'],
    [k.trinity]: ['The Most Holy Trinity', 'solemnity', 'white', 'trinity'],
    [k.corpusChristi]: ['The Most Holy Body and Blood of Christ (Corpus Christi)', 'solemnity', 'white', 'corpusChristi'],
    [k.sacredHeart]: ['The Most Sacred Heart of Jesus', 'solemnity', 'white', 'sacredHeart'],
    [k.immaculateHeart]: ['The Immaculate Heart of the Blessed Virgin Mary', 'memorial', 'white', 'immaculateHeart'],
    [k.christTheKing]: ['Our Lord Jesus Christ, King of the Universe', 'solemnity', 'white', 'christTheKing'],
    [k.holyFamily]: ['The Holy Family of Jesus, Mary and Joseph', 'lordFeast', 'white', 'holyFamily'],
  }
}

/**
 * Where each fixed day of year `y` is actually kept. A solemnity that meets a
 * day above it moves to the next free day (St Joseph in Holy Week to the
 * Saturday before Palm Sunday; St John the Baptist meeting the Sacred Heart to
 * the day before); the Day of Prayer for the unborn leaves a Sunday for
 * Monday. Returns { date: row } and the set of dates a row left.
 */
const placementCache = new Map()
function placements(y) {
  if (placementCache.has(y)) return placementCache.get(y)
  const k = keyDates(y), mv = moveables(k)
  const at = {}, moved = {}
  const seasonalPrec = (d) => PREC[seasonalDay(d, keyDates(parts(d)[0]), seasonOf(d)).prec]
  const takenHigh = (d) => seasonalPrec(d) <= PREC.principal || (mv[d] && PREC[mv[d][1]] <= PREC.solemnity) || (at[d] && PREC[at[d][2]] <= PREC.solemnity)
  for (const row of SANCTORAL) {
    const d = `${y}-${row[0]}`
    if (row[2] !== 'solemnity' || !takenHigh(d)) continue
    let to
    if (row[0] === '03-19' && d >= k.palmSunday && d <= k.holySaturday) to = addDays(k.palmSunday, -1)
    else if (row[0] === '06-24' && d === k.sacredHeart) to = addDays(d, -1)
    else { to = addDays(d, 1); while (takenHigh(to) || seasonalPrec(to) <= PREC.feast || (mv[to] && PREC[mv[to][1]] <= PREC.feast)) to = addDays(to, 1) }
    at[to] = row; moved[d] = to
  }
  const unborn = `${y}-01-22`
  at[dow(unborn) === 0 ? addDays(unborn, 1) : unborn] = ['01-22', 'Day of Prayer for the Legal Protection of Unborn Children', 'memorial', 'violet']
  const out = { at, moved }
  placementCache.set(y, out)
  return out
}

const HOLY_DAYS = ['01-01', '08-15', '11-01', '12-08', '12-25']
const SEASONAL_KEYS = ['ashWednesday', 'palmSunday', 'holyThursday', 'goodFriday', 'holySaturday', 'easter', 'divineMercy', 'advent1']

/** The Sunday cycle (A, B, C) and weekday cycle (I, II) of the Church year a date is in. */
export function cycles(d) {
  const y = parts(d)[0], ly = d >= keyDates(y).advent1 ? y + 1 : y
  return { sunday: ['C', 'A', 'B'][ly % 3], weekday: ly % 2 ? 'I' : 'II' }
}

/**
 * The Church's day.
 * { key, name, rank, colour, colourHex, season, optional, optionalKey, obligation, fasting, transferred }
 * `key` names the celebration (its MM-DD, or a keyDates() name) for saints.js.
 * `optional` is a saint who may be kept that day, or remembered on a weekday
 * of Lent or late Advent; it never replaces the day.
 */
export function liturgicalDay(d) {
  const [y] = parts(d), k = keyDates(y), season = seasonOf(d)
  const base = seasonalDay(d, k, season)
  const { at, moved } = placements(y)
  const fixedRow = moved[d] ? null : (at[d] || FIXED.get(mmdd(d)))
  const mvRow = moveables(k)[d]
  const seasonalKey = SEASONAL_KEYS.find((key) => k[key] === d) || null
  const cands = [{ name: base.name, prec: base.prec, colour: base.colour, seasonal: true, key: seasonalKey }]
  if (mvRow) cands.push({ name: mvRow[0], prec: mvRow[1], colour: mvRow[2], key: mvRow[3] })
  if (fixedRow) cands.push({ name: fixedRow[1], prec: fixedRow[2], colour: fixedRow[3], key: fixedRow[0], transferred: Boolean(at[d]) && fixedRow[0] !== mmdd(d) })
  // The lower row wins; a tie goes to the celebration over the season's own
  // day. An optional memorial never takes the day: it is offered beside it.
  const win = cands.filter((c) => c.prec !== 'optional')
    .reduce((a, b) => (PREC[b.prec] < PREC[a.prec] || (PREC[b.prec] === PREC[a.prec] && a.seasonal) ? b : a))
  let optional = null, optionalKey = null
  for (const c of cands) {
    if (c === win || c.seasonal) continue
    if ((c.prec === 'optional' && ['weekday', 'privileged'].includes(win.prec)) || (c.prec === 'memorial' && win.prec === 'privileged')) { optional = c.name; optionalKey = c.key }
  }
  const md = mmdd(d), wd = dow(d)
  const rank = win.prec === 'principal' && base.sunday && win.seasonal ? 'sunday' : win.prec
  const obligation = wd === 0 || (HOLY_DAYS.includes(md) && !win.seasonal && fixedRow && fixedRow[0] === md && !win.transferred &&
    !(['01-01', '08-15', '11-01'].includes(md) && (wd === 6 || wd === 1)))
  let fasting = null
  if (d === k.ashWednesday || d === k.goodFriday) fasting = 'fast'
  else if (season === 'lent' && wd === 5 && PREC[win.prec] > PREC.solemnity) fasting = 'abstinence'
  return {
    date: d, key: win.key || null, optionalKey, name: win.name, rank, rankWords: RANK_WORDS[rank] || '', colour: win.colour, colourHex: COLOURS[win.colour],
    season, optional, obligation: Boolean(obligation), fasting, transferred: Boolean(win.transferred),
    high: PREC[win.prec] <= PREC.lordFeast || (win.prec === 'feast'),
  }
}

export const SEASON_NAMES = { advent: 'Advent', christmas: 'Christmas Time', lent: 'Lent', triduum: 'the Paschal Triduum', easter: 'Easter Time', ordinary: 'Ordinary Time' }

/** USCCB's page of the day's readings. */
export function readingsUrl(d) {
  return `https://bible.usccb.org/bible/readings/${d.slice(5, 7)}${d.slice(8, 10)}${d.slice(2, 4)}.cfm`
}

export const SEASON_COLOURS = { advent: 'violet', christmas: 'white', ordinary: 'green', lent: 'violet', triduum: 'red', easter: 'white' }

/** The Church year holding a date, Advent to Advent, as its seasons: [{ season, from, to }]. */
export function churchYear(d) {
  const y = parts(d)[0]
  const startYear = d >= keyDates(y).advent1 ? y : y - 1
  const a = keyDates(startYear), b = keyDates(startYear + 1)
  return [
    { season: 'advent', from: a.advent1, to: addDays(a.christmas, -1) },
    { season: 'christmas', from: a.christmas, to: b.baptism },
    { season: 'ordinary', from: addDays(b.baptism, 1), to: addDays(b.ashWednesday, -1) },
    { season: 'lent', from: b.ashWednesday, to: addDays(b.holyThursday, -1) },
    { season: 'triduum', from: b.holyThursday, to: b.holySaturday },
    { season: 'easter', from: b.easter, to: b.pentecost },
    { season: 'ordinary', from: addDays(b.pentecost, 1), to: addDays(b.advent1, -1) },
  ]
}

/** The next season after the one holding `d`: { season, from }. */
export function nextSeason(d) {
  const segs = churchYear(d)
  const i = segs.findIndex((s) => s.from <= d && s.to >= d)
  return i < segs.length - 1 ? segs[i + 1] : churchYear(addDays(segs[i].to, 1))[0]
}
