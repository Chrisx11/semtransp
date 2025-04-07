"use client"

import { useState, useEffect } from "react"

export function useMediaQuery(query: string): boolean {
  // Inicializar com false para evitar erros de hidratação
  const [matches, setMatches] = useState(false)
  // Adicionar estado para controlar se o componente está montado
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)

    // Verificar se estamos no navegador
    if (typeof window !== "undefined") {
      const media = window.matchMedia(query)

      // Definir o valor inicial
      setMatches(media.matches)

      // Definir um callback para quando o valor mudar
      const listener = () => setMatches(media.matches)

      // Usar o método correto para adicionar o listener (compatível com navegadores mais antigos)
      if (media.addEventListener) {
        media.addEventListener("change", listener)
      } else {
        // Fallback para navegadores mais antigos
        media.addListener(listener)
      }

      // Limpar o listener quando o componente for desmontado
      return () => {
        if (media.removeEventListener) {
          media.removeEventListener("change", listener)
        } else {
          // Fallback para navegadores mais antigos
          media.removeListener(listener)
        }
      }
    }

    return undefined
  }, [query])

  // Retornar false durante a renderização do servidor para evitar erros de hidratação
  return mounted ? matches : false
}

