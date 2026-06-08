import { LandingGraphCanvas } from './LandingGraphCanvas'

/**
 * Full-viewport animated graph behind the entire landing page (hero + footer).
 * Fixed so it stays put while the page scrolls, with a soft, light vignette
 * that keeps text readable without hiding the animation.
 */
export function LandingBackdrop() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none" aria-hidden="true">
      <LandingGraphCanvas />
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 75% 65% at 50% 42%, rgba(11,17,26,0.12) 0%, rgba(11,17,26,0.45) 60%, rgba(11,17,26,0.70) 100%)',
        }}
      />
    </div>
  )
}
