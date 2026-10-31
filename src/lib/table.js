// ============================================
// table.js -- a question for the dinner table, each evening
// ============================================
// Pure, so tests run it in Node. One a night, the same for everyone that
// evening, never the same two nights running; "Another" steps through more.
// Light, kind, sometimes silly, sometimes deep, answerable by an 11-year-old
// and her parents alike.

export const TABLE_QUESTIONS = [
  'What was the best part of your day, and the hardest?',
  'If our family had a theme song, what would it be?',
  'What’s something you learned today that surprised you?',
  'Which animal would you be for a day, and what would you do first?',
  'Who made you laugh today?',
  'If you could add one room to our house, what would it be?',
  'What’s a smell that makes you happy?',
  'What would you name a new star if you found one?',
  'If we could eat dinner anywhere in the world tonight, where?',
  'What’s one kind thing someone did for you this week?',
  'What’s a kind thing you could do for someone tomorrow?',
  'Which bird would you most like to see this year?',
  'If you could have any superpower for one hour, which one?',
  'What’s the best sound in nature?',
  'What do you think our cats talk about when we’re out?',
  'What’s something you’re looking forward to?',
  'If you wrote a book, what would it be about?',
  'Which saint would you most like to have dinner with?',
  'What made you feel brave lately?',
  'If you invented a holiday, what would we celebrate?',
  'What’s the best meal you’ve ever had?',
  'What’s a song that always makes you dance?',
  'If you could ask the moon one question, what would it be?',
  'What would the perfect Saturday look like?',
  'Who’s someone you’d like to thank, and for what?',
  'What would you teach a class on, if you could teach anything?',
  'If our family were a band, who plays what?',
  'What’s something hard you did that you’re proud of?',
  'Which season are you, and why?',
  'If you could visit any time in history for a day, when?',
  'What’s a question you’ve always wanted to ask one of us?',
  'What three things would you take to a desert island?',
  'What’s the funniest thing that happened this week?',
  'What’s a place near home you’d like to explore?',
  'If you ran a school, what would be the first rule?',
  'What’s a colour that feels like today?',
  'What’s something small that made today better?',
  'If you had a dragon, what would you name it?',
  'What’s a tradition of ours you never want to stop?',
  'What would you put in a time capsule to open in ten years?',
  'What’s the best gift you’ve ever given someone?',
  'If you could talk to one animal, which one and what would you ask?',
  'What’s something you changed your mind about?',
  'Which painting would you most like to live inside?',
  'What do you want to get really good at?',
  'If you could fill the house with one smell forever, which?',
  'What’s your favourite thing about each person at this table?',
  'If you opened a restaurant, what’s on the menu?',
  'What’s the best thing about being the age you are right now?',
  'What would you do with a whole free day and no screens?',
  'What’s a word you love the sound of?',
  'If you could plant anything in our garden, what?',
  'What’s a cloud shape you’ve seen lately?',
  'Who’s a character from a book or show you’d like as a friend?',
  'What’s something that’s easy for you that’s hard for other people?',
  'If you could make one rule for the whole world, what would it be?',
  'Where would you go on a road trip with just us three?',
  'What’s the best advice anyone ever gave you?',
  'What would your dream treehouse have in it?',
  'What did you notice today that nobody else did?',
  'If you could switch places with someone at this table for a day, who?',
  'What’s a prayer or a hope you have this week?',
  'What instrument would you love to play?',
  'What’s the kindest thing you saw someone do lately?',
  'If our house could talk, what would it say about us?',
  'What makes a really good friend?',
  'What’s one thing you’d like to do together this month?',
  'What would you do if you were invisible for an afternoon?',
  'Which sunset do you remember best?',
  'What’s your favourite thing we cook?',
  'If you had your own planet, what would it be like?',
  'What are you grateful for tonight?',
]

const dayNumber = (date) => Math.round(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10)) / 864e5)

/** Tonight's question (step n: "Another" n times). It walks the list with a stride that visits every one before repeating. */
export function tableQuestion(date, n = 0) {
  const L = TABLE_QUESTIONS.length, stride = 29 // shares no factor with the list's length
  return TABLE_QUESTIONS[(((dayNumber(date) + n) * stride) % L + L) % L]
}
/** Dinner-ish: four in the afternoon till nine. */
export const atTable = (hour) => hour >= 16 && hour < 21
