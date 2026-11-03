type BrandMarkProps = {
  className?: string
  size?: number
}

export default function BrandMark({ className = 'h-9 w-9', size = 36 }: BrandMarkProps) {
  return (
    <div
      className={`relative flex items-center justify-center shrink-0 overflow-hidden rounded-xl bg-white/[0.04] border border-cyan/30 p-0.5 shadow-[0_0_15px_rgba(109,211,231,0.2)] transition hover:border-cyan hover:shadow-[0_0_20px_rgba(109,211,231,0.35)] ${className}`}
    >
      <img
        src="/logo.png"
        alt="CMC Robotics Lab Logo"
        width={size}
        height={size}
        className="h-full w-full object-contain filter drop-shadow-[0_0_6px_rgba(109,211,231,0.4)]"
      />
    </div>
  )
}
