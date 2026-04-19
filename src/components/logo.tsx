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

  // Sidebar logo: always white text (dark navy sidebar)
  // Normal logo: navy text in light, white in dark
  const textClass = sidebar
    ? "text-white"
    : "text-foreground dark:text-white"
  const crmClass = sidebar
    ? "text-white/50 border-white/20"
    : "text-muted-foreground border-border"

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg
        width={s.icon}
        height={s.icon}
        viewBox="0 0 1024 1024"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* D with chamfered top-left — LeadDrive mark */}
        <path
          fillRule="evenodd"
          className={sidebar ? "fill-white" : "fill-foreground dark:fill-white"}
          d="M 370 160 L 420 160 A 352 352 0 0 1 420 864 L 220 864 L 220 440 Z M 420 292 A 220 220 0 0 1 420 732 L 420 732 Z"
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
