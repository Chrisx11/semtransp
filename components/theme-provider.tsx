"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes"

interface ThemeConfig {
  fontSize: number
  buttonRadius: number
  primaryColor: string
  secondaryColor: string
  titleColor: string
}

interface ThemeContextType {
  themeConfig: ThemeConfig
  updateThemeConfig: (config: Partial<ThemeConfig>) => void
  saveThemeConfig: () => void
}

const defaultThemeConfig: ThemeConfig = {
  fontSize: 16,
  buttonRadius: 6,
  primaryColor: "#1e40af",
  secondaryColor: "#6b7280",
  titleColor: "#111827",
}

const ThemeContext = createContext<ThemeContextType>({
  themeConfig: defaultThemeConfig,
  updateThemeConfig: () => null,
  saveThemeConfig: () => null,
})

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(defaultThemeConfig)

  // Carregar configurações do localStorage ao iniciar
  useEffect(() => {
    const savedConfig = localStorage.getItem("themeConfig")
    if (savedConfig) {
      try {
        const parsedConfig = JSON.parse(savedConfig)
        setThemeConfig(parsedConfig)
        applyThemeConfig(parsedConfig)
      } catch (error) {
        console.error("Erro ao carregar configurações de tema:", error)
      }
    }
  }, [])

  const updateThemeConfig = (config: Partial<ThemeConfig>) => {
    setThemeConfig((prev) => {
      const newConfig = { ...prev, ...config }
      applyThemeConfig(newConfig)
      return newConfig
    })
  }

  const saveThemeConfig = () => {
    localStorage.setItem("themeConfig", JSON.stringify(themeConfig))
  }

  const applyThemeConfig = (config: ThemeConfig) => {
    document.documentElement.style.setProperty("--font-size-base", `${config.fontSize}px`)
    document.documentElement.style.setProperty("--button-radius", `${config.buttonRadius}px`)
    document.documentElement.style.setProperty("--color-primary", config.primaryColor)
    document.documentElement.style.setProperty("--color-secondary", config.secondaryColor)
    document.documentElement.style.setProperty("--color-title", config.titleColor)
  }

  return (
    <ThemeContext.Provider
      value={{
        themeConfig,
        updateThemeConfig,
        saveThemeConfig,
      }}
    >
      <NextThemesProvider {...props}>{children}</NextThemesProvider>
    </ThemeContext.Provider>
  )
}

export const useThemeConfig = () => useContext(ThemeContext)

