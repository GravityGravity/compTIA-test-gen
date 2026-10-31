import logo from '../assets/logo.svg'

interface TopBarProps {
  /** Shows a Home link in the navigation (every screen except home). */
  onHome?: () => void
}

export function TopBar({ onHome }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="topbar-inner">
        <span className="appname">
          <img className="applogo" src={logo} alt="" />
          Cert <span>Practice</span>
        </span>
        {onHome && (
          <nav className="nav">
            <a href="#" onClick={(e) => (e.preventDefault(), onHome())}>
              Home
            </a>
          </nav>
        )}
      </div>
    </header>
  )
}
