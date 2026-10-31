// ============================================
// prayers.js -- the traditional prayers, and a warm word to pray one today
// ============================================
// Texts are the long-standing English forms, which belong to everyone.

import { parts, dow } from './dates.js'
import { SAINT_LINES, invocationFor } from './saints.js'

export const PRAYERS = {
  ourFather: { name: 'The Our Father', text: 'Our Father, who art in heaven, hallowed be thy name; thy kingdom come, thy will be done on earth as it is in heaven. Give us this day our daily bread, and forgive us our trespasses, as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil. Amen.' },
  hailMary: { name: 'The Hail Mary', text: 'Hail Mary, full of grace, the Lord is with thee. Blessed art thou among women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen.' },
  glory: { name: 'The Glory Be', text: 'Glory be to the Father, and to the Son, and to the Holy Spirit, as it was in the beginning, is now, and ever shall be, world without end. Amen.' },
  angelus: { name: 'The Angelus', text: 'The Angel of the Lord declared unto Mary,\nand she conceived of the Holy Spirit. Hail Mary…\nBehold the handmaid of the Lord:\nbe it done unto me according to thy word. Hail Mary…\nAnd the Word was made flesh,\nand dwelt among us. Hail Mary…\nPray for us, O holy Mother of God,\nthat we may be made worthy of the promises of Christ.\nLet us pray. Pour forth, we beseech thee, O Lord, thy grace into our hearts, that we, to whom the Incarnation of Christ thy Son was made known by the message of an angel, may by his Passion and Cross be brought to the glory of his Resurrection, through the same Christ our Lord. Amen.' },
  reginaCaeli: { name: 'The Regina Caeli', text: 'Queen of Heaven, rejoice, alleluia:\nfor he whom you did merit to bear, alleluia,\nhas risen, as he said, alleluia.\nPray for us to God, alleluia.\nRejoice and be glad, O Virgin Mary, alleluia,\nfor the Lord has truly risen, alleluia.\nLet us pray. O God, who gave joy to the world through the resurrection of thy Son, our Lord Jesus Christ, grant, we beseech thee, that through the intercession of the Virgin Mary, his Mother, we may obtain the joys of everlasting life. Through the same Christ our Lord. Amen.' },
  eternalRest: { name: 'Eternal Rest', text: 'Eternal rest grant unto them, O Lord, and let perpetual light shine upon them. May they rest in peace. Amen.' },
  michael: { name: 'The St Michael Prayer', text: 'Saint Michael the Archangel, defend us in battle. Be our protection against the wickedness and snares of the devil. May God rebuke him, we humbly pray; and do thou, O Prince of the heavenly host, by the power of God, cast into hell Satan and all the evil spirits who prowl about the world seeking the ruin of souls. Amen.' },
  holySpirit: { name: 'Come, Holy Spirit', text: 'Come, Holy Spirit, fill the hearts of your faithful, and kindle in them the fire of your love. Send forth your Spirit, and they shall be created, and you shall renew the face of the earth.' },
  memorare: { name: 'The Memorare', text: 'Remember, O most gracious Virgin Mary, that never was it known that anyone who fled to thy protection, implored thy help, or sought thine intercession was left unaided. Inspired by this confidence, I fly unto thee, O Virgin of virgins, my Mother. To thee do I come; before thee I stand, sinful and sorrowful. O Mother of the Word Incarnate, despise not my petitions, but in thy mercy hear and answer me. Amen.' },
  hailHolyQueen: { name: 'Hail, Holy Queen', text: 'Hail, holy Queen, Mother of mercy, our life, our sweetness and our hope. To thee do we cry, poor banished children of Eve; to thee do we send up our sighs, mourning and weeping in this valley of tears. Turn then, most gracious advocate, thine eyes of mercy toward us, and after this our exile show unto us the blessed fruit of thy womb, Jesus. O clement, O loving, O sweet Virgin Mary. Pray for us, O holy Mother of God, that we may be made worthy of the promises of Christ. Amen.' },
  guardianAngel: { name: 'Angel of God', text: 'Angel of God, my guardian dear, to whom God’s love commits me here, ever this day be at my side, to light and guard, to rule and guide. Amen.' },
  grace: { name: 'Grace before meals', text: 'Bless us, O Lord, and these thy gifts, which we are about to receive from thy bounty, through Christ our Lord. Amen.' },
  contrition: { name: 'An Act of Contrition', text: 'O my God, I am heartily sorry for having offended thee, and I detest all my sins because of thy just punishments, but most of all because they offend thee, my God, who art all good and deserving of all my love. I firmly resolve, with the help of thy grace, to sin no more and to avoid the near occasion of sin. Amen.' },
  morning: { name: 'The Morning Offering', text: 'O Jesus, through the Immaculate Heart of Mary, I offer you my prayers, works, joys and sufferings of this day, for all the intentions of your Sacred Heart, in union with the Holy Sacrifice of the Mass throughout the world, for the salvation of souls, the reparation of sins, the reunion of all Christians, and in particular for the intentions of the Holy Father this month. Amen.' },
  anima: { name: 'The Anima Christi', text: 'Soul of Christ, sanctify me. Body of Christ, save me. Blood of Christ, inebriate me. Water from the side of Christ, wash me. Passion of Christ, strengthen me. O good Jesus, hear me. Within thy wounds hide me. Suffer me not to be separated from thee. From the malicious enemy defend me. In the hour of my death call me, and bid me come unto thee, that with thy saints I may praise thee for ever and ever. Amen.' },
  francis: { name: 'The Prayer of St Francis', text: 'Lord, make me an instrument of your peace: where there is hatred, let me sow love; where there is injury, pardon; where there is doubt, faith; where there is despair, hope; where there is darkness, light; where there is sadness, joy. O divine Master, grant that I may not so much seek to be consoled as to console, to be understood as to understand, to be loved as to love. For it is in giving that we receive, it is in pardoning that we are pardoned, and it is in dying that we are born to eternal life. Amen.' },
  teresa: { name: 'St Teresa’s bookmark', text: 'Let nothing disturb you, let nothing frighten you. All things are passing; God never changes. Patience obtains all things. Whoever has God lacks nothing: God alone suffices.' },
  anthony: { name: 'For something lost', text: 'Saint Anthony, Saint Anthony, please come around: something is lost and cannot be found.' },
  emmanuel: { name: 'O Come, O Come, Emmanuel', text: 'O come, O come, Emmanuel,\nand ransom captive Israel,\nthat mourns in lonely exile here\nuntil the Son of God appear.\nRejoice! Rejoice! Emmanuel\nshall come to thee, O Israel.' },
}

