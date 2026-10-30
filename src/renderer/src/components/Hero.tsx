interface HeroProps {
  title: string
  subtitle?: string
}

/** The grey band that holds each page title. */
export function Hero({ title, subtitle }: HeroProps) {
  return (
    <div className="hero">
      <div className="page-head">
        <h1 className="display-page">
          <span className="title-gradient">{title}</span>
        </h1>
        {subtitle && <p className="subtitle">{subtitle}</p>}
      </div>
    </div>
  )
}
