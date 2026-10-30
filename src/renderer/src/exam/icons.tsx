// The draft's inline icons.

export const Hourglass = () => (
  <svg className="hg" viewBox="0 0 14 14" aria-hidden="true">
    <rect x=".5" y=".5" width="13" height="13" fill="none" stroke="currentColor" />
    <path d="M4 3h6L7 7l3 4H4l3-4z" fill="none" stroke="currentColor" />
  </svg>
)

export const Cross = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
    <path d="M1.5 1.5l9 9M10.5 1.5l-9 9" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
  </svg>
)

export const Prev = () => (
  <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true">
    <path d="M8 0v12L0 6z" fill="currentColor" />
  </svg>
)

export const Next = () => (
  <svg width="10" height="12" viewBox="0 0 10 12" aria-hidden="true">
    <path d="M2 0v12l8-6z" fill="currentColor" />
  </svg>
)

export const Warning = () => (
  <svg width="12" height="11" viewBox="0 0 12 11" aria-hidden="true">
    <path d="M6 0l6 11H0z" fill="currentColor" />
    <path d="M6 4v3.5M6 8.6v.8" stroke="var(--card)" strokeWidth="1.3" />
  </svg>
)

export const Tick = ({ size = 18 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 18 18" aria-hidden="true">
    <path
      d="M3 9.5l4 4 8-9"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

export const SmallCross = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
    <path
      d="M3 3l10 10M13 3L3 13"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
    />
  </svg>
)

export const VerdictIcon = ({ ok }: { ok: boolean }) => (
  <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
    {ok ? (
      <path
        d="M7 17l6 6L25 9"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ) : (
      <path
        d="M8 8l16 16M24 8 8 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    )}
  </svg>
)
