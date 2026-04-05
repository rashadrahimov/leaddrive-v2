"use client"

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* Always show alpine video on login */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <video
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="h-full w-full object-cover"
        >
          <source src="/wallpapers/alpine.mp4" type="video/mp4" />
        </video>
      </div>
      <div className="relative z-[2] flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-md [&_.rounded-xl]:bg-[hsl(210_18%_14%/0.70)] [&_.rounded-xl]:text-white [&_.rounded-xl]:backdrop-blur-xl [&_.rounded-xl]:border-white/15 [&_label]:text-white/90 [&_input]:bg-white/10 [&_input]:text-white [&_input]:border-white/20 [&_input]:placeholder-white/40 [&_.text-muted-foreground]:text-white/60 [&_a]:text-white/70 [&_a:hover]:text-white">
          {children}
        </div>
      </div>
    </>
  )
}
