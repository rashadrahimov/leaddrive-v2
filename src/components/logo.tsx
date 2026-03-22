"use client"

interface LogoProps {
  collapsed?: boolean
  size?: "sm" | "md" | "lg"
  className?: string
}

const sizes = {
  sm: { icon: 28, fontSize: 16, crmSize: 13, gap: 6 },
  md: { icon: 36, fontSize: 22, crmSize: 18, gap: 8 },
  lg: { icon: 48, fontSize: 30, crmSize: 26, gap: 10 },
}

export function Logo({ collapsed = false, size = "md", className = "" }: LogoProps) {
  const s = sizes[size]

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Icon: funnel-to-growth-arrow */}
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Three ascending chevron lines forming funnel shape */}
        <path
          d="M8 52L20 36L32 52"
          stroke="#1e3a5f"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14 44L24 26L34 44"
          stroke="#1e3a5f"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M20 36L30 14L40 36"
          stroke="#0ea5a0"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Growth arrow shooting up-right */}
        <path
          d="M30 14L50 6"
          stroke="#0ea5a0"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M42 4L50 6L48 14"
          stroke="#0ea5a0"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Text */}
      {!collapsed && (
        <div className="flex items-baseline" style={{ gap: s.gap }}>
          <span
            className="font-bold tracking-tight"
            style={{
              fontSize: s.fontSize,
              color: "#1e3a5f",
              lineHeight: 1,
            }}
          >
            Lead
            <span className="font-extrabold">Drive</span>
          </span>
          <span
            className="border-l pl-2 font-light tracking-widest"
            style={{
              fontSize: s.crmSize,
              color: "#64748b",
              borderColor: "#cbd5e1",
              lineHeight: 1,
            }}
          >
            CRM
          </span>
        </div>
      )}
    </div>
  )
}
