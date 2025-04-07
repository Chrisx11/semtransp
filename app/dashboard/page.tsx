"use client"

import { useEffect, useState, useCallback } from "react"
import LayoutAutenticado from "@/components/layout-autenticado"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Users,
  Car,
  Package,
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Calendar,
  Info,
  BarChartIcon,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { supabase } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import GraficoManutencao from "@/components/grafico-manutencao"
import { ResponsiveCardGrid } from "@/components/ui/responsive-card-grid"
import { ResponsiveTable } from "@/components/ui/responsive-table"
import { useMediaQuery } from "@/hooks/use-media-query"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"

// Definição de tipos
interface Veiculo {
  id: number
  placa: string
  modelo: string
  marca: string
  tipo_medicao: string
  medicao_atual?: number
  ultima_atualizacao?: string
  status: string
}

interface TrocaOleo {
  id: number
  veiculo_id: number
  data_troca: string
  medicao_troca: number
  proxima_troca: number
}

interface VeiculoComStatus extends Veiculo {
  statusTroca: "nunca" | "vencido" | "proximo" | "em_dia"
  diasRestantes?: number
  kmRestantes?: number
}

interface OrdemServicoStatus {
  status: string
  quantidade: number
  color: string
}

interface OrdemServico {
  id: number
  veiculo_id?: number
  status?: string
  status_pedido?: string
  [key: string]: any
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [totalColaboradores, setTotalColaboradores] = useState(0)
  const [totalVeiculos, setTotalVeiculos] = useState(0)
  const [totalProdutos, setTotalProdutos] = useState(0)
  const [ordensServico, setOrdensServico] = useState(0)

  // Estados para as outras seções do dashboard
  const [veiculosOperacionais, setVeiculosOperacionais] = useState(0)
  const [veiculosIndisponiveis, setVeiculosIndisponiveis] = useState(0)
  const [ultimasAtividades, setUltimasAtividades] = useState([])
  const [refreshing, setRefreshing] = useState(false)

  // Estados para alertas de manutenção
  const [veiculosNuncaTrocaram, setVeiculosNuncaTrocaram] = useState<VeiculoComStatus[]>([])
  const [veiculosVencidos, setVeiculosVencidos] = useState<VeiculoComStatus[]>([])
  const [veiculosProximos, setVeiculosProximos] = useState<VeiculoComStatus[]>([])
  const [veiculosEmDia, setVeiculosEmDia] = useState<VeiculoComStatus[]>([])
  const [categoriaAtiva, setCategoriaAtiva] = useState<"grafico" | "nunca" | "vencido" | "proximo" | "em_dia">(
    "grafico",
  )

  // Adicionar estados para o modal e dados do gráfico após os outros estados
  const [ordensStatusDialogOpen, setOrdensStatusDialogOpen] = useState(false)
  const [ordensStatusData, setOrdensStatusData] = useState<OrdemServicoStatus[]>([])
  const [loadingOrdensStatus, setLoadingOrdensStatus] = useState(false)

