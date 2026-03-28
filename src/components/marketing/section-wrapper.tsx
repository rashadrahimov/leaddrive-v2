import { cn } from "@/lib/utils"

interface SectionWrapperProps {
  children: React.ReactNode
  id?: string
  variant?: "dark" | "darker" | "gradient" | "white" | "gray" | "navy"
  className?: string
  narrow?: boolean
}

export function SectionWrapper({
  children,
  id,
  variant = "dark",
  className,
  narrow = false,
}: SectionWrapperProps) {
  const bg: Record<string, string> = {
    dark: "bg-white",
    darker: "bg-slate-50",
    gradient: "bg-gradient-to-b from-white via-slate-50 to-white",
    white: "bg-white",
    gray: "bg-slate-50",
    navy: "bg-slate-900",
  }

  const isLight = variant !== "navy"

  return (
    <section id={id} className={cn("py-24 lg:py-32", isLight ? "text-slate-900" : "text-white", bg[variant], className)}>
      <div className={cn("mx-auto px-4 lg:px-8", narrow ? "max-w-5xl" : "max-w-7xl")}>
        {children}
      </div>
    </section>
  )
}
