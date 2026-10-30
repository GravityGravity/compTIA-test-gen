interface CrumbsProps {
  onHome: () => void
  trail: string[]
}

export function Crumbs({ onHome, trail }: CrumbsProps) {
  return (
    <p className="crumbs">
      <a href="#" onClick={(e) => (e.preventDefault(), onHome())}>
        Home
      </a>
      {trail.map((item) => ` › ${item}`).join('')}
    </p>
  )
}
