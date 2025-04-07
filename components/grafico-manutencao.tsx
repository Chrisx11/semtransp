"use client"

import { useEffect, useState } from "react"
import { useMediaQuery } from "@/hooks/use-media-query"
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { Info } from "lucide-react"

interface DadosGrafico {
  name: string
  value: number
  color: string
}

interface GraficoManutencaoProps {
  dados: DadosGrafico[]
  onCategoriaClick: (index: number) => void
}

// Componente de tooltip personalizado
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-gray-800 p-2 border border-gray-200 dark:border-gray-700 rounded shadow-sm">
        <p className="font-medium">{payload[0].name}</p>
        <p className="text-sm">
          {payload[0].value} veículo{payload[0].value !== 1 ? "s" : ""}
        </p>
      </div>
    )
  }
  return null
}

export default function GraficoManutencao({ dados, onCategoriaClick }: GraficoManutencaoProps) {
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [chartType, setChartType] = useState<"pie" | "bar">("pie")
  const [mounted, setMounted] = useState(false)

  // Verificar se há dados para exibir
  const temDados = dados && dados.length > 0 && dados.some((item) => item.value > 0)

  // Verificar se todos os dados estão em uma única categoria
  const categoriasComDados = dados.filter((d) => d.value > 0).length
  const categoriaUnica = categoriasComDados === 1

  // Verificar se uma categoria é dominante (representa mais de 85% dos dados)
  const totalVeiculos = dados.reduce((sum, item) => sum + item.value, 0)
  const categoriaDominante = dados.some((d) => d.value > 0 && d.value / totalVeiculos > 0.85)

  // Atualizar o tipo de gráfico quando o tamanho da tela mudar
  useEffect(() => {
    if (isMobile) {
      setChartType("bar")
    } else {
      setChartType("pie")
    }
  }, [isMobile])

  // Marcar quando o componente estiver montado
  useEffect(() => {
    setMounted(true)
  }, [])

  // Não renderizar nada durante a montagem do componente no servidor
  if (!mounted) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
        <p>Carregando gráfico...</p>
      </div>
    )
  }

  // Se não houver dados, exibir uma mensagem
  if (!temDados) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
        <Info className="h-12 w-12 text-blue-500 mb-2" />
        <p>Não há dados suficientes para gerar o gráfico</p>
      </div>
    )
  }

  // Renderizar o gráfico de barras para dispositivos móveis
  if (chartType === "bar") {
    return (
      <div className="w-full h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={dados} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 12 }} />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Bar
              dataKey="value"
              onClick={(_, index) => {
                if (index !== undefined && onCategoriaClick) {
                  onCategoriaClick(index)
                }
              }}
            >
              {dados.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  // Renderizar o gráfico de pizza para desktop
  return (
    <div className="w-full h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={dados}
            cx="50%"
            cy="45%"
            labelLine={!categoriaDominante}
            outerRadius={100}
            innerRadius={60}
            fill="#8884d8"
            dataKey="value"
            paddingAngle={2}
            animationDuration={800}
            label={({ name, value, percent }) => {
              // Não mostrar labels internos se uma categoria for dominante
              if (categoriaDominante || categoriaUnica) {
                return null
              }

              // Caso contrário, mostrar o label normal
              return `${name}: ${value}`
            }}
            onClick={(_, index) => {
              if (index !== undefined && onCategoriaClick) {
                onCategoriaClick(index)
              }
            }}
          >
            {dados.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} style={{ cursor: "pointer" }} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
          <Legend
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            wrapperStyle={{ paddingTop: 20 }}
            onClick={(data) => {
              if (data && data.value) {
                const index = dados.findIndex((item) => item.name === data.value)
                if (index >= 0 && onCategoriaClick) {
                  onCategoriaClick(index)
                }
              }
            }}
          />
          {categoriaUnica && (
            <div className="text-center text-sm text-muted-foreground mt-4 mb-2">
              Todos os veículos estão na mesma categoria. Clique na legenda para ver os detalhes.
            </div>
          )}
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

