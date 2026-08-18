import { cn } from '../../lib/utils'

/**
 * The brand mark: a hand-cut tricolor paleta (popsicle) on a stick.
 * Stands in for the generic ice-cream-cone emoji everywhere the brand needs
 * a graphic anchor — hero, auth headers, success states.
 */
export default function Paleta({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 120"
      className={cn('w-16 h-24', className)}
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <clipPath id="paleta-body">
          <rect x="10" y="6" width="60" height="72" rx="18" />
        </clipPath>
      </defs>

      <g clipPath="url(#paleta-body)">
        <rect x="8" y="6" width="64" height="26" fill="#FF3D68" />
        <rect x="8" y="32" width="64" height="24" fill="#FFC83D" />
        <rect x="8" y="56" width="64" height="24" fill="#0FA88F" />
      </g>
      <rect x="10" y="6" width="60" height="72" rx="18" stroke="#241A12" strokeWidth="3" />

      {/* melt drips */}
      <circle cx="26" cy="80" r="6" fill="#0FA88F" stroke="#241A12" strokeWidth="2.5" />
      <circle cx="54" cy="80" r="6" fill="#0FA88F" stroke="#241A12" strokeWidth="2.5" />

      {/* stick */}
      <rect x="33" y="86" width="14" height="30" rx="4" fill="#E8C48A" stroke="#241A12" strokeWidth="3" />
    </svg>
  )
}
