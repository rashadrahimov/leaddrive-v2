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
    dark: "bg-slate-950",
    darker: "bg-slate-900",
    gradient: "bg-gradient-to-b from-slate-950 via-indigo-950/50 to-slate-950",
    white: "bg-slate-950",
    gray: "bg-slate-950",
    navy: "bg-slate-900",
  }

  return (
    <section id={id} className={cn("py-24 lg:py-32 text-white", bg[variant], className)}>
      <div className={cn("mx-auto px-4 lg:px-8", narrow ? "max-w-5xl" : "max-w-7xl")}>
        {children}
      </div>
    </section>
  )
}
