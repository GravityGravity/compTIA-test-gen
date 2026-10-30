interface FactsProps {
  items: Array<[label: string, value: string]>
}

/** Label–value pairs, one per line. */
export function Facts({ items }: FactsProps) {
  return (
    <dl className="facts">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}
