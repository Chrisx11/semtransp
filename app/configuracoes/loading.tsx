import LayoutAutenticado from "@/components/layout-autenticado"

export default function Loading() {
  return (
    <LayoutAutenticado>
      <div className="flex h-[calc(100vh-12rem)] items-center justify-center">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p>Carregando configurações...</p>
        </div>
      </div>
    </LayoutAutenticado>
  )
}

