import Coming from '../parts/Coming.jsx'

export default function Kitchen() {
  return (
    <>
      <header className="hero span-6">
        <span className="kicker">Jason’s</span>
        <h1 className="greet">Kitchen</h1>
      </header>
      <Coming tint="#F03E2F" glyph="pot" className="span-6" title="The week’s recipes" items={[
        'One shop for the week, cooked night by night',
        'What’s left in the fridge, the most urgent first',
        'A cook check that asks about whatever spoils first',
        'Recipe pictures from the Food Icon Pack, coloured in',
        'Ratings, the plates, and the substitution engine from the meal-planning spec',
      ]} />
    </>
  )
}
