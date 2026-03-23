"use client"

interface LogoProps {
  collapsed?: boolean
  size?: "sm" | "md" | "lg"
  /** When true, uses dark: overrides for navy sidebar in dark mode */
  sidebar?: boolean
  className?: string
}

const sizes = {
  sm: { icon: 28, fontSize: 16, crmSize: 13, gap: 6 },
  md: { icon: 36, fontSize: 22, crmSize: 18, gap: 8 },
  lg: { icon: 48, fontSize: 30, crmSize: 26, gap: 10 },
}

export function Logo({ collapsed = false, size = "md", sidebar = false, className = "" }: LogoProps) {
  const s = sizes[size]

  // Sidebar logo: navy text in light, white text in dark (for navy bg)
  // Normal logo: always navy text
  const textClass = sidebar
    ? "text-[#1e3a5f] dark:text-white"
    : "text-[#1e3a5f]"
  const crmClass = sidebar
    ? "text-slate-500 dark:text-slate-400 border-slate-300 dark:border-white/20"
    : "text-slate-500 border-slate-300"
  // SVG strokes for chevrons
  const chevronStroke1 = sidebar ? "stroke-[#1e3a5f] dark:stroke-white/60" : "stroke-[#1e3a5f]"
  const chevronStroke2 = sidebar ? "stroke-[#1e3a5f] dark:stroke-white/80" : "stroke-[#1e3a5f]"

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        <path
          d="M8 52L20 36L32 52"
          className={chevronStroke1}
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M14 44L24 26L34 44"
          className={chevronStroke2}
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

      {!collapsed && (
        <div className="flex items-baseline" style={{ gap: s.gap }}>
          <span
            className={`font-bold tracking-tight ${textClass}`}
            style={{ fontSize: s.fontSize, lineHeight: 1 }}
          >
            Lead
            <span className="font-extrabold">Drive</span>
          </span>
          <span
            className={`border-l pl-2 font-light tracking-widest ${crmClass}`}
            style={{ fontSize: s.crmSize, lineHeight: 1 }}
          >
            CRM
          </span>
        </div>
      )}
    </div>
  )
}
