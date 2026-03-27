"use client"

interface PageDescriptionProps {
  text: string
}

export function PageDescription({ text }: PageDescriptionProps) {
  return (
    <p className="text-sm text-muted-foreground -mt-1 mb-4">{text}</p>
  )
}
