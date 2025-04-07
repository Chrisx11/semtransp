"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { useMediaQuery } from "@/hooks/use-media-query"

interface ResponsiveCardGridProps {
  children: React.ReactNode
  className?: string
}

export function ResponsiveCardGrid({ children, className }: ResponsiveCardGridProps) {
  const isMobile = useMediaQuery("(max-width: 640px)")
  const isTablet = useMediaQuery("(min-width: 641px) and (max-width: 1024px)")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Não renderizar nada durante a montagem do componente no servidor
  if (!mounted) {
    return <div className="grid gap-4 grid-cols-1">{children}</div>
  }

  return (
    <div
      className={cn(
        "grid gap-4",
        isMobile ? "grid-cols-1" : isTablet ? "grid-cols-2" : "md:grid-cols-2 lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  )
}

