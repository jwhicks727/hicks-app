import { Link } from '../shell/Link.jsx'

/**
 * The Kitchen's menu: where you can go from here, one tap each. The cookbook is always among them
 * (adding and writing recipes live inside it); planning is the parents'.
 */
export default function KitchenMenu({ current, parent }) {
  const items = [
    ['', 'This week', '/kitchen'],
    ['cookbook', 'Cookbook', '/kitchen/cookbook'],
    ...(parent ? [['plan', 'Plan the week', '/kitchen/plan']] : []),
    ['rules', 'Rules & preferences', '/kitchen/rules'],
  ]
  return (
    <nav className="ki-menu" aria-label="The Kitchen">
      {items.map(([key, label, to]) => <Link key={key || 'week'} to={to} className="ki-item" aria-current={current === key ? 'page' : undefined}>{label}</Link>)}
    </nav>
  )
}