  // Verificar se é um dispositivo móvel
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Função para carregar dados, extraída para poder ser chamada novamente quando necessário
  const carregarDados = useCallback(async () => {
    setLoading(true)
    try {
      console.log("Carregando dados do dashboard...")

      // Carregar total de colaboradores
      const { count: colaboradores, error: errorColaboradores } = await supabase
        .from("colaboradores")
        .select("*", { count: "exact", head: true })

      if (errorColaboradores) throw new Error(`Erro ao carregar colaboradores: ${errorColaboradores.message}`)
      setTotalColaboradores(colaboradores || 0)

      // Carregar total de veículos
      const { data: todosVeiculos, error: errorVeiculos } = await supabase.from("veiculos").select("*")

      if (errorVeiculos) throw new Error(`Erro ao carregar veículos: ${errorVeiculos.message}`)
      setTotalVeiculos(todosVeiculos?.length || 0)

      // Carregar total de produtos
      const { count: produtos, error: errorProdutos } = await supabase
        .from("produtos")
        .select("*", { count: "exact", head: true })

      if (errorProdutos) throw new Error(`Erro ao carregar produtos: ${errorProdutos.message}`)
      setTotalProdutos(produtos || 0)

      // Declarar a variável ordensAbertas fora do bloco try/catch para que esteja disponível em todo o escopo
      let ordensAbertas: OrdemServico[] = []

      // Carregar ordens de serviço em aberto
      try {
        // Verificar se a tabela ordens_servico existe
        let tabelaExiste = true
        try {
          const { data: checkTabela, error: errorCheck } = await supabase.from("ordens_servico").select("id").limit(1)

          if (errorCheck && errorCheck.message.includes("does not exist")) {
            tabelaExiste = false
            console.log("Tabela ordens_servico não existe")
          }
        } catch (error) {
          tabelaExiste = false
          console.log("Erro ao verificar tabela ordens_servico:", error)
        }

        if (!tabelaExiste) {
          console.log("Tabela ordens_servico não existe, usando tabela manutencoes")
          // Fallback para a tabela manutencoes
          const { data: ordensAbertasManutencao, error: errorOrdens } = await supabase.from("manutencoes").select("*")
          if (errorOrdens) throw new Error(`Erro ao carregar ordens de serviço: ${errorOrdens.message}`)
          setOrdensServico(ordensAbertasManutencao?.length || 0)
          ordensAbertas = ordensAbertasManutencao || []
        } else {
          // Buscar ordens de serviço não finalizadas
          const { data: ordensNaoFinalizadas, error: errorOrdens } = await supabase
            .from("ordens_servico")
            .select("*")
            .not("status", "in", '("Finalizado","Concluída")')
            .not("status_pedido", "in", '("Finalizado","Concluída")')

          if (errorOrdens) throw new Error(`Erro ao carregar ordens de serviço: ${errorOrdens.message}`)
          setOrdensServico(ordensNaoFinalizadas?.length || 0)
          console.log(`Total de ordens não finalizadas: ${ordensNaoFinalizadas?.length || 0}`)
          ordensAbertas = ordensNaoFinalizadas || []
        }
      } catch (error) {
        console.error("Erro ao carregar ordens de serviço:", error)
        setOrdensServico(0)
      }

      // Processar status da frota
      if (todosVeiculos) {
        console.log(`Total de veículos encontrados: ${todosVeiculos.length}`)

        // Contar veículos inativos
        const veiculosInativosCount = todosVeiculos.filter((v) => v.status === "Inativo").length
        console.log(`Veículos com status Inativo: ${veiculosInativosCount}`)

        // Conjunto para armazenar IDs de veículos indisponíveis (para evitar duplicatas)
        const veiculosIndisponiveisIds = new Set()

        // Adicionar veículos inativos ao conjunto
        todosVeiculos.forEach((veiculo) => {
          if (veiculo.status === "Inativo") {
            veiculosIndisponiveisIds.add(veiculo.id)
          }
        })

        // Verificar veículos com ordens de serviço abertas
        if (ordensAbertas && ordensAbertas.length > 0) {
          console.log(`Ordens de serviço abertas: ${ordensAbertas.length}`)

          ordensAbertas.forEach((ordem) => {
            if (ordem.veiculo_id) {
              veiculosIndisponiveisIds.add(ordem.veiculo_id)

              // Log para depuração
              const veiculo = todosVeiculos.find((v) => v.id === ordem.veiculo_id)
              if (veiculo) {
                console.log(`Veículo ${veiculo.placa} indisponível devido a ordem de serviço #${ordem.id}`)
              }
            }
          })
        }

        // Calcular totais
        const indisponiveis = veiculosIndisponiveisIds.size
        console.log(`Total de veículos indisponíveis: ${indisponiveis}`)
        console.log(`IDs dos veículos indisponíveis: ${Array.from(veiculosIndisponiveisIds).join(", ")}`)

        setVeiculosIndisponiveis(indisponiveis)
        setVeiculosOperacionais(todosVeiculos.length - indisponiveis)
      }

      // Carregar dados de trocas de óleo
      await carregarDadosTrocasOleo()

      // Simular atividades recentes
      setUltimasAtividades([
        {
          id: "1",
          descricao: "Atualização do dashboard",
          data: new Date().toLocaleDateString("pt-BR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          usuario: "Sistema",
        },
      ])
    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error)
      toast({
        title: "Erro",
        description: `Falha ao carregar dados: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // Função para carregar dados de trocas de óleo
  const carregarDadosTrocasOleo = async () => {
    try {
      // Verificar se a tabela trocas_oleo existe
      let tabelaExiste = true
      try {
        const { data: checkTabela, error: errorCheck } = await supabase.from("trocas_oleo").select("id").limit(1)

        if (errorCheck && errorCheck.message.includes("does not exist")) {
          tabelaExiste = false
          console.log("Tabela trocas_oleo não existe")
        }
      } catch (error) {
        tabelaExiste = false
        console.log("Erro ao verificar tabela trocas_oleo:", error)
      }

      if (!tabelaExiste) {
        console.log("Tabela trocas_oleo não existe, não é possível carregar dados de manutenção")
        return
      }

      // Buscar todos os veículos
      const { data: veiculos, error: errorVeiculos } = await supabase.from("veiculos").select("*")

      if (errorVeiculos) {
        throw new Error(`Erro ao carregar veículos: ${errorVeiculos.message}`)
      }

      if (!veiculos || veiculos.length === 0) {
        console.log("Nenhum veículo encontrado")
        return
      }

      // Buscar todas as trocas de óleo
      const { data: trocasOleo, error: errorTrocas } = await supabase
        .from("trocas_oleo")
        .select("*")
        .order("data_troca", { ascending: false })

      if (errorTrocas) {
        throw new Error(`Erro ao carregar trocas de óleo: ${errorTrocas.message}`)
      }

      // Buscar as últimas atualizações de quilometragem para cada veículo
      const veiculosComMedicao = await Promise.all(
        veiculos.map(async (veiculo) => {
          // Buscar a última atualização de quilometragem
          const { data: atualizacoes, error: atualizacoesError } = await supabase
            .from("atualizacoes_km")
            .select("medicao_atual, data_atualizacao")
            .eq("veiculo_id", veiculo.id)
            .order("data_atualizacao", { ascending: false })
            .limit(1)

          if (atualizacoesError) {
            console.error("Erro ao buscar atualizações:", atualizacoesError)
            return {
              ...veiculo,
              medicao_atual: 0,
              ultima_atualizacao: null,
            }
          }

          return {
            ...veiculo,
            medicao_atual: atualizacoes && atualizacoes.length > 0 ? atualizacoes[0].medicao_atual : 0,
            ultima_atualizacao: atualizacoes && atualizacoes.length > 0 ? atualizacoes[0].data_atualizacao : null,
          }
        }),
      )

      // Criar um mapa de veículo_id para a última troca de óleo
      const ultimasTrocas = {}
      if (trocasOleo && trocasOleo.length > 0) {
        trocasOleo.forEach((troca) => {
          if (
            !ultimasTrocas[troca.veiculo_id] ||
            new Date(troca.data_troca) > new Date(ultimasTrocas[troca.veiculo_id].data_troca)
          ) {
            ultimasTrocas[troca.veiculo_id] = troca
          }
        })
      }

      // Categorizar veículos com base no status de troca de óleo
      const nunca: VeiculoComStatus[] = []
      const vencidos: VeiculoComStatus[] = []
      const proximos: VeiculoComStatus[] = []
      const emDia: VeiculoComStatus[] = []

      veiculosComMedicao.forEach((veiculo) => {
        const troca = ultimasTrocas[veiculo.id]

        if (!troca) {
          // Nunca fez troca de óleo
          nunca.push({
            ...veiculo,
            statusTroca: "nunca",
          })
          return
        }

        const medicaoAtual = veiculo.medicao_atual || 0
        const medicaoTroca = troca.medicao_troca
        const proximaTroca = troca.proxima_troca

        // Calcular a diferença entre a medição atual e a medição da troca
        const diferencaMedicao = medicaoAtual - medicaoTroca

        // Calcular a porcentagem de uso
        const porcentagemUso = Math.min(100, Math.round((diferencaMedicao / (proximaTroca - medicaoTroca)) * 100))

        if (medicaoAtual >= proximaTroca) {
          // Troca vencida
          vencidos.push({
            ...veiculo,
            statusTroca: "vencido",
            kmRestantes: medicaoAtual - proximaTroca,
          })
        } else if (porcentagemUso >= 75) {
          // Próximo da troca
          proximos.push({
            ...veiculo,
            statusTroca: "proximo",
            kmRestantes: proximaTroca - medicaoAtual,
          })
        } else {
          // Em dia
          emDia.push({
            ...veiculo,
            statusTroca: "em_dia",
            kmRestantes: proximaTroca - medicaoAtual,
          })
        }
      })

      // Atualizar estados
      setVeiculosNuncaTrocaram(nunca)
      setVeiculosVencidos(vencidos)
      setVeiculosProximos(proximos)
      setVeiculosEmDia(emDia)

      console.log(`Veículos que nunca trocaram óleo: ${nunca.length}`)
      console.log(`Veículos com troca vencida: ${vencidos.length}`)
      console.log(`Veículos próximos da troca: ${proximos.length}`)
      console.log(`Veículos em dia: ${emDia.length}`)
    } catch (error) {
      console.error("Erro ao carregar dados de trocas de óleo:", error)
      toast({
        title: "Erro",
        description: `Falha ao carregar dados de manutenção: ${error.message}`,
        variant: "destructive",
      })
    }
  }

  // Adicionar função para buscar dados de ordens de serviço por status após a função carregarDadosTrocasOleo
  const carregarDadosOrdensPorStatus = async () => {
    try {
      setLoadingOrdensStatus(true)

      // Verificar se a tabela ordens_servico existe
      let tabelaExiste = true
      try {
        const { data: checkTabela, error: errorCheck } = await supabase.from("ordens_servico").select("id").limit(1)

        if (errorCheck && errorCheck.message.includes("does not exist")) {
          tabelaExiste = false
          console.log("Tabela ordens_servico não existe")
        }
      } catch (error) {
        tabelaExiste = false
        console.log("Erro ao verificar tabela ordens_servico:", error)
      }

      if (!tabelaExiste) {
        console.log("Tabela ordens_servico não existe, não é possível carregar dados")
        setOrdensStatusData([])
        return
      }

      // Buscar todas as ordens de serviço
      const { data: ordensData, error: ordensError } = await supabase
        .from("ordens_servico")
        .select("status, status_pedido")

      if (ordensError) {
        throw ordensError
      }

      if (!ordensData || ordensData.length === 0) {
        setOrdensStatusData([])
        return
      }

      // Contar ordens por status
      const statusCount: Record<string, number> = {}

      ordensData.forEach((ordem) => {
        // Usar status_pedido se existir, caso contrário usar status
        const statusFinal = ordem.status_pedido || ordem.status

        if (statusFinal) {
          statusCount[statusFinal] = (statusCount[statusFinal] || 0) + 1
        }
      })

      // Definir cores para cada status
      const statusColors: Record<string, string> = {
        Aberta: "#3b82f6", // blue-500
        "Em andamento": "#8b5cf6", // violet-500
        Pendente: "#f59e0b", // amber-500
        Concluída: "#10b981", // emerald-500
        "Em aprovação": "#6366f1", // indigo-500
        Recusado: "#ef4444", // red-500
        "Aguardando OS": "#9333ea", // purple-600
        "Aguardando Fornecedor": "#f97316", // orange-500
        "Fila de Serviço": "#0ea5e9", // sky-500
        "Serviço Externo": "#ec4899", // pink-500
        "Em Serviço": "#14b8a6", // teal-500
        Finalizado: "#22c55e", // green-500
      }

      // Transformar em array para o gráfico
      const statusData = Object.keys(statusCount).map((status) => ({
        status,
        quantidade: statusCount[status],
        color: statusColors[status] || "#6b7280", // gray-500 como cor padrão
      }))

      // Ordenar por quantidade (maior para menor)
      statusData.sort((a, b) => b.quantidade - a.quantidade)

      setOrdensStatusData(statusData)
    } catch (error) {
      console.error("Erro ao carregar dados de ordens por status:", error)
      toast({
        title: "Erro",
        description: `Falha ao carregar dados de ordens de serviço: ${error.message}`,
        variant: "destructive",
      })
      setOrdensStatusData([])
    } finally {
      setLoadingOrdensStatus(false)
    }
  }

  // Função para abrir o modal de ordens por status
  const handleOpenOrdensStatusDialog = () => {
    carregarDadosOrdensPorStatus()
    setOrdensStatusDialogOpen(true)
  }

  // Função para atualizar os dados manualmente
  const atualizarDados = () => {
    setRefreshing(true)
    carregarDados()
  }

  // Carregar dados na inicialização
  useEffect(() => {
    carregarDados()
  }, [carregarDados])

  // Obter label para o tipo de medição
  const getMedicaoLabel = (tipoMedicao: string) => {
    switch (tipoMedicao) {
      case "Quilometragem":
        return "Quilômetros"
      case "Horimetro":
        return "Horas"
      case "Meses":
        return "Meses"
      default:
        return "Medição"
    }
  }

  // Obter unidade para o tipo de medição
  const getMedicaoUnidade = (tipoMedicao: string) => {
    switch (tipoMedicao) {
      case "Quilometragem":
        return "km"
      case "Horimetro":
        return "h"
      case "Meses":
        return "meses"
      default:
        return ""
    }
  }

  // Função para obter a categoria a partir do índice do gráfico
  const getCategoriaFromIndex = (index: number): "vencido" | "proximo" | "em_dia" | "nunca" => {
    const categorias = ["vencido", "proximo", "em_dia", "nunca"]
    return categorias[index] as "vencido" | "proximo" | "em_dia" | "nunca"
  }

  // Preparar dados para o gráfico de pizza
  const dadosGrafico = [
    { name: "Trocas Vencidas", value: veiculosVencidos.length, color: "#ef4444" },
    { name: "Próximas Trocas", value: veiculosProximos.length, color: "#f59e0b" },
    { name: "Em Dia", value: veiculosEmDia.length, color: "#10b981" },
    { name: "Nunca Trocaram", value: veiculosNuncaTrocaram.length, color: "#6b7280" },
  ]

  // Cards de estatísticas
  const cards = [
    {
      title: "Colaboradores",
      description: "Total de colaboradores ativos",
      icon: Users,
      value: loading ? <Skeleton className="h-8 w-16" /> : totalColaboradores,
      onClick: undefined,
    },
    {
      title: "Veículos",
      description: "Total de veículos cadastrados",
      icon: Car,
      value: loading ? <Skeleton className="h-8 w-16" /> : totalVeiculos,
      onClick: undefined,
    },
    {
      title: "Produtos",
      description: "Itens no estoque",
      icon: Package,
      value: loading ? <Skeleton className="h-8 w-16" /> : totalProdutos,
      onClick: undefined,
    },
    {
      title: "Ordens de Serviço",
      description: "Manutenções em andamento",
      icon: FileText,
      value: loading ? <Skeleton className="h-8 w-16" /> : ordensServico,
      onClick: handleOpenOrdensStatusDialog,
    },
  ]

  // Colunas para tabelas responsivas
  const colunasVeiculosVencidos = [
    { header: "Placa", accessorKey: "placa" },
    {
      header: "Veículo",
      accessorKey: "modelo",
      cell: (_, row) => `${row.marca} ${row.modelo}`,
    },
    {
      header: "Medição Atual",
      accessorKey: "medicao_atual",
      cell: (value, row) => `${value || 0} ${getMedicaoUnidade(row.tipo_medicao)}`,
    },
    {
      header: "Status",
      accessorKey: "statusTroca",
      cell: () => (
        <Badge className="bg-red-100 dark:bg-red-900/70 text-red-800 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Troca Necessária
        </Badge>
      ),
    },
  ]

  const colunasVeiculosProximos = [
    { header: "Placa", accessorKey: "placa" },
    {
      header: "Veículo",
      accessorKey: "modelo",
      cell: (_, row) => `${row.marca} ${row.modelo}`,
    },
    {
      header: "Medição Atual",
      accessorKey: "medicao_atual",
      cell: (value, row) => `${value || 0} ${getMedicaoUnidade(row.tipo_medicao)}`,
    },
    {
      header: "Próxima Troca",
      accessorKey: "kmRestantes",
      cell: (value, row) => (
        <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900 text-amber-700 dark:text-amber-300">
          Faltam {value} {getMedicaoUnidade(row.tipo_medicao)}
        </Badge>
      ),
    },
    {
      header: "Status",
      accessorKey: "statusTroca",
      cell: () => (
        <Badge className="bg-amber-100 dark:bg-amber-900/70 text-amber-800 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-800">
          <AlertCircle className="h-3 w-3 mr-1" />
          Próximo da Troca
        </Badge>
      ),
    },
  ]

  const colunasVeiculosEmDia = [
    { header: "Placa", accessorKey: "placa" },
    {
      header: "Veículo",
      accessorKey: "modelo",
      cell: (_, row) => `${row.marca} ${row.modelo}`,
    },
    {
      header: "Medição Atual",
      accessorKey: "medicao_atual",
      cell: (value, row) => `${value || 0} ${getMedicaoUnidade(row.tipo_medicao)}`,
    },
    {
      header: "Próxima Troca",
      accessorKey: "kmRestantes",
      cell: (value, row) => (
        <Badge variant="outline" className="bg-green-50 dark:bg-green-900 text-green-700 dark:text-green-300">
          Faltam {value} {getMedicaoUnidade(row.tipo_medicao)}
        </Badge>
      ),
    },
    {
      header: "Status",
      accessorKey: "statusTroca",
      cell: () => (
        <Badge className="bg-green-100 dark:bg-green-900/70 text-green-800 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-800">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Em Dia
        </Badge>
      ),
    },
  ]

  const colunasVeiculosNunca = [
    { header: "Placa", accessorKey: "placa" },
    {
      header: "Veículo",
      accessorKey: "modelo",
      cell: (_, row) => `${row.marca} ${row.modelo}`,
    },
    {
      header: "Medição Atual",
      accessorKey: "medicao_atual",
      cell: (value, row) => `${value || 0} ${getMedicaoUnidade(row.tipo_medicao)}`,
    },
    {
      header: "Status",
      accessorKey: "statusTroca",
      cell: () => (
        <Badge className="bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700">
          <Calendar className="h-3 w-3 mr-1" />
          Nunca Trocou
        </Badge>
      ),
    },
  ]

  return (
    <LayoutAutenticado>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">Dashboard</h2>
            <p className="text-muted-foreground">
              Visão geral do Sistema de Gestão SEMTRANSP - {new Date().toLocaleDateString("pt-BR")}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={atualizarDados}
            disabled={loading || refreshing}
            className="flex items-center gap-1 self-start md:self-auto"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </div>

        {/* Cards de estatísticas */}
        <ResponsiveCardGrid>
          {cards.map((card, index) => (
            <Card
              key={index}
              className={`dark:border-gray-800 ${card.onClick ? "cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors" : ""}`}
              onClick={card.onClick}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          ))}
        </ResponsiveCardGrid>

        {/* Status da Frota e Alertas */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Status da Frota */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status da Frota</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-20 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-sm">Operacionais</span>
                    </div>
                    <span className="font-medium">{veiculosOperacionais}</span>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <span className="text-sm">Indisponíveis</span>
                    </div>
                    <span className="font-medium">{veiculosIndisponiveis}</span>
                  </div>

                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>Disponibilidade da Frota</span>
                      <span>{totalVeiculos > 0 ? Math.round((veiculosOperacionais / totalVeiculos) * 100) : 0}%</span>
                    </div>
                    <Progress
                      value={totalVeiculos > 0 ? (veiculosOperacionais / totalVeiculos) * 100 : 0}
                      className="h-2"
                    />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Alertas de Manutenção - Resumo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Alertas de Manutenção</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    <div
                      className="bg-red-50 dark:bg-red-950/50 p-3 rounded-md cursor-pointer hover:bg-red-100 dark:hover:bg-red-900/60 transition-colors"
                      onClick={() => setCategoriaAtiva("vencido")}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-red-700 dark:text-red-400">Trocas Vencidas</span>
                        <Badge variant="outline" className="bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300">
                          {veiculosVencidos.length}
                        </Badge>
                      </div>
                      <Progress
                        value={100}
                        className="h-1.5 bg-red-100 dark:bg-red-900"
                        indicatorClassName="bg-red-500"
                      />
                    </div>

                    <div
                      className="bg-amber-50 dark:bg-amber-950/50 p-3 rounded-md cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-900/60 transition-colors"
                      onClick={() => setCategoriaAtiva("proximo")}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-amber-700 dark:text-amber-400">Próximas Trocas</span>
                        <Badge
                          variant="outline"
                          className="bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300"
                        >
                          {veiculosProximos.length}
                        </Badge>
                      </div>
                      <Progress
                        value={100}
                        className="h-1.5 bg-amber-100 dark:bg-amber-900"
                        indicatorClassName="bg-amber-500"
                      />
                    </div>

                    <div
                      className="bg-green-50 dark:bg-green-950/50 p-3 rounded-md cursor-pointer hover:bg-green-100 dark:hover:bg-green-900/60 transition-colors"
                      onClick={() => setCategoriaAtiva("em_dia")}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-green-700 dark:text-green-400">Em Dia</span>
                        <Badge
                          variant="outline"
                          className="bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300"
                        >
                          {veiculosEmDia.length}
                        </Badge>
                      </div>
                      <Progress
                        value={100}
                        className="h-1.5 bg-green-100 dark:bg-green-900"
                        indicatorClassName="bg-green-500"
                      />
                    </div>

                    <div
                      className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => setCategoriaAtiva("nunca")}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Nunca Trocaram</span>
                        <Badge
                          variant="outline"
                          className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300"
                        >
                          {veiculosNuncaTrocaram.length}
                        </Badge>
                      </div>
                      <Progress
                        value={100}
                        className="h-1.5 bg-gray-100 dark:bg-gray-700"
                        indicatorClassName="bg-gray-500"
                      />
                    </div>
                  </div>

                  <div className="text-center text-xs text-muted-foreground">
                    Clique em uma categoria para ver os veículos
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Alertas de Manutenção - Detalhado */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Detalhes de Manutenção</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-[300px] w-full" />
              </div>
            ) : (
              <Tabs value={categoriaAtiva} onValueChange={(value) => setCategoriaAtiva(value as any)}>
                <div className="mb-4 overflow-x-auto">
                  <TabsList className="inline-flex w-auto min-w-full md:w-full">
                    <TabsTrigger value="grafico">Gráfico</TabsTrigger>
                    <TabsTrigger value="vencido" className="text-red-600 dark:text-red-400">
                      Vencidos
                    </TabsTrigger>
                    <TabsTrigger value="proximo" className="text-amber-600 dark:text-amber-400">
                      Próximos
                    </TabsTrigger>
                    <TabsTrigger value="em_dia" className="text-green-600 dark:text-green-400">
                      Em Dia
                    </TabsTrigger>
                    <TabsTrigger value="nunca" className="text-gray-600 dark:text-gray-400">
                      Nunca Trocaram
                    </TabsTrigger>
                  </TabsList>
                </div>

                <TabsContent value="grafico" className="mt-0">
                  <div className="flex flex-col items-center justify-center py-4">
                    {/* Gráfico de pizza usando o componente separado */}
                    <GraficoManutencao
                      dados={dadosGrafico}
                      onCategoriaClick={(index) => setCategoriaAtiva(getCategoriaFromIndex(index))}
                    />

                    <div className="mt-4 text-center text-sm text-muted-foreground">
                      Clique em um segmento do gráfico ou na legenda para ver os detalhes
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="vencido" className="mt-0">
                  <ResponsiveTable
                    data={veiculosVencidos}
                    columns={colunasVeiculosVencidos}
                    emptyMessage={
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
                        <p>Nenhum veículo com troca de óleo vencida</p>
                      </div>
                    }
                  />
                </TabsContent>

                <TabsContent value="proximo" className="mt-0">
                  <ResponsiveTable
                    data={veiculosProximos}
                    columns={colunasVeiculosProximos}
                    emptyMessage={
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Info className="h-8 w-8 text-blue-500 mb-2" />
                        <p>Nenhum veículo próximo da troca de óleo</p>
                      </div>
                    }
                  />
                </TabsContent>

                <TabsContent value="em_dia" className="mt-0">
                  <ResponsiveTable
                    data={veiculosEmDia}
                    columns={colunasVeiculosEmDia}
                    emptyMessage={
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <Info className="h-8 w-8 text-blue-500 mb-2" />
                        <p>Nenhum veículo com troca de óleo em dia</p>
                      </div>
                    }
                  />
                </TabsContent>

                <TabsContent value="nunca" className="mt-0">
                  <ResponsiveTable
                    data={veiculosNuncaTrocaram}
                    columns={colunasVeiculosNunca}
                    emptyMessage={
                      <div className="flex flex-col items-center justify-center text-muted-foreground">
                        <CheckCircle2 className="h-8 w-8 text-green-500 mb-2" />
                        <p>Todos os veículos já realizaram troca de óleo</p>
                      </div>
                    }
                  />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Atividades do Sistema */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Atividades do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : ultimasAtividades.length > 0 ? (
              <div className="relative pl-6 border-l border-gray-200">
                {ultimasAtividades.map((atividade, index) => (
                  <div key={index} className="mb-4 relative">
                    <div className="absolute -left-[25px] w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <Clock className="h-2.5 w-2.5 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{atividade.descricao}</p>
                      <p className="text-xs text-muted-foreground">
                        {atividade.data} • {atividade.usuario}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-sm text-muted-foreground">Nenhuma atividade recente registrada</div>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Modal de Ordens de Serviço por Status */}
      <Dialog open={ordensStatusDialogOpen} onOpenChange={setOrdensStatusDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChartIcon className="h-5 w-5" />
              Ordens de Serviço por Status
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            {loadingOrdensStatus ? (
              <div className="flex justify-center items-center h-[300px]">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            ) : ordensStatusData.length > 0 ? (
              <div className="w-full h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={ordensStatusData} margin={{ top: 20, right: 30, left: 20, bottom: 70 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="status" angle={-45} textAnchor="end" height={70} tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip
                      formatter={(value) => [`${value} ordens`, "Quantidade"]}
                      labelFormatter={(label) => `Status: ${label}`}
                    />
                    <Bar dataKey="quantidade" name="Quantidade">
                      {ordensStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                <Info className="h-12 w-12 text-blue-500 mb-2" />
                <p>Não há dados de ordens de serviço disponíveis</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      <Toaster />
    </LayoutAutenticado>
  )
}

