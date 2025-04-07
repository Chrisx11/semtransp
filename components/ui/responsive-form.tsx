import type React from "react"
import { useMediaQuery } from "@/hooks/use-media-query"
import { cn } from "@/lib/utils"

interface ResponsiveFormProps extends React.FormHTMLAttributes<HTMLFormElement> {
  children: React.ReactNode
  className?: string
}

export function ResponsiveForm({ children, className, ...props }: ResponsiveFormProps) {
  const isMobile = useMediaQuery("(max-width: 768px)")

  return (
    <form
      className={cn("space-y-6", isMobile ? "grid-cols-1" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4", className)}
      {...props}
    >
      {children}
    </form>
  )
}

interface ResponsiveFormFieldProps {
  label: string
  children: React.ReactNode
  className?: string
  fullWidth?: boolean
}

export function ResponsiveFormField({ label, children, className, fullWidth = false }: ResponsiveFormFieldProps) {
  const isMobile = useMediaQuery("(max-width: 768px)")

  return (
    <div
      className={cn(
        "grid gap-2",
        isMobile ? "grid-cols-1" : fullWidth ? "grid-cols-1" : "grid-cols-4 items-center",
        className,
      )}
    >
      <label className={cn("text-sm font-medium", isMobile ? "" : "text-right")}>{label}</label>
      <div className={isMobile ? "" : fullWidth ? "col-span-4" : "col-span-3"}>{children}</div>
    </div>
  )
}

