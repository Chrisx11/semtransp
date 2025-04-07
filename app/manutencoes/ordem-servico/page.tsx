"use client"

import type React from "react"

import { useState, useEffect } from "react"
import LayoutAutenticado from "@/components/layout-autenticado"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
// Adicionar o import do ícone History
import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  ChevronsUpDown,
  Check,
  ShoppingCart,
  History,
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Veiculo {
  id: number
  placa: string
  modelo: string
  marca: string
  tipo_medicao?: string
}

interface Colaborador {
  id: number
  nome: string
  cargo: string
}

interface OrdemServico {
  id: number
  data_abertura: string
  veiculo_id: number
  veiculo?: string // Campo calculado para exibição
  solicitante_id: number
  solicitante?: string // Campo calculado para exibição
  mecanico_id: number
  mecanico?: string // Campo calculado para exibição
  medicao_atual: number
  tipo_medicao: string
  defeitos: string
  servicos_solicitados: string
  status: string
  status_pedido?: string // Adicionar este campo
  created_at?: string
  updated_at?: string
}

// Adicionar interface para o histórico após as interfaces existentes
interface HistoricoItem {
  id: number
  ordem_id: number
  data: string
  status_anterior: string
  status_novo: string
  observacao: string
  usuario: string
}

export default function OrdemServicoPage() {
  // Adicionar estado para o usuário logado no início do componente, após os outros estados
  const [userData, setUserData] = useState<any>(null)
  const [busca, setBusca] = useState("")
  const [filtroStatus, setFiltroStatus] = useState("todas")
  const [ordensServico, setOrdensServico] = useState<OrdemServico[]>([])
  const [loading, setLoading] = useState(true)

  // Estados para o diálogo de nova ordem
  const [novaOrdemDialogOpen, setNovaOrdemDialogOpen] = useState(false)
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [loadingVeiculos, setLoadingVeiculos] = useState(false)
  const [loadingColaboradores, setLoadingColaboradores] = useState(false)
  const [salvandoOrdem, setSalvandoOrdem] = useState(false)

  // Estado para o formulário de nova ordem
  const [novaOrdem, setNovaOrdem] = useState({
    veiculo_id: 0,
    solicitante_id: 0,
    mecanico_id: 0,
    medicao_atual: 0,
    tipo_medicao: "",
    defeitos: "",
    servicos_solicitados: "",
  })

  // Adicione estes estados para os diálogos de visualizar e editar
  const [visualizarDialogOpen, setVisualizarDialogOpen] = useState(false)
  const [editarDialogOpen, setEditarDialogOpen] = useState(false)
  const [ordemSelecionada, setOrdemSelecionada] = useState<OrdemServico | null>(null)
  const [editandoOrdem, setEditandoOrdem] = useState<OrdemServico | null>(null)
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const [enviandoParaCompras, setEnviandoParaCompras] = useState(false)
  // Adicionar estado para o histórico após a linha com "const [enviandoParaCompras, setEnviandoParaCompras] = useState(false)"
  const [historicoDialogOpen, setHistoricoDialogOpen] = useState(false)
  const [historicoPedido, setHistoricoPedido] = useState<HistoricoItem[]>([])
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)
  const [excluindo, setExcluindo] = useState(false)

  // Carregar dados iniciais
  useEffect(() => {
    fetchOrdensServico()
    fetchVeiculos()
    fetchColaboradores()
  }, [])

  // Adicionar useEffect para carregar dados do usuário logado
  useEffect(() => {
    const storedData = localStorage.getItem("userData")
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData)
        setUserData(parsedData)
      } catch (err) {
        console.error("Erro ao processar dados do usuário:", err)
      }
    }
  }, [])

  // Função para buscar ordens de serviço
  const fetchOrdensServico = async () => {
    try {
      setLoading(true)

      // Buscar ordens de serviço do Supabase
      const { data, error } = await supabase
        .from("ordens_servico")
        .select(`
          id, 
          data_abertura, 
          veiculo_id, 
          solicitante_id, 
          mecanico_id, 
          medicao_atual, 
          tipo_medicao, 
          defeitos, 
          servicos_solicitados, 
          status,
          status_pedido, 
          created_at, 
          updated_at,
          veiculos:veiculo_id(marca, modelo, placa),
          solicitantes:solicitante_id(nome),
          mecanicos:mecanico_id(nome)
        `)
        .order("data_abertura", { ascending: false })

      if (error) {
        throw error
      }

      if (data) {
        // Transformar os dados para o formato esperado pelo componente
        const ordensFormatadas = data.map((ordem) => ({
          id: ordem.id,
          data_abertura: ordem.data_abertura,
          veiculo_id: ordem.veiculo_id,
          veiculo: ordem.veiculos
            ? `${ordem.veiculos.marca} ${ordem.veiculos.modelo} - ${ordem.veiculos.placa}`
            : "Veículo não encontrado",
          solicitante_id: ordem.solicitante_id,
          solicitante: ordem.solicitantes?.nome || "Solicitante não encontrado",
          mecanico_id: ordem.mecanico_id,
          mecanico: ordem.mecanicos?.nome || "Mecânico não encontrado",
          medicao_atual: ordem.medicao_atual,
          tipo_medicao: ordem.tipo_medicao,
          defeitos: ordem.defeitos || "",
          servicos_solicitados: ordem.servicos_solicitados || "",
          status: ordem.status,
          status_pedido: ordem.status_pedido || "",
          created_at: ordem.created_at,
          updated_at: ordem.updated_at,
        }))

        setOrdensServico(ordensFormatadas)
      }
    } catch (error) {
      console.error("Erro ao buscar ordens de serviço:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar as ordens de serviço.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Função para buscar veículos
  const fetchVeiculos = async () => {
    try {
      setLoadingVeiculos(true)
      const { data, error } = await supabase
        .from("veiculos")
        .select("id, placa, modelo, marca, tipo_medicao")
        // Remover o filtro de status para mostrar todos os veículos
        // .eq("status", "Ativo") // Apenas veículos ativos
        .order("placa", { ascending: true })

      if (error) throw error

      if (data) {
        setVeiculos(data)
      }
    } catch (error) {
      console.error("Erro ao buscar veículos:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os veículos.",
        variant: "destructive",
      })
    } finally {
      setLoadingVeiculos(false)
    }
  }

  // Função para buscar colaboradores
  const fetchColaboradores = async () => {
    try {
      setLoadingColaboradores(true)
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id, nome, cargo")
        .eq("status", "Ativo") // Apenas colaboradores ativos
        .order("nome", { ascending: true })

      if (error) throw error

      if (data) {
        setColaboradores(data)
      }
    } catch (error) {
      console.error("Erro ao buscar colaboradores:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os colaboradores.",
        variant: "destructive",
      })
    } finally {
      setLoadingColaboradores(false)
    }
  }

  // Adicionar função para buscar histórico após a função fetchColaboradores
  const fetchHistoricoPedido = async (ordemId: number) => {
    try {
      setCarregandoHistorico(true)

      // Buscar histórico do pedido
      const { data, error } = await supabase
        .from("historico_pedidos")
        .select("*")
        .eq("ordem_id", ordemId)
        .order("data", { ascending: false })

      if (error) {
        throw error
      }

      if (data) {
        setHistoricoPedido(data)
      } else {
        setHistoricoPedido([])
      }
    } catch (error) {
      console.error("Erro ao buscar histórico do pedido:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico do pedido.",
        variant: "destructive",
      })
    } finally {
      setCarregandoHistorico(false)
    }
  }

  // Função para lidar com mudanças nos inputs
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNovaOrdem((prev) => ({
      ...prev,
      [name]: name === "medicao_atual" ? Number(value) : value,
    }))
  }

  // Modificar a função handleSalvarOrdem para incluir a atualização da quilometragem
  const handleSalvarOrdem = async () => {
    try {
      setSalvandoOrdem(true)

      // Validar campos obrigatórios
      if (!novaOrdem.veiculo_id || !novaOrdem.solicitante_id || !novaOrdem.mecanico_id) {
        toast({
          title: "Erro",
          description: "Por favor, preencha todos os campos obrigatórios.",
          variant: "destructive",
        })
        return
      }

      // Buscar informações do veículo e colaboradores selecionados
      const veiculoSelecionado = veiculos.find((v) => v.id === novaOrdem.veiculo_id)
      const solicitanteSelecionado = colaboradores.find((c) => c.id === novaOrdem.solicitante_id)
      const mecanicoSelecionado = colaboradores.find((c) => c.id === novaOrdem.mecanico_id)

      if (!veiculoSelecionado || !solicitanteSelecionado || !mecanicoSelecionado) {
        toast({
          title: "Erro",
          description: "Informações de veículo ou colaboradores inválidas.",
          variant: "destructive",
        })
        return
      }

      // Preparar dados para inserção
      const novaOrdemServico = {
        veiculo_id: novaOrdem.veiculo_id,
        solicitante_id: novaOrdem.solicitante_id,
        mecanico_id: novaOrdem.mecanico_id,
        medicao_atual: novaOrdem.medicao_atual,
        tipo_medicao: novaOrdem.tipo_medicao,
        defeitos: novaOrdem.defeitos,
        servicos_solicitados: novaOrdem.servicos_solicitados,
        status: "Aberta",
      }

      // Inserir a nova ordem no Supabase
      const { data, error } = await supabase
        .from("ordens_servico")
        .insert(novaOrdemServico)
        .select(`
        id, 
        data_abertura, 
        veiculo_id, 
        solicitante_id, 
        mecanico_id, 
        medicao_atual, 
        tipo_medicao, 
        defeitos, 
        servicos_solicitados, 
        status
      `)
        .single()

      if (error) {
        throw error
      }

      // Atualizar a quilometragem do veículo na tabela de atualizações
      if (data) {
        // Buscar a última atualização de quilometragem para o veículo
        const { data: ultimaAtualizacao, error: erroAtualizacao } = await supabase
          .from("atualizacoes_km")
          .select("medicao_atual")
          .eq("veiculo_id", novaOrdem.veiculo_id)
          .order("data_atualizacao", { ascending: false })
          .limit(1)
          .single()

        // Se a medição atual for maior que a última registrada, atualizar
        const medicaoAnterior = ultimaAtualizacao ? ultimaAtualizacao.medicao_atual : 0

        if (novaOrdem.medicao_atual > medicaoAnterior) {
          // Inserir nova atualização de quilometragem
          const { error: erroInsercao } = await supabase.from("atualizacoes_km").insert({
            veiculo_id: novaOrdem.veiculo_id,
            medicao_anterior: medicaoAnterior,
            medicao_atual: novaOrdem.medicao_atual,
            data_atualizacao: new Date().toISOString(),
            usuario: userData?.nome || "Sistema (Ordem de Serviço)",
            observacao: `Atualização automática via Ordem de Serviço #${data.id}`,
          })

          if (erroInsercao) {
            console.error("Erro ao atualizar quilometragem:", erroInsercao)
            // Não interromper o fluxo se falhar a atualização de quilometragem
          }
        }

        // Criar objeto formatado para adicionar ao estado local
        const ordemFormatada: OrdemServico = {
          id: data.id,
          data_abertura: data.data_abertura,
          veiculo_id: data.veiculo_id,
          veiculo: `${veiculoSelecionado.marca} ${veiculoSelecionado.modelo} - ${veiculoSelecionado.placa}`,
          solicitante_id: data.solicitante_id,
          solicitante: solicitanteSelecionado.nome,
          mecanico_id: data.mecanico_id,
          mecanico: mecanicoSelecionado.nome,
          medicao_atual: data.medicao_atual,
          tipo_medicao: data.tipo_medicao,
          defeitos: data.defeitos || "",
          servicos_solicitados: data.servicos_solicitados || "",
          status: data.status,
          status_pedido: "",
        }

        // Adicionar a nova ordem ao estado local
        setOrdensServico((prevOrdens) => [ordemFormatada, ...prevOrdens])

        toast({
          title: "Sucesso",
          description: "Ordem de serviço registrada com sucesso!",
        })

        // Resetar formulário e fechar diálogo
        setNovaOrdem({
          veiculo_id: 0,
          solicitante_id: 0,
          mecanico_id: 0,
          medicao_atual: 0,
          tipo_medicao: "",
          defeitos: "",
          servicos_solicitados: "",
        })
        setNovaOrdemDialogOpen(false)
      }
    } catch (error) {
      console.error("Erro ao salvar ordem de serviço:", error)
      toast({
        title: "Erro",
        description: "Não foi possível registrar a ordem de serviço.",
        variant: "destructive",
      })
    } finally {
      setSalvandoOrdem(false)
    }
  }

  // Adicione esta função para enviar para almoxarifado
  const handleEnviarParaAlmoxarifado = async (id: number) => {
    try {
      setEnviandoParaCompras(true)

      const { error } = await supabase
        .from("ordens_servico")
        .update({
          status: "Pendente",
          status_pedido: "Em aprovação", // Alterado de "Em análise" para "Em aprovação"
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)

      if (error) {
        throw error
      }

      // Atualizar o estado local
      setOrdensServico((prevOrdens) =>
        prevOrdens.map((ordem) =>
          ordem.id === id ? { ...ordem, status: "Pendente", status_pedido: "Em aprovação" } : ordem,
        ),
      )

      toast({
        title: "Sucesso",
        description: "Ordem de serviço enviada para almoxarifado com sucesso!",
      })
    } catch (error) {
      console.error("Erro ao enviar ordem para almoxarifado:", error)
      toast({
        title: "Erro",
        description: "Não foi possível enviar a ordem para almoxarifado.",
        variant: "destructive",
      })
    } finally {
      setEnviandoParaCompras(false)
    }
  }

  // Adicione esta função para enviar para compras
  // const handleEnviarParaCompras = async (id: number) => {
  //   try {
  //     setEnviandoParaCompras(true)

  //     const { error } = await supabase
  //       .from("ordens_servico")
  //       .update({
  //         status: "Pendente",
  //         status_pedido: "Em aprovação",
  //         updated_at: new Date().toISOString(),
  //       })
  //       .eq("id", id)

  //     if (error) {
  //       throw error
  //     }

  //     // Atualizar o estado local
  //     setOrdensServico((prevOrdens) =>
  //       prevOrdens.map((ordem) =>
  //         ordem.id === id ? { ...ordem, status: "Pendente", status_pedido: "Em aprovação" } : ordem,
  //       ),
  //     )

  //     toast({
  //       title: "Sucesso",
  //       description: "Ordem de serviço enviada para compras com sucesso!",
  //     })
  //   } catch (error) {
  //     console.error("Erro ao enviar ordem para compras:", error)
  //     toast({
  //       title: "Erro",
  //       description: "Não foi possível enviar a ordem para compras.",
  //       variant: "destructive",
  //     })
  //   } finally {
  //     setEnviandoParaCompras(false)
  //   }
  // }

  // Adicione esta função para editar uma ordem
  const handleEditarOrdem = async () => {
    if (!editandoOrdem) return

    try {
      setSalvandoEdicao(true)

      const { error } = await supabase
        .from("ordens_servico")
        .update({
          medicao_atual: editandoOrdem.medicao_atual,
          defeitos: editandoOrdem.defeitos,
          servicos_solicitados: editandoOrdem.servicos_solicitados,
          status: editandoOrdem.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editandoOrdem.id)

      if (error) {
        throw error
      }

      // Atualizar o estado local
      setOrdensServico((prevOrdens) =>
        prevOrdens.map((ordem) => (ordem.id === editandoOrdem.id ? { ...ordem, ...editandoOrdem } : ordem)),
      )

      toast({
        title: "Sucesso",
        description: "Ordem de serviço atualizada com sucesso!",
      })

      setEditarDialogOpen(false)
    } catch (error) {
      console.error("Erro ao editar ordem de serviço:", error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a ordem de serviço.",
        variant: "destructive",
      })
    } finally {
      setSalvandoEdicao(false)
    }
  }

  // Função para excluir uma ordem de serviço
  const handleExcluirOrdem = async (id: number) => {
    try {
      setLoading(true)

      // Primeiro, verificar se existe uma atualização de quilometragem associada a esta ordem
      const { data: atualizacaoKm, error: errorBusca } = await supabase
        .from("atualizacoes_km")
        .select("id")
        .eq("observacao", `Ordem de Serviço #${id}`)
        .limit(1)

      if (errorBusca) {
        console.error("Erro ao buscar atualização de quilometragem:", errorBusca)
      }

      // Se encontrou uma atualização de quilometragem, excluí-la primeiro
      if (atualizacaoKm && atualizacaoKm.length > 0) {
        const { error: errorExclusaoKm } = await supabase.from("atualizacoes_km").delete().eq("id", atualizacaoKm[0].id)

        if (errorExclusaoKm) {
          console.error("Erro ao excluir atualização de quilometragem:", errorExclusaoKm)
          toast({
            title: "Erro",
            description: "Erro ao excluir atualização de quilometragem associada.",
            variant: "destructive",
          })
        }
      }

      // Agora, excluir a ordem de serviço
      const { error } = await supabase.from("ordens_servico").delete().eq("id", id)

      if (error) {
        console.error("Erro ao excluir ordem:", error)
        toast({
          title: "Erro",
          description: "Não foi possível excluir a ordem de serviço.",
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Sucesso",
        description: "Ordem de serviço excluída com sucesso!",
      })

      // Atualizar a lista de ordens
      fetchOrdensServico()
    } catch (error) {
      console.error("Erro ao excluir ordem:", error)
      toast({
        title: "Erro",
        description: "Ocorreu um erro ao excluir a ordem de serviço.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Adicionar a funcionalidade para excluir a atualização de quilometragem quando uma ordem de serviço é excluída
  const handleExcluirOrdemServico = async (id: number) => {
    if (!id) return

    try {
      setExcluindo(true)

      // 1. Buscar a ordem de serviço para obter informações antes de excluir
      const { data: ordemData, error: ordemError } = await supabase
        .from("ordens_servico")
        .select("*")
        .eq("id", id)
        .single()

      if (ordemError) throw ordemError

      // 2. Excluir a ordem de serviço
      const { error } = await supabase.from("ordens_servico").delete().eq("id", id)

      if (error) throw error

      // 3. Se a ordem tinha atualização de quilometragem, excluir o registro correspondente
      if (ordemData && ordemData.medicao_atual) {
        // Buscar atualizações de quilometragem relacionadas a esta ordem de serviço
        const { data: kmData, error: kmQueryError } = await supabase
          .from("atualizacoes_km")
          .select("id")
          .eq("veiculo_id", ordemData.veiculo_id)
          .eq("observacao", `Quilometragem atualizada automaticamente ao abrir Ordem de Serviço #${id}`)
          .limit(1)

        if (!kmQueryError && kmData && kmData.length > 0) {
          // Excluir a atualização de quilometragem
          const { error: kmDeleteError } = await supabase.from("atualizacoes_km").delete().eq("id", kmData[0].id)

          if (kmDeleteError) {
            console.error("Erro ao excluir atualização de quilometragem:", kmDeleteError)
          }
        }
      }

      // 4. Atualizar a lista de ordens
      fetchOrdensServico()

      toast({
        title: "Ordem de serviço excluída",
        description: "A ordem de serviço foi excluída com sucesso.",
      })
    } catch (error) {
      console.error("Erro ao excluir ordem de serviço:", error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir a ordem de serviço.",
        variant: "destructive",
      })
    } finally {
      setExcluindo(false)
    }
  }

  // Formatar data
  const formatarData = (dataString: string) => {
    try {
      const data = new Date(dataString)
      return format(data, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    } catch (error) {
      return dataString
    }
  }

  // Adicionar função para obter a cor do badge com base no status após a função formatarData
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Em aprovação":
        return "bg-blue-50 text-blue-700"
      case "Recusado":
        return "bg-red-50 text-red-700"
      case "Aguardando OS":
        return "bg-purple-50 text-purple-700"
      case "Aguardando Fornecedor":
        return "bg-yellow-50 text-yellow-700"
      case "Fila de Serviço":
        return "bg-indigo-50 text-indigo-700"
      case "Serviço Externo":
        return "bg-orange-50 text-orange-700"
      case "Em Serviço":
        return "bg-cyan-50 text-cyan-700"
      case "Finalizado":
        return "bg-green-50 text-green-700"
      case "Aberta":
        return "bg-blue-50 text-blue-700"
      case "Em andamento":
        return "bg-purple-50 text-purple-700"
      case "Pendente":
        return "bg-yellow-50 text-yellow-700"
      case "Concluída":
        return "bg-green-50 text-green-700"
      default:
        return "bg-gray-50 text-gray-700"
    }
  }

  // Filtrar ordens de serviço
  const ordensFiltradas = ordensServico.filter((ordem) => {
    // Primeiro aplicar o filtro de status
    if (filtroStatus === "abertas" && ordem.status === "Concluída") return false
    if (filtroStatus === "finalizadas" && ordem.status !== "Concluída") return false

    // Depois aplicar o filtro de busca
    return (
      (ordem.veiculo?.toLowerCase() || "").includes(busca.toLowerCase()) ||
      (ordem.solicitante?.toLowerCase() || "").includes(busca.toLowerCase()) ||
      (ordem.mecanico?.toLowerCase() || "").includes(busca.toLowerCase())
    )
  })

  return (
    <LayoutAutenticado>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Ordem de Serviço</h2>
          <p className="text-muted-foreground">Gerencie as ordens de serviço para manutenção de veículos.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full max-w-xl">
            <div className="relative w-full max-w-2xl">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar Ordens"
                className="pl-8"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <Tabs
              defaultValue="todas"
              value={filtroStatus}
              onValueChange={setFiltroStatus}
              className="w-full sm:w-auto"
            >
              <TabsList>
                <TabsTrigger value="todas">Todas</TabsTrigger>
                <TabsTrigger value="abertas">Ordens Abertas</TabsTrigger>
                <TabsTrigger value="finalizadas">Ordens Finalizadas</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <Button onClick={() => setNovaOrdemDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Ordem de Serviço
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Ordens de Serviço</CardTitle>
            <CardDescription>Visualize e gerencie as ordens de serviço para manutenção de veículos.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Solicitante</TableHead>
                  <TableHead>Mecânico</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : ordensFiltradas.length > 0 ? (
                  ordensFiltradas.map((ordem) => (
                    <TableRow key={ordem.id}>
                      <TableCell>{formatarData(ordem.data_abertura)}</TableCell>
                      <TableCell className="font-medium">{ordem.veiculo}</TableCell>
                      <TableCell>{ordem.solicitante}</TableCell>
                      <TableCell>{ordem.mecanico}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getStatusBadgeClass(ordem.status_pedido || ordem.status)}>
                          {ordem.status_pedido || ordem.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              className="flex items-center cursor-pointer"
                              onClick={() => {
                                setOrdemSelecionada(ordem)
                                setVisualizarDialogOpen(true)
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              <span>Visualizar</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="flex items-center cursor-pointer"
                              onClick={() => {
                                setEditandoOrdem({ ...ordem })
                                setEditarDialogOpen(true)
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Editar</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="flex items-center cursor-pointer"
                              onClick={() => handleEnviarParaAlmoxarifado(ordem.id)}
                              disabled={ordem.status === "Pendente" || ordem.status === "Concluída"}
                            >
                              <ShoppingCart className="mr-2 h-4 w-4" />
                              <span>Enviar para Almoxarifado</span>
                            </DropdownMenuItem>
                            {/* Adicionar opção de histórico no dropdown menu após a opção "Enviar para Compras" */}
                            <DropdownMenuItem
                              className="flex items-center cursor-pointer"
                              onClick={() => {
                                setOrdemSelecionada(ordem)
                                fetchHistoricoPedido(ordem.id)
                                setHistoricoDialogOpen(true)
                              }}
                            >
                              <History className="mr-2 h-4 w-4" />
                              <span>Histórico</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="flex items-center text-red-600 cursor-pointer"
                              onClick={() => handleExcluirOrdemServico(ordem.id)}
                              disabled={excluindo}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Excluir</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Nenhuma ordem de serviço encontrada.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Diálogo para Nova Ordem de Serviço */}
      <Dialog open={novaOrdemDialogOpen} onOpenChange={setNovaOrdemDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nova Ordem de Serviço</DialogTitle>
            <DialogDescription>Preencha os dados para registrar uma nova ordem de serviço.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* Seleção de Veículo */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="veiculo" className="text-right">
                Veículo*
              </Label>
              <div className="col-span-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                      disabled={loadingVeiculos}
                    >
                      {loadingVeiculos ? (
                        <span className="flex items-center">
                          <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                          Carregando veículos...
                        </span>
                      ) : novaOrdem.veiculo_id ? (
                        veiculos.find((v) => v.id === novaOrdem.veiculo_id) ? (
                          `${veiculos.find((v) => v.id === novaOrdem.veiculo_id)?.marca} ${
                            veiculos.find((v) => v.id === novaOrdem.veiculo_id)?.modelo
                          } - ${veiculos.find((v) => v.id === novaOrdem.veiculo_id)?.placa}`
                        ) : (
                          "Selecione um veículo"
                        )
                      ) : (
                        "Selecione um veículo"
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar veículo..." />
                      <CommandEmpty>Nenhum veículo encontrado.</CommandEmpty>
                      <CommandGroup>
                        <CommandList className="max-h-[200px]">
                          {veiculos.map((veiculo) => (
                            <CommandItem
                              key={veiculo.id}
                              // Modificar o value para incluir a placa, garantindo que cada veículo tenha um valor único
                              value={`${veiculo.marca} ${veiculo.modelo} ${veiculo.placa}`}
                              onSelect={() => {
                                setNovaOrdem((prev) => ({
                                  ...prev,
                                  veiculo_id: veiculo.id,
                                  tipo_medicao: veiculo.tipo_medicao || "Quilometragem",
                                }))
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  novaOrdem.veiculo_id === veiculo.id ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <div className="flex flex-col">
                                <span>
                                  {veiculo.marca} {veiculo.modelo}
                                </span>
                                <span className="text-xs text-muted-foreground">Placa: {veiculo.placa}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandList>
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Campo de Medição Dinâmico */}
            {novaOrdem.veiculo_id > 0 && (
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="medicao_atual" className="text-right">
                  {novaOrdem.tipo_medicao === "Quilometragem"
                    ? "Quilometragem Atual (KM)"
                    : novaOrdem.tipo_medicao === "Horimetro"
                      ? "Horímetro Atual (Horas)"
                      : novaOrdem.tipo_medicao === "Meses"
                        ? "Meses em Uso"
                        : "Medição Atual"}
                </Label>
                <Input
                  id="medicao_atual"
                  name="medicao_atual"
                  type="number"
                  value={novaOrdem.medicao_atual}
                  onChange={handleInputChange}
                  className="col-span-3"
                  placeholder={
                    novaOrdem.tipo_medicao === "Quilometragem"
                      ? "Ex: 45000"
                      : novaOrdem.tipo_medicao === "Horimetro"
                        ? "Ex: 350"
                        : "Ex: 6"
                  }
                />
              </div>
            )}

            {/* Seleção de Solicitante */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="solicitante" className="text-right">
                Solicitante*
              </Label>
              <div className="col-span-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                      disabled={loadingColaboradores}
                    >
                      {loadingColaboradores ? (
                        <span className="flex items-center">
                          <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                          Carregando colaboradores...
                        </span>
                      ) : novaOrdem.solicitante_id ? (
                        colaboradores.find((c) => c.id === novaOrdem.solicitante_id)?.nome || "Selecione um solicitante"
                      ) : (
                        "Selecione um solicitante"
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar colaborador..." />
                      <CommandEmpty>Nenhum colaborador encontrado.</CommandEmpty>
                      <CommandGroup>
                        <CommandList className="max-h-[200px]">
                          {colaboradores.map((colaborador) => (
                            <CommandItem
                              key={colaborador.id}
                              value={`${colaborador.nome} ${colaborador.cargo}`}
                              onSelect={() => {
                                setNovaOrdem((prev) => ({
                                  ...prev,
                                  solicitante_id: colaborador.id,
                                }))
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  novaOrdem.solicitante_id === colaborador.id ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{colaborador.nome}</span>
                                <span className="text-xs text-muted-foreground">{colaborador.cargo}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandList>
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Seleção de Mecânico */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="mecanico" className="text-right">
                Mecânico*
              </Label>
              <div className="col-span-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                      disabled={loadingColaboradores}
                    >
                      {loadingColaboradores ? (
                        <span className="flex items-center">
                          <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                          Carregando colaboradores...
                        </span>
                      ) : novaOrdem.mecanico_id ? (
                        colaboradores.find((c) => c.id === novaOrdem.mecanico_id)?.nome || "Selecione um mecânico"
                      ) : (
                        "Selecione um mecânico"
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar mecânico..." />
                      <CommandEmpty>Nenhum mecânico encontrado.</CommandEmpty>
                      <CommandGroup>
                        <CommandList className="max-h-[200px]">
                          {colaboradores.map((colaborador) => (
                            <CommandItem
                              key={colaborador.id}
                              value={`${colaborador.nome} ${colaborador.cargo}`}
                              onSelect={() => {
                                setNovaOrdem((prev) => ({
                                  ...prev,
                                  mecanico_id: colaborador.id,
                                }))
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  novaOrdem.mecanico_id === colaborador.id ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{colaborador.nome}</span>
                                <span className="text-xs text-muted-foreground">{colaborador.cargo}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandList>
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Defeitos */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="defeitos" className="text-right pt-2">
                Defeitos Comunicados
              </Label>
              <Textarea
                id="defeitos"
                name="defeitos"
                value={novaOrdem.defeitos}
                onChange={handleInputChange}
                placeholder="Descreva os defeitos comunicados pelo condutor"
                className="col-span-3 min-h-[100px]"
              />
            </div>

            {/* Serviços Solicitados */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="servicos_solicitados" className="text-right pt-2">
                Peças/Serviços Solicitados
              </Label>
              <Textarea
                id="servicos_solicitados"
                name="servicos_solicitados"
                value={novaOrdem.servicos_solicitados}
                onChange={handleInputChange}
                placeholder="Liste as peças ou serviços solicitados"
                className="col-span-3 min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovaOrdemDialogOpen(false)} disabled={salvandoOrdem}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarOrdem} disabled={salvandoOrdem}>
              {salvandoOrdem ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                  Salvando...
                </>
              ) : (
                "Salvar Ordem de Serviço"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para Visualizar Ordem de Serviço */}
      <Dialog open={visualizarDialogOpen} onOpenChange={setVisualizarDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Ordem de Serviço</DialogTitle>
            <DialogDescription>Informações completas da ordem de serviço.</DialogDescription>
          </DialogHeader>
          {ordemSelecionada && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Data de Abertura</h3>
                  <p className="text-base">{formatarData(ordemSelecionada.data_abertura)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                  <Badge
                    variant="outline"
                    className={getStatusBadgeClass(ordemSelecionada.status_pedido || ordemSelecionada.status)}
                  >
                    {ordemSelecionada.status_pedido || ordemSelecionada.status}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Veículo</h3>
                  <p className="text-base">{ordemSelecionada.veiculo}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {ordemSelecionada.tipo_medicao === "Quilometragem"
                      ? "Quilometragem"
                      : ordemSelecionada.tipo_medicao === "Horimetro"
                        ? "Horímetro"
                        : "Meses em Uso"}
                  </h3>
                  <p className="text-base">
                    {ordemSelecionada.medicao_atual}
                    {ordemSelecionada.tipo_medicao === "Quilometragem"
                      ? " KM"
                      : ordemSelecionada.tipo_medicao === "Horimetro"
                        ? " horas"
                        : " meses"}
                  </p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Solicitante</h3>
                  <p className="text-base">{ordemSelecionada.solicitante}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Mecânico</h3>
                  <p className="text-base">{ordemSelecionada.mecanico}</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Defeitos Comunicados</h3>
                <div className="p-3 bg-gray-50 rounded-md min-h-[80px]">
                  {ordemSelecionada.defeitos || "Nenhum defeito registrado."}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Peças/Serviços Solicitados</h3>
                <div className="p-3 bg-gray-50 rounded-md min-h-[80px]">
                  {ordemSelecionada.servicos_solicitados || "Nenhum serviço ou peça solicitado."}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setVisualizarDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para Editar Ordem de Serviço */}
      <Dialog open={editarDialogOpen} onOpenChange={setEditarDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Ordem de Serviço</DialogTitle>
            <DialogDescription>Atualize as informações da ordem de serviço.</DialogDescription>
          </DialogHeader>
          {editandoOrdem && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Data de Abertura</h3>
                  <p className="text-base">{formatarData(editandoOrdem.data_abertura)}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Veículo</h3>
                  <p className="text-base">{editandoOrdem.veiculo}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Solicitante</h3>
                  <p className="text-base">{editandoOrdem.solicitante}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Mecânico</h3>
                  <p className="text-base">{editandoOrdem.mecanico}</p>
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="medicao_atual" className="text-right">
                  {editandoOrdem.tipo_medicao === "Quilometragem"
                    ? "Quilometragem Atual (KM)"
                    : editandoOrdem.tipo_medicao === "Horimetro"
                      ? "Horímetro Atual (Horas)"
                      : "Meses em Uso"}
                </Label>
                <Input
                  id="medicao_atual"
                  type="number"
                  value={editandoOrdem.medicao_atual}
                  onChange={(e) => setEditandoOrdem({ ...editandoOrdem, medicao_atual: Number(e.target.value) })}
                  className="col-span-3"
                />
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status" className="text-right">
                  Status
                </Label>
                <Select
                  value={editandoOrdem.status}
                  onValueChange={(value) => setEditandoOrdem({ ...editandoOrdem, status: value })}
                >
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aberta">Aberta</SelectItem>
                    <SelectItem value="Em andamento">Em andamento</SelectItem>
                    <SelectItem value="Pendente">Pendente</SelectItem>
                    <SelectItem value="Concluída">Concluída</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="defeitos" className="text-right pt-2">
                  Defeitos Comunicados
                </Label>
                <Textarea
                  id="defeitos"
                  value={editandoOrdem.defeitos}
                  onChange={(e) => setEditandoOrdem({ ...editandoOrdem, defeitos: e.target.value })}
                  placeholder="Descreva os defeitos comunicados pelo condutor"
                  className="col-span-3 min-h-[100px]"
                />
              </div>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="servicos_solicitados" className="text-right pt-2">
                  Peças/Serviços Solicitados
                </Label>
                <Textarea
                  id="servicos_solicitados"
                  value={editandoOrdem.servicos_solicitados}
                  onChange={(e) => setEditandoOrdem({ ...editandoOrdem, servicos_solicitados: e.target.value })}
                  placeholder="Liste as peças ou serviços solicitados"
                  className="col-span-3 min-h-[100px]"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditarDialogOpen(false)} disabled={salvandoEdicao}>
              Cancelar
            </Button>
            <Button onClick={handleEditarOrdem} disabled={salvandoEdicao}>
              {salvandoEdicao ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                  Salvando...
                </>
              ) : (
                "Salvar Alterações"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para Visualizar Histórico */}
      <Dialog open={historicoDialogOpen} onOpenChange={setHistoricoDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico da Ordem de Serviço</DialogTitle>
            <DialogDescription>Histórico completo de alterações e observações da ordem de serviço.</DialogDescription>
          </DialogHeader>
          {ordemSelecionada && (
            <div className="py-4">
              <div className="mb-4">
                <h3 className="text-sm font-medium">Ordem para o veículo: {ordemSelecionada.veiculo}</h3>
                <p className="text-sm text-muted-foreground">
                  Aberta em: {formatarData(ordemSelecionada.data_abertura)}
                </p>
              </div>

              {carregandoHistorico ? (
                <div className="flex justify-center py-8">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                </div>
              ) : historicoPedido.length > 0 ? (
                <div className="space-y-4">
                  {historicoPedido.map((item, index) => (
                    <div key={index} className="border rounded-md p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="text-sm font-medium">Alteração de Status: </span>
                          <Badge variant="outline" className={getStatusBadgeClass(item.status_anterior)}>
                            {item.status_anterior}
                          </Badge>
                          <span className="mx-2">→</span>
                          <Badge variant="outline" className={getStatusBadgeClass(item.status_novo)}>
                            {item.status_novo}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{formatarData(item.data)}</span>
                      </div>
                      <div>
                        <span className="text-sm font-medium">Usuário: </span>
                        <span className="text-sm">{item.usuario}</span>
                      </div>
                      <div className="mt-2">
                        <span className="text-sm font-medium">Observação: </span>
                        <div className="mt-1 p-2 bg-gray-50 rounded-md text-sm">
                          {item.observacao || "Nenhuma observação registrada."}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum histórico encontrado para esta ordem de serviço.
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setHistoricoDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </LayoutAutenticado>
  )
}