const O_ANTIPHONS = { 17: 'O Wisdom', 18: 'O Lord of Israel', 19: 'O Root of Jesse', 20: 'O Key of David', 21: 'O Rising Dawn', 22: 'O King of the Nations', 23: 'O Emmanuel' }

/** The line and prayer of the day's own celebration, or of the saint who may be kept beside it. */
export function saintLine(lit) {
  const optional = !SAINT_LINES[lit.key] && lit.optionalKey && SAINT_LINES[lit.optionalKey]
  const entry = SAINT_LINES[lit.key] || optional
  if (!entry) return null
  const [line, pray] = entry
  const prayer = pray && PRAYERS[pray] ? pray : null
  return { line, prayer, invocation: prayer ? null : (pray || invocationFor(optional ? lit.optional : lit.name)), optional: Boolean(optional) }
}

/**
 * A warm invitation to pray, for a day and an hour at home:
 * { words, prayer (a PRAYERS key) | invocation }.
 */
export function invitation(d, lit, hour = 9) {
  const own = saintLine(lit)
  if (own) return { words: own.optional ? `Or keep ${lit.optional}. ${own.line}` : own.line, prayer: own.prayer, invocation: own.invocation, own: true }
  const [, m, dd] = parts(d), wd = dow(d)
  if (lit.season === 'advent' && m === 12 && O_ANTIPHONS[dd]) return { words: `Tonight’s O Antiphon is “${O_ANTIPHONS[dd]}.” Sing the verse that goes with it.`, prayer: 'emmanuel' }
  if (lit.season === 'easter' || lit.season === 'triduum') return { words: lit.season === 'easter' ? 'In Easter Time the Regina Caeli takes the Angelus’s place, at morning, noon and evening.' : 'The three holiest days of the year.', prayer: lit.season === 'easter' ? 'reginaCaeli' : 'anima' }
  if (lit.season === 'lent') return wd === 5 ? { words: 'A Friday in Lent: no meat today, and the Stations of the Cross.', prayer: 'contrition' } : { words: 'Lent: forty days of prayer, fasting and giving.', prayer: 'contrition' }
  if (lit.season === 'advent') return { words: 'Advent: light the wreath’s candles at dinner.', prayer: 'emmanuel' }
  if (lit.season === 'christmas') return { words: 'Christmas lasts until the Baptism of the Lord: keep the tree up.', prayer: 'glory' }
  if (m === 11) return { words: 'November is the month of the holy souls: pray for everyone we miss.', prayer: 'eternalRest' }
  if (m === 10) return { words: 'October is the month of the rosary: a decade before bed?', prayer: 'hailMary' }
  if (m === 5) return { words: 'May is Mary’s month.', prayer: 'memorare' }
  if (m === 6) return { words: 'June is the month of the Sacred Heart, our parish’s own.', invocation: 'Most Sacred Heart of Jesus, have mercy on us.' }
  if (hour >= 11 && hour < 14) return { words: 'It’s noon: the Angelus, as the church bells used to ring it.', prayer: 'angelus' }
  if (hour >= 17 && hour < 20) return { words: 'Before dinner:', prayer: 'grace' }
  if (hour < 11) return { words: 'To start the day:', prayer: 'morning' }
  return { words: 'Before bed:', prayer: 'guardianAngel' }
}
