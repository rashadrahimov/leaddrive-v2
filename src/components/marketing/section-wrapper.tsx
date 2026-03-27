import { cn } from "@/lib/utils"

interface SectionWrapperProps {
  children: React.ReactNode
  id?: string
  variant?: "white" | "gray" | "gradient" | "navy"
  className?: string
  narrow?: boolean
}

export function SectionWrapper({
  children,
  id,
  variant = "white",
  className,
  narrow = false,
}: SectionWrapperProps) {
  const bg = {
    white: "bg-white",
    gray: "bg-[hsl(210,20%,97%)]",
    gradient: "bg-gradient-to-br from-[#F97316] to-[#FACC15] text-white",
    navy: "bg-slate-900 text-white",
  }

  return (
    <section id={id} className={cn("py-20 lg:py-28", bg[variant], className)}>
      <div className={cn("mx-auto px-4 lg:px-8", narrow ? "max-w-5xl" : "max-w-7xl")}>
        {children}
      </div>
    </section>
  )
}
