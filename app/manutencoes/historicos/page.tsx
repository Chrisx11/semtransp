"use client"

import type React from "react"

import { useState, useEffect } from "react"
import LayoutAutenticado from "@/components/layout-autenticado"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Search,
  Eye,
  Clock,
  FileText,
  Droplet,
  PenToolIcon as Tool,
  ArrowUpDown,
  MoreHorizontal,
  WrenchIcon,
  PlusCircle,
  Trash2,
  Printer,
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { format, addDays, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"

interface Veiculo {
  id: number
  placa: string
  modelo: string
  marca: string
  tipo: string
  secretaria: string
  status: string
  km_atual?: number
}

interface HistoricoItem {
  id: number
  tipo: "quilometragem" | "troca_oleo" | "ordem_servico" | "produto" | "manutencao"
  data: string
  descricao: string
  detalhes: any
  icone: React.ReactNode
  cor: string
}

export default function HistoricosPage() {
  const [busca, setBusca] = useState("")
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [loading, setLoading] = useState(true)
  const [historicoDialogOpen, setHistoricoDialogOpen] = useState(false)
  const [registrarManutencaoDialogOpen, setRegistrarManutencaoDialogOpen] = useState(false)
  const [veiculoSelecionado, setVeiculoSelecionado] = useState<Veiculo | null>(null)
  const [historicoItems, setHistoricoItems] = useState<HistoricoItem[]>([])
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState<string>("todos")
  const [ordenacao, setOrdenacao] = useState<"asc" | "desc">("desc")
  const [salvandoManutencao, setSalvandoManutencao] = useState(false)
  const [relatorioDialogOpen, setRelatorioDialogOpen] = useState(false)
  const [cronologiaDialogOpen, setCronologiaDialogOpen] = useState(false)
  const [pesquisaCronologia, setPesquisaCronologia] = useState("")
  const [historicoFiltradoCronologia, setHistoricoFiltradoCronologia] = useState<HistoricoItem[]>([])

  // Estado para o formulário de manutenção
  const [formManutencao, setFormManutencao] = useState({
    tipo_manutencao: "",
    descricao: "",
    data_manutencao: format(new Date(), "yyyy-MM-dd"),
    medicao_atual: "",
    atualizar_km: false,
  })

  // Adicionar estado para o diálogo de confirmação de exclusão
  const [excluirManutencaoDialogOpen, setExcluirManutencaoDialogOpen] = useState(false)
  const [manutencaoParaExcluir, setManutencaoParaExcluir] = useState<number | null>(null)
  const [excluindoManutencao, setExcluindoManutencao] = useState(false)
  const [excluirManutencoesDialogOpen, setExcluirManutencoesDialogOpen] = useState(false)
  const [manutencoesVeiculo, setManutencoesVeiculo] = useState<any[]>([])
  const [carregandoManutencoes, setCarregandoManutencoes] = useState(false)

  // Carregar veículos ao iniciar
  useEffect(() => {
    fetchVeiculos()
  }, [])

  // Função para buscar veículos
  const fetchVeiculos = async () => {
    try {
      setLoading(true)

      // Buscar veículos do Supabase - removendo medicao_atual da consulta
      const { data, error } = await supabase
        .from("veiculos")
        .select("id, placa, modelo, marca, tipo, secretaria, status")
        .order("placa", { ascending: true })

      if (error) {
        throw error
      }

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
      setLoading(false)
    }
  }

  // Função para buscar histórico completo de um veículo
  const fetchHistoricoVeiculo = async (veiculoId: number) => {
    try {
      setCarregandoHistorico(true)
      setHistoricoItems([])

      // Array para armazenar todos os itens de histórico
      const todosItens: HistoricoItem[] = []

      // 1. Buscar atualizações de quilometragem
      const { data: atualizacoesKm, error: errorKm } = await supabase
        .from("atualizacoes_km")
        .select("*")
        .eq("veiculo_id", veiculoId)
        .order("data_atualizacao", { ascending: false })

      if (!errorKm && atualizacoesKm) {
        atualizacoesKm.forEach((atualizacao) => {
          todosItens.push({
            id: atualizacao.id,
            tipo: "quilometragem",
            data: atualizacao.data_atualizacao,
            descricao: `Atualização de quilometragem: ${atualizacao.medicao_anterior} → ${atualizacao.medicao_atual} km`,
            detalhes: atualizacao,
            icone: <Clock className="h-4 w-4" />,
            cor: "bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200",
          })
        })
      }

      // 2. Buscar trocas de óleo
      const { data: trocasOleo, error: errorOleo } = await supabase
        .from("trocas_oleo")
        .select("*")
        .eq("veiculo_id", veiculoId)
        .order("data_troca", { ascending: false })

      if (!errorOleo && trocasOleo) {
        trocasOleo.forEach((troca) => {
          todosItens.push({
            id: troca.id,
            tipo: "troca_oleo",
            data: troca.data_troca,
            descricao: `Troca de óleo: ${troca.tipo_oleo} (${troca.quantidade_oleo} litros)`,
            detalhes: troca,
            icone: <Droplet className="h-4 w-4" />,
            cor: "bg-amber-50 text-amber-700 dark:bg-amber-900 dark:text-amber-200",
          })
        })
      }

      // 3. Buscar ordens de serviço
      const { data: ordensServico, error: errorOS } = await supabase
        .from("ordens_servico")
        .select(`
          id, 
          data_abertura, 
          veiculo_id, 
          medicao_atual, 
          defeitos, 
          servicos_solicitados, 
          status,
          status_pedido, 
          created_at, 
          updated_at,
          solicitantes:solicitante_id(nome),
          mecanicos:mecanico_id(nome)
        `)
        .eq("veiculo_id", veiculoId)
        .order("data_abertura", { ascending: false })

      if (!errorOS && ordensServico) {
        ordensServico.forEach((ordem) => {
          const status = ordem.status_pedido || ordem.status
          todosItens.push({
            id: ordem.id,
            tipo: "ordem_servico",
            data: ordem.data_abertura,
            descricao: `Ordem de Serviço #${ordem.id} - Status: ${status}`,
            detalhes: ordem,
            icone: <Tool className="h-4 w-4" />,
            cor: "bg-purple-50 text-purple-700 dark:bg-purple-900 dark:text-purple-200",
          })
        })
      }

      // 4. Buscar produtos utilizados (saídas de estoque para este veículo)
      const { data: saidasEstoque, error: errorSaidas } = await supabase
        .from("saidas")
        .select(`
          id, 
          produto_id, 
          quantidade, 
          data_saida, 
          destino, 
          observacao,
          produtos:produto_id(nome, categoria)
        `)
        .ilike("destino", `%${veiculoSelecionado?.placa || ""}%`)
        .order("data_saida", { ascending: false })

      if (!errorSaidas && saidasEstoque) {
        saidasEstoque.forEach((saida) => {
          todosItens.push({
            id: saida.id,
            tipo: "produto",
            data: saida.data_saida,
            descricao: `Produto utilizado: ${saida.produtos?.nome || "Produto"} (${saida.quantidade} un.)`,
            detalhes: saida,
            icone: <FileText className="h-4 w-4" />,
            cor: "bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-200",
          })
        })
      }

      // 5. Buscar manutenções registradas manualmente
      const { data: manutencoes, error: errorManutencoes } = await supabase
        .from("manutencoes")
        .select("*")
        .eq("veiculo_id", veiculoId)
        .order("data_manutencao", { ascending: false })

      if (!errorManutencoes && manutencoes) {
        manutencoes.forEach((manutencao) => {
          todosItens.push({
            id: manutencao.id,
            tipo: "manutencao",
            data: manutencao.data_manutencao,
            descricao: `Manutenção: ${manutencao.tipo_manutencao}`,
            detalhes: manutencao,
            icone: <WrenchIcon className="h-4 w-4" />,
            cor: "bg-rose-50 text-rose-700 dark:bg-rose-900 dark:text-rose-200",
          })
        })
      }

      // Ordenar todos os itens por data
      todosItens.sort((a, b) => {
        const dateA = new Date(a.data).getTime()
        const dateB = new Date(b.data).getTime()
        return ordenacao === "desc" ? dateB - dateA : dateA - dateB
      })

      setHistoricoItems(todosItens)
    } catch (error) {
      console.error("Erro ao buscar histórico do veículo:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico completo do veículo.",
        variant: "destructive",
      })
    } finally {
      setCarregandoHistorico(false)
    }
  }

  // Função para buscar manutenções de um veículo
  const fetchManutencoesVeiculo = async (veiculoId: number) => {
    try {
      setCarregandoManutencoes(true)
      setManutencoesVeiculo([])

      const { data, error } = await supabase
        .from("manutencoes")
        .select("*")
        .eq("veiculo_id", veiculoId)
        .order("data_manutencao", { ascending: false })

      if (error) throw error

      if (data) {
        setManutencoesVeiculo(data)
      }
    } catch (error) {
      console.error("Erro ao buscar manutenções:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar as manutenções do veículo.",
        variant: "destructive",
      })
    } finally {
      setCarregandoManutencoes(false)
    }
  }

  // Função para abrir o diálogo de histórico
  const handleAbrirHistorico = (veiculo: Veiculo) => {
    setVeiculoSelecionado(veiculo)
    setHistoricoDialogOpen(true)
    fetchHistoricoVeiculo(veiculo.id)
  }

  // Função para abrir o diálogo de relatório completo
  const handleAbrirRelatorio = (veiculo: Veiculo) => {
    setVeiculoSelecionado(veiculo)
    setRelatorioDialogOpen(true)
    fetchHistoricoVeiculo(veiculo.id)
  }

  // Função para abrir o diálogo de cronologia
  const handleAbrirCronologia = (veiculo: Veiculo) => {
    setVeiculoSelecionado(veiculo)
    setCronologiaDialogOpen(true)
    fetchHistoricoVeiculo(veiculo.id)
  }

  // Função para abrir o diálogo de registrar manutenção
  const handleAbrirRegistrarManutencao = (veiculo: Veiculo) => {
    setVeiculoSelecionado(veiculo)
    setRegistrarManutencaoDialogOpen(true)

    // Obter a data atual no formato correto
    const hoje = new Date()
    hoje.setHours(12, 0, 0, 0) // Meio-dia para evitar problemas de fuso horário
    const dataFormatada = format(hoje, "yyyy-MM-dd")

    console.log("Data atual formatada:", dataFormatada)
    console.log("Data atual ISO:", hoje.toISOString())

    // Resetar o formulário
    setFormManutencao({
      tipo_manutencao: "",
      descricao: "",
      data_manutencao: dataFormatada,
      medicao_atual: "",
      atualizar_km: false,
    })
  }

  // Função para abrir o diálogo de exclusão de manutenções
  const handleAbrirExcluirManutencoes = (veiculo: Veiculo) => {
    setVeiculoSelecionado(veiculo)
    setExcluirManutencoesDialogOpen(true)
    fetchManutencoesVeiculo(veiculo.id)
  }

  // Função para salvar uma nova manutenção
  const handleSalvarManutencao = async () => {
    if (!veiculoSelecionado) return

    if (!formManutencao.tipo_manutencao || !formManutencao.descricao || !formManutencao.data_manutencao) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      })
      return
    }

    try {
      setSalvandoManutencao(true)

      // Obter a data do formulário e adicionar um dia para compensar o fuso horário
      const dataOriginal = parseISO(formManutencao.data_manutencao)
      const dataAjustada = addDays(dataOriginal, 1)
      const dataFormatada = format(dataAjustada, "yyyy-MM-dd")

      console.log("Data original do formulário:", formManutencao.data_manutencao)
      console.log("Data ajustada (adicionado 1 dia):", dataFormatada)

      // 1. Inserir a nova manutenção
      const { data, error } = await supabase
        .from("manutencoes")
        .insert({
          veiculo_id: veiculoSelecionado.id,
          tipo_manutencao: formManutencao.tipo_manutencao,
          descricao: formManutencao.descricao,
          data_manutencao: dataFormatada, // Usar a data ajustada
          medicao_atual: formManutencao.medicao_atual ? Number.parseInt(formManutencao.medicao_atual) : null,
        })
        .select()

      if (error) {
        throw error
      }

      // 2. Se o checkbox de atualizar quilometragem estiver marcado, atualizar o veículo
      if (formManutencao.atualizar_km && formManutencao.medicao_atual) {
        const kmAtual = Number.parseInt(formManutencao.medicao_atual)

        // Primeiro, verificar se a coluna km_atual existe na tabela veiculos
        const { data: veiculoData, error: veiculoError } = await supabase
          .from("veiculos")
          .select("km_atual")
          .eq("id", veiculoSelecionado.id)
          .limit(1)

        if (veiculoError && veiculoError.message.includes("does not exist")) {
          // A coluna km_atual não existe, mostrar mensagem
          toast({
            title: "Atenção",
            description: "Não foi possível atualizar a quilometragem do veículo. A coluna não existe na tabela.",
            variant: "warning",
          })
        } else {
          // Tentar atualizar a quilometragem do veículo
          const { error: updateError } = await supabase
            .from("veiculos")
            .update({ km_atual: kmAtual })
            .eq("id", veiculoSelecionado.id)

          if (updateError) {
            console.error("Erro ao atualizar quilometragem do veículo:", updateError)
            toast({
              title: "Atenção",
              description: "Manutenção registrada, mas não foi possível atualizar a quilometragem do veículo.",
              variant: "warning",
            })
          } else {
            // Atualizar a lista de veículos com o novo valor de quilometragem
            setVeiculos(veiculos.map((v) => (v.id === veiculoSelecionado.id ? { ...v, km_atual: kmAtual } : v)))
          }
        }

        // 3. Registrar a atualização de quilometragem
        const kmAnterior = veiculoSelecionado.km_atual || 0
        const novaKmAtual = Number.parseInt(formManutencao.medicao_atual)

        const { error: kmError } = await supabase.from("atualizacoes_km").insert({
          veiculo_id: veiculoSelecionado.id,
          medicao_anterior: kmAnterior,
          medicao_atual: novaKmAtual,
          data_atualizacao: dataFormatada, // Usar a mesma data ajustada
          usuario: "Sistema (via registro de manutenção)",
          observacao: `Quilometragem atualizada automaticamente ao registrar manutenção: ${formManutencao.tipo_manutencao}`,
        })

        if (kmError) {
          console.error("Erro ao registrar atualização de quilometragem:", kmError)
        }
      }

      toast({
        title: "Manutenção registrada",
        description: "A manutenção foi registrada com sucesso.",
      })

      // Fechar o diálogo
      setRegistrarManutencaoDialogOpen(false)

      // Se o diálogo de histórico estiver aberto, atualizar o histórico
      if (historicoDialogOpen && veiculoSelecionado) {
        fetchHistoricoVeiculo(veiculoSelecionado.id)
      }
    } catch (error: any) {
      console.error("Erro ao salvar manutenção:", error)

      // Se a tabela não existir, informar ao usuário
      if (error.code === "42P01") {
        toast({
          title: "Tabela não encontrada",
          description: "A tabela de manutenções não existe. Execute o script SQL fornecido no SQL Editor do Supabase.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Erro",
          description: "Não foi possível registrar a manutenção. Tente novamente.",
          variant: "destructive",
        })
      }
    } finally {
      setSalvandoManutencao(false)
    }
  }

  // Adicionar função para lidar com a exclusão de manutenção
  const handleExcluirManutencao = async () => {
    if (!manutencaoParaExcluir) return

    try {
      setExcluindoManutencao(true)

      // Excluir a manutenção
      const { error } = await supabase.from("manutencoes").delete().eq("id", manutencaoParaExcluir)

      if (error) throw error

      toast({
        title: "Manutenção excluída",
        description: "O registro de manutenção foi excluído com sucesso.",
      })

      // Atualizar o histórico
      if (veiculoSelecionado) {
        fetchHistoricoVeiculo(veiculoSelecionado.id)
        // Atualizar também a lista de manutenções se o diálogo estiver aberto
        if (excluirManutencoesDialogOpen) {
          fetchManutencoesVeiculo(veiculoSelecionado.id)
        }
      }

      // Fechar o diálogo de confirmação
      setExcluirManutencaoDialogOpen(false)
      setManutencaoParaExcluir(null)
    } catch (error) {
      console.error("Erro ao excluir manutenção:", error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir a manutenção. Tente novamente.",
        variant: "destructive",
      })
    } finally {
      setExcluindoManutencao(false)
    }
  }

  // Adicionar função para abrir o diálogo de confirmação de exclusão
  const handleConfirmarExclusao = (manutencaoId: number) => {
    setManutencaoParaExcluir(manutencaoId)
    setExcluirManutencaoDialogOpen(true)
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

  // Filtrar veículos com base na busca
  const veiculosFiltrados = veiculos.filter(
    (veiculo) =>
      veiculo.placa.toLowerCase().includes(busca.toLowerCase()) ||
      veiculo.modelo.toLowerCase().includes(busca.toLowerCase()) ||
      veiculo.marca.toLowerCase().includes(busca.toLowerCase()) ||
      veiculo.secretaria.toLowerCase().includes(busca.toLowerCase()),
  )

  // Filtrar itens de histórico por tipo
  const historicoFiltrado = historicoItems.filter((item) => {
    if (filtroTipo === "todos") return true
    return item.tipo === filtroTipo
  })

  // Alternar ordenação
  const toggleOrdenacao = () => {
    setOrdenacao(ordenacao === "desc" ? "asc" : "desc")
    setHistoricoItems((prev) =>
      [...prev].sort((a, b) => {
        const dateA = new Date(a.data).getTime()
        const dateB = new Date(b.data).getTime()
        return ordenacao === "asc" ? dateB - dateA : dateA - dateB
      }),
    )
  }

  // Função para filtrar itens na cronologia por palavra-chave
  const filtrarCronologia = (termo: string) => {
    if (!termo.trim()) {
      setHistoricoFiltradoCronologia(historicoItems)
      return
    }

    const termoLowerCase = termo.toLowerCase()
    const filtrados = historicoItems.filter(
      (item) =>
        item.descricao.toLowerCase().includes(termoLowerCase) ||
        (item.tipo === "manutencao" && item.detalhes.descricao?.toLowerCase().includes(termoLowerCase)) ||
        (item.tipo === "ordem_servico" &&
          (item.detalhes.defeitos?.toLowerCase().includes(termoLowerCase) ||
            item.detalhes.servicos_solicitados?.toLowerCase().includes(termoLowerCase))),
    )

    setHistoricoFiltradoCronologia(filtrados)
  }

  // Atualizar historicoFiltradoCronologia quando historicoItems mudar
  useEffect(() => {
    setHistoricoFiltradoCronologia(historicoItems)
    // Aplicar filtro atual, se houver
    if (pesquisaCronologia.trim()) {
      filtrarCronologia(pesquisaCronologia)
    }
  }, [historicoItems])

  // Função para imprimir o relatório
  const handlePrint = () => {
    window.print()
  }

  return (
    <LayoutAutenticado>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Históricos de Manutenção</h2>
          <p className="text-muted-foreground">
            Visualize o histórico completo de manutenções e atividades dos veículos.
          </p>
        </div>

        <div className="flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar veículos..."
              className="pl-8"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Veículos da Frota</CardTitle>
            <CardDescription className="text-slate-500 dark:text-slate-400">
              Selecione um veículo para visualizar seu histórico completo de atividades.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Placa</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Secretaria</TableHead>
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
                ) : veiculosFiltrados.length > 0 ? (
                  veiculosFiltrados.map((veiculo) => (
                    <TableRow key={veiculo.id}>
                      <TableCell className="font-medium">{veiculo.placa}</TableCell>
                      <TableCell>
                        {veiculo.marca} {veiculo.modelo}
                      </TableCell>
                      <TableCell>{veiculo.tipo}</TableCell>
                      <TableCell>{veiculo.secretaria}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            veiculo.status === "Ativo"
                              ? "bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-200"
                              : veiculo.status === "Manutenção"
                                ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                                : "bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-300"
                          }
                        >
                          {veiculo.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <span className="sr-only">Abrir menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleAbrirHistorico(veiculo)}>
                              <Eye className="h-4 w-4 mr-2" />
                              Visualizar Histórico
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAbrirRelatorio(veiculo)}>
                              <FileText className="h-4 w-4 mr-2" />
                              Relatório Completo
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAbrirCronologia(veiculo)}>
                              <Clock className="h-4 w-4 mr-2" />
                              Cronologia
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAbrirRegistrarManutencao(veiculo)}>
                              <WrenchIcon className="h-4 w-4 mr-2" />
                              Registrar Manutenção
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAbrirExcluirManutencoes(veiculo)}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir Manutenções
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      Nenhum veículo encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Diálogo para Visualizar Histórico Completo */}
      <Dialog open={historicoDialogOpen} onOpenChange={setHistoricoDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico Completo do Veículo</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              {veiculoSelecionado &&
                `Todas as atividades registradas para o veículo ${veiculoSelecionado.marca} ${veiculoSelecionado.modelo} (${veiculoSelecionado.placa})`}
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center justify-between mb-4">
            <Tabs defaultValue="todos" value={filtroTipo} onValueChange={setFiltroTipo} className="w-full">
              <TabsList className="grid grid-cols-6 gap-1">
                <TabsTrigger value="todos">Todos</TabsTrigger>
                <TabsTrigger value="quilometragem">Quilometragem</TabsTrigger>
                <TabsTrigger value="troca_oleo">Trocas de Óleo</TabsTrigger>
                <TabsTrigger value="ordem_servico">Ordens de Serviço</TabsTrigger>
                <TabsTrigger value="produto">Produtos</TabsTrigger>
                <TabsTrigger value="manutencao">Manutenções</TabsTrigger>
              </TabsList>
            </Tabs>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="ml-2">
                  <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
                  <span>{ordenacao === "desc" ? "Mais recentes" : "Mais antigos"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setOrdenacao("desc")
                    toggleOrdenacao()
                  }}
                >
                  Mais recentes primeiro
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setOrdenacao("asc")
                    toggleOrdenacao()
                  }}
                >
                  Mais antigos primeiro
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {carregandoHistorico ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          ) : historicoFiltrado.length > 0 ? (
            <div className="space-y-4">
              {historicoFiltrado.map((item, index) => (
                <div key={index} className="border rounded-md overflow-hidden">
                  <div className={`p-4 ${item.cor} border-b`}>
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        {item.icone}
                        <span className="font-medium">{item.descricao}</span>
                      </div>
                      <span className="text-xs text-slate-400 dark:text-slate-500">{formatarData(item.data)}</span>
                    </div>
                  </div>

                  <div className="p-4">
                    {item.tipo === "quilometragem" && (
                      <div className="space-y-2">
                        <p className="text-sm">
                          <span className="font-medium">Medição anterior:</span> {item.detalhes.medicao_anterior} km
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Nova medição:</span> {item.detalhes.medicao_atual} km
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Responsável:</span> {item.detalhes.usuario}
                        </p>
                        {item.detalhes.observacao && (
                          <div>
                            <p className="text-sm font-medium">Observação:</p>
                            <p className="text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded-md mt-1">
                              {item.detalhes.observacao}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {item.tipo === "troca_oleo" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <p className="text-sm">
                              <span className="font-medium">Tipo de óleo:</span> {item.detalhes.tipo_oleo}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">Quantidade:</span> {item.detalhes.quantidade_oleo} litros
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">Quilometragem:</span> {item.detalhes.medicao_troca} km
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">Próxima troca:</span> {item.detalhes.proxima_troca}
                              km
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-1">Filtros trocados:</p>
                            <div className="space-y-1">
                              <p className="text-sm">{item.detalhes.filtro_oleo ? "✓" : "✗"} Filtro de Óleo</p>
                              <p className="text-sm">
                                {item.detalhes.filtro_combustivel ? "✓" : "✗"} Filtro de Combustível
                              </p>
                              <p className="text-sm">{item.detalhes.filtro_ar ? "✓" : "✗"} Filtro de Ar</p>
                              <p className="text-sm">{item.detalhes.filtro_cabine ? "✓" : "✗"} Filtro de Cabine</p>
                              {item.detalhes.filtro_separador_agua !== undefined && (
                                <p className="text-sm">
                                  {item.detalhes.filtro_separador_agua ? "✓" : "✗"} Filtro Separador de Água
                                </p>
                              )}
                              {item.detalhes.copo_filtro_separador !== undefined && (
                                <p className="text-sm">
                                  {item.detalhes.copo_filtro_separador ? "✓" : "✗"} Copo do Filtro Separador
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                        {item.detalhes.observacoes && (
                          <div>
                            <p className="text-sm font-medium">Observações:</p>
                            <p className="text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded-md mt-1">
                              {item.detalhes.observacoes}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {item.tipo === "ordem_servico" && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          <p className="text-sm">
                            <span className="font-medium">Status:</span>{" "}
                            <Badge variant="outline" className="bg-slate-50 dark:bg-slate-800 dark:text-slate-200">
                              {item.detalhes.status_pedido || item.detalhes.status}
                            </Badge>
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Solicitante:</span>{" "}
                            {item.detalhes.solicitantes?.nome || "Não informado"}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Mecânico:</span>{" "}
                            {item.detalhes.mecanicos?.nome || "Não informado"}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Quilometragem:</span> {item.detalhes.medicao_atual} km
                          </p>
                        </div>
                        {item.detalhes.defeitos && (
                          <div>
                            <p className="text-sm font-medium">Defeitos comunicados:</p>
                            <p className="text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded-md mt-1">
                              {item.detalhes.defeitos}
                            </p>
                          </div>
                        )}
                        {item.detalhes.servicos_solicitados && (
                          <div>
                            <p className="text-sm font-medium">Serviços solicitados:</p>
                            <p className="text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded-md mt-1">
                              {item.detalhes.servicos_solicitados}
                            </p>
                          </div>
                        )}
                        {/* Buscar histórico de pedidos para esta ordem */}
                        <div className="mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-xs"
                            onClick={async () => {
                              try {
                                const { data, error } = await supabase
                                  .from("historico_pedidos")
                                  .select("*")
                                  .eq("ordem_id", item.detalhes.id)
                                  .order("data", { ascending: false })

                                if (error) throw error

                                if (data && data.length > 0) {
                                  // Procurar por observações do almoxarifado
                                  const almoxarifadoItem = data.find(
                                    (h) => h.observacao && h.observacao.includes("[ALMOXARIFADO]"),
                                  )

                                  if (almoxarifadoItem) {
                                    toast({
                                      title: "Observação do Almoxarifado",
                                      description: almoxarifadoItem.observacao.replace("[ALMOXARIFADO]", "").trim(),
                                      className: "bg-amber-50 text-amber-800 border-amber-300",
                                    })
                                  } else {
                                    toast({
                                      description: "Nenhuma observação do almoxarifado encontrada.",
                                    })
                                  }
                                } else {
                                  toast({
                                    description: "Nenhum histórico encontrado para esta ordem.",
                                  })
                                }
                              } catch (error) {
                                console.error("Erro ao buscar histórico:", error)
                                toast({
                                  variant: "destructive",
                                  description: "Erro ao buscar histórico da ordem.",
                                })
                              }
                            }}
                          >
                            Ver observações do almoxarifado
                          </Button>
                        </div>
                      </div>
                    )}

                    {item.tipo === "produto" && (
                      <div className="space-y-2">
                        <p className="text-sm">
                          <span className="font-medium">Produto:</span>{" "}
                          {item.detalhes.produtos?.nome || "Produto não encontrado"}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Categoria:</span>{" "}
                          {item.detalhes.produtos?.categoria || "Não categorizado"}
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Quantidade:</span> {item.detalhes.quantidade} unidades
                        </p>
                        <p className="text-sm">
                          <span className="font-medium">Destino:</span> {item.detalhes.destino}
                        </p>
                        {item.detalhes.observacao && (
                          <div>
                            <p className="text-sm font-medium">Observação:</p>
                            <p className="text-sm bg-gray-50 dark:bg-gray-800 p-2 rounded-md mt-1">
                              {item.detalhes.observacao}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {item.tipo === "manutencao" && (
                      <div className="space-y-2">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-sm">
                              <span className="font-medium">Tipo de manutenção:</span> {item.detalhes.tipo_manutencao}
                            </p>
                            <p className="text-sm">
                              <span className="font-medium">Descrição:</span> {item.detalhes.descricao}
                            </p>
                            {item.detalhes.medicao_atual && (
                              <p className="text-sm">
                                <span className="font-medium">Quilometragem:</span> {item.detalhes.medicao_atual} km
                              </p>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900"
                            onClick={() => handleConfirmarExclusao(item.detalhes.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {filtroTipo === "todos"
                ? "Nenhum histórico encontrado para este veículo."
                : `Nenhum registro de ${
                    filtroTipo === "quilometragem"
                      ? "atualização de quilometragem"
                      : filtroTipo === "troca_oleo"
                        ? "troca de óleo"
                        : filtroTipo === "ordem_servico"
                          ? "ordem de serviço"
                          : filtroTipo === "manutenção"
                            ? "manutenção"
                            : "produtos utilizados"
                  } encontrado.`}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setHistoricoDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para Registrar Manutenção */}
      <Dialog open={registrarManutencaoDialogOpen} onOpenChange={setRegistrarManutencaoDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Registrar Manutenção</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              {veiculoSelecionado &&
                `Registre uma nova manutenção para o veículo ${veiculoSelecionado.marca} ${veiculoSelecionado.modelo} (${veiculoSelecionado.placa})`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="tipo_manutencao">Tipo de Manutenção *</Label>
              <Input
                id="tipo_manutencao"
                placeholder="Ex: Troca de Pastilhas de Freio"
                value={formManutencao.tipo_manutencao}
                onChange={(e) => setFormManutencao({ ...formManutencao, tipo_manutencao: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descricao">Descrição *</Label>
              <Textarea
                id="descricao"
                placeholder="Descreva a manutenção realizada"
                value={formManutencao.descricao}
                onChange={(e) => setFormManutencao({ ...formManutencao, descricao: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="data_manutencao">Data da Manutenção *</Label>
                <Input
                  id="data_manutencao"
                  type="date"
                  value={formManutencao.data_manutencao}
                  onChange={(e) => setFormManutencao({ ...formManutencao, data_manutencao: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="medicao_atual">Quilometragem</Label>
                <Input
                  id="medicao_atual"
                  type="number"
                  placeholder="Km na data da manutenção"
                  value={formManutencao.medicao_atual}
                  onChange={(e) => setFormManutencao({ ...formManutencao, medicao_atual: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="atualizar_km"
                checked={formManutencao.atualizar_km}
                onCheckedChange={(checked) =>
                  setFormManutencao({
                    ...formManutencao,
                    atualizar_km: checked as boolean,
                  })
                }
              />
              <Label htmlFor="atualizar_km" className="text-sm font-normal cursor-pointer">
                Atualizar quilometragem atual do veículo
              </Label>
            </div>
            {formManutencao.atualizar_km && (
              <div className="text-xs text-amber-600 pl-6">
                Atenção: Isso irá atualizar a quilometragem atual do veículo para o valor informado acima.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRegistrarManutencaoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSalvarManutencao} disabled={salvandoManutencao}>
              {salvandoManutencao ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                  Salvando...
                </>
              ) : (
                <>
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Registrar Manutenção
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para Confirmar Exclusão de Manutenção */}
      <Dialog open={excluirManutencaoDialogOpen} onOpenChange={setExcluirManutencaoDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              Tem certeza que deseja excluir este registro de manutenção? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExcluirManutencaoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleExcluirManutencao} disabled={excluindoManutencao}>
              {excluindoManutencao ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-background border-t-transparent"></div>
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para Relatório Completo */}
      <Dialog open={relatorioDialogOpen} onOpenChange={setRelatorioDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Relatório Completo do Veículo</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              {veiculoSelecionado &&
                `Relatório detalhado do veículo ${veiculoSelecionado.marca} ${veiculoSelecionado.modelo} (${veiculoSelecionado.placa})`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 print:py-10" id="relatorio-para-impressao">
            {veiculoSelecionado && (
              <>
                <div className="border-b pb-4 print:flex print:justify-between">
                  <div>
                    <h2 className="text-2xl font-bold">Dados do Veículo</h2>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <p>
                          <span className="font-medium">Placa:</span> {veiculoSelecionado.placa}
                        </p>
                        <p>
                          <span className="font-medium">Marca/Modelo:</span> {veiculoSelecionado.marca}{" "}
                          {veiculoSelecionado.modelo}
                        </p>
                        <p>
                          <span className="font-medium">Tipo:</span> {veiculoSelecionado.tipo}
                        </p>
                      </div>
                      <div>
                        <p>
                          <span className="font-medium">Secretaria:</span> {veiculoSelecionado.secretaria}
                        </p>
                        <p>
                          <span className="font-medium">Status:</span> {veiculoSelecionado.status}
                        </p>
                        <p>
                          <span className="font-medium">Quilometragem Atual:</span>{" "}
                          {veiculoSelecionado.km_atual || "Não informada"} km
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="hidden print:block text-right">
                    <p className="text-sm text-slate-400 dark:text-slate-500">
                      Relatório gerado em: {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                {carregandoHistorico ? (
                  <div className="flex justify-center py-8">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                  </div>
                ) : (
                  <>
                    {/* Resumo Estatístico */}
                    <div className="border-b pb-4">
                      <h2 className="text-xl font-bold mb-3">Resumo Estatístico</h2>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <p className="text-sm text-slate-400 dark:text-slate-500">Total de Manutenções</p>
                              <p className="text-3xl font-bold">
                                {
                                  historicoItems.filter(
                                    (item) =>
                                      item.tipo === "manutencao" ||
                                      (item.tipo === "ordem_servico" &&
                                        (item.detalhes.status === "Finalizado" ||
                                          item.detalhes.status_pedido === "Finalizado")),
                                  ).length
                                }
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <p className="text-sm text-slate-400 dark:text-slate-500">Trocas de Óleo</p>
                              <p className="text-3xl font-bold">
                                {historicoItems.filter((item) => item.tipo === "troca_oleo").length}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-center">
                              <p className="text-sm text-slate-400 dark:text-slate-500">Produtos Utilizados</p>
                              <p className="text-3xl font-bold">
                                {historicoItems.filter((item) => item.tipo === "produto").length}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>

                    {/* Histórico de Manutenções */}
                    <div className="border-b pb-4">
                      <h2 className="text-xl font-bold mb-3">Histórico de Manutenções</h2>
                      {historicoItems.filter((item) => item.tipo === "manutencao").length > 0 ? (
                        <div className="space-y-3">
                          {historicoItems
                            .filter((item) => item.tipo === "manutencao")
                            .map((item, index) => (
                              <div key={index} className="border rounded-md p-3">
                                <div className="flex justify-between">
                                  <p className="font-medium">{item.detalhes.tipo_manutencao}</p>
                                  <p className="text-sm text-slate-400 dark:text-slate-500">
                                    {formatarData(item.data)}
                                  </p>
                                </div>
                                <p className="text-sm mt-1">{item.detalhes.descricao}</p>
                                {item.detalhes.medicao_atual && (
                                  <p className="text-sm mt-1">
                                    <span className="font-medium">Quilometragem:</span> {item.detalhes.medicao_atual} km
                                  </p>
                                )}
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-slate-400 dark:text-slate-500">Nenhuma manutenção registrada.</p>
                      )}
                    </div>

                    {/* Histórico de Trocas de Óleo */}
                    <div className="border-b pb-4">
                      <h2 className="text-xl font-bold mb-3">Histórico de Trocas de Óleo</h2>
                      {historicoItems.filter((item) => item.tipo === "troca_oleo").length > 0 ? (
                        <div className="space-y-3">
                          {historicoItems
                            .filter((item) => item.tipo === "troca_oleo")
                            .map((item, index) => (
                              <div key={index} className="border rounded-md p-3">
                                <div className="flex justify-between">
                                  <p className="font-medium">Troca de Óleo: {item.detalhes.tipo_oleo}</p>
                                  <p className="text-sm text-slate-400 dark:text-slate-500">
                                    {formatarData(item.data)}
                                  </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                                  <div>
                                    <p className="text-sm">
                                      <span className="font-medium">Quantidade:</span> {item.detalhes.quantidade_oleo}{" "}
                                      litros
                                    </p>
                                    <p className="text-sm">
                                      <span className="font-medium">Quilometragem:</span> {item.detalhes.medicao_troca}{" "}
                                      km
                                    </p>
                                    <p className="text-sm">
                                      <span className="font-medium">Próxima troca:</span> {item.detalhes.proxima_troca}{" "}
                                      km
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">Filtros trocados:</p>
                                    <p className="text-sm">{item.detalhes.filtro_oleo ? "✓" : "✗"} Filtro de Óleo</p>
                                    <p className="text-sm">
                                      {item.detalhes.filtro_combustivel ? "✓" : "✗"} Filtro de Combustível
                                    </p>
                                    <p className="text-sm">{item.detalhes.filtro_ar ? "✓" : "✗"} Filtro de Ar</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-slate-400 dark:text-slate-500">Nenhuma troca de óleo registrada.</p>
                      )}
                    </div>

                    {/* Ordens de Serviço */}
                    <div className="border-b pb-4">
                      <h2 className="text-xl font-bold mb-3">Ordens de Serviço</h2>
                      {historicoItems.filter((item) => item.tipo === "ordem_servico").length > 0 ? (
                        <div className="space-y-3">
                          {historicoItems
                            .filter((item) => item.tipo === "ordem_servico")
                            .map((item, index) => (
                              <div key={index} className="border rounded-md p-3">
                                <div className="flex justify-between">
                                  <p className="font-medium">OS #{item.detalhes.id}</p>
                                  <p className="text-sm text-slate-400 dark:text-slate-500">
                                    {formatarData(item.data)}
                                  </p>
                                </div>
                                <div className="mt-2">
                                  <p className="text-sm">
                                    <span className="font-medium">Status:</span>{" "}
                                    <Badge
                                      variant="outline"
                                      className="bg-slate-50 dark:bg-slate-800 dark:text-slate-200"
                                    >
                                      {item.detalhes.status_pedido || item.detalhes.status}
                                    </Badge>
                                  </p>
                                  <p className="text-sm">
                                    <span className="font-medium">Solicitante:</span>{" "}
                                    {item.detalhes.solicitantes?.nome || "Não informado"}
                                  </p>
                                  {item.detalhes.defeitos && (
                                    <p className="text-sm mt-1">
                                      <span className="font-medium">Defeitos:</span> {item.detalhes.defeitos}
                                    </p>
                                  )}
                                  {item.detalhes.servicos_solicitados && (
                                    <p className="text-sm mt-1">
                                      <span className="font-medium">Serviços:</span>{" "}
                                      {item.detalhes.servicos_solicitados}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                        </div>
                      ) : (
                        <p className="text-slate-400 dark:text-slate-500">Nenhuma ordem de serviço registrada.</p>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          <DialogFooter className="flex justify-between items-center print:hidden">
            <div>
              <Button variant="outline" onClick={handlePrint} className="mr-2">
                <Printer className="h-4 w-4 mr-2" />
                Imprimir Relatório
              </Button>
            </div>
            <Button onClick={() => setRelatorioDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para Cronologia */}
      <Dialog open={cronologiaDialogOpen} onOpenChange={setCronologiaDialogOpen}>
        <DialogContent className="sm:max-w-[1100px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cronologia do Veículo</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              {veiculoSelecionado &&
                `Linha do tempo completa do veículo ${veiculoSelecionado.marca} ${veiculoSelecionado.modelo} (${veiculoSelecionado.placa})`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <div className="relative w-full">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Pesquisar na cronologia..."
                  className="pl-8"
                  value={pesquisaCronologia}
                  onChange={(e) => {
                    setPesquisaCronologia(e.target.value)
                    filtrarCronologia(e.target.value)
                  }}
                />
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <ArrowUpDown className="h-3.5 w-3.5 mr-1" />
                    <span>{ordenacao === "desc" ? "Mais recentes" : "Mais antigos"}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Ordenar por</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      setOrdenacao("desc")
                      toggleOrdenacao()
                    }}
                  >
                    Mais recentes primeiro
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      setOrdenacao("asc")
                      toggleOrdenacao()
                    }}
                  >
                    Mais antigos primeiro
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {carregandoHistorico ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
            ) : historicoFiltradoCronologia.length > 0 ? (
              <div className="relative pl-16 border-l-2 border-gray-200 dark:border-gray-800 space-y-8 ml-16">
                {historicoFiltradoCronologia.map((item, index) => (
                  <div key={index} className="relative">
                    {/* Marcador na linha do tempo */}
                    <div
                      className={`absolute -left-[33px] p-1.5 rounded-full ${item.cor.replace("bg-blue-50", "bg-blue-500").replace("bg-amber-50", "bg-amber-500").replace("bg-purple-50", "bg-purple-500").replace("bg-green-50", "bg-green-500").replace("bg-rose-50", "bg-rose-500")} text-white`}
                    >
                      {item.icone}
                    </div>

                    {/* Data do evento */}
                    <div className="absolute -left-[180px] top-0 w-[140px] text-right text-xs text-slate-400 dark:text-slate-500">
                      {format(new Date(item.data), "dd/MM/yyyy", { locale: ptBR })}
                    </div>

                    {/* Conteúdo do evento */}
                    <div className="ml-2">
                      <div className={`p-4 rounded-lg border ${item.cor}`}>
                        <div className="font-medium">{item.descricao}</div>

                        {item.tipo === "quilometragem" && (
                          <div className="mt-2 text-sm">
                            <p>
                              Atualização de {item.detalhes.medicao_anterior} para {item.detalhes.medicao_atual} km
                            </p>
                            {item.detalhes.observacao && <p className="mt-1 italic">{item.detalhes.observacao}</p>}
                          </div>
                        )}

                        {item.tipo === "troca_oleo" && (
                          <div className="mt-2 text-sm">
                            <p>
                              Óleo: {item.detalhes.tipo_oleo} ({item.detalhes.quantidade_oleo} litros)
                            </p>
                            <p>Próxima troca: {item.detalhes.proxima_troca} km</p>
                          </div>
                        )}

                        {item.tipo === "ordem_servico" && (
                          <div className="mt-2 text-sm">
                            <p>Status: {item.detalhes.status_pedido || item.detalhes.status}</p>
                            {item.detalhes.defeitos && <p className="mt-1">Defeitos: {item.detalhes.defeitos}</p>}
                          </div>
                        )}

                        {item.tipo === "produto" && (
                          <div className="mt-2 text-sm">
                            <p>
                              Produto: {item.detalhes.produtos?.nome} ({item.detalhes.quantidade} unidades)
                            </p>
                            {item.detalhes.observacao && <p className="mt-1 italic">{item.detalhes.observacao}</p>}
                          </div>
                        )}

                        {item.tipo === "manutencao" && (
                          <div className="mt-2 text-sm">
                            <p>{item.detalhes.descricao}</p>
                            {item.detalhes.medicao_atual && (
                              <p className="mt-1">Quilometragem: {item.detalhes.medicao_atual} km</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {pesquisaCronologia.trim()
                  ? "Nenhum resultado encontrado para a pesquisa."
                  : "Nenhum histórico encontrado para este veículo."}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setCronologiaDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para Excluir Manutenções */}
      <Dialog open={excluirManutencoesDialogOpen} onOpenChange={setExcluirManutencoesDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Excluir Manutenções</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">
              {veiculoSelecionado &&
                `Gerencie as manutenções registradas para o veículo ${veiculoSelecionado.marca} ${veiculoSelecionado.modelo} (${veiculoSelecionado.placa})`}
            </DialogDescription>
          </DialogHeader>

          {carregandoManutencoes ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          ) : manutencoesVeiculo.length > 0 ? (
            <div className="space-y-4">
              {manutencoesVeiculo.map((manutencao) => (
                <div key={manutencao.id} className="border rounded-md p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{manutencao.tipo_manutencao}</p>
                      <p className="text-sm text-slate-400 dark:text-slate-500">
                        {format(new Date(manutencao.data_manutencao), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                      <p className="text-sm mt-1">{manutencao.descricao}</p>
                      {manutencao.medicao_atual && (
                        <p className="text-sm mt-1">
                          <span className="font-medium">Quilometragem:</span> {manutencao.medicao_atual} km
                        </p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900"
                      onClick={() => handleConfirmarExclusao(manutencao.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma manutenção registrada para este veículo.
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setExcluirManutencoesDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </LayoutAutenticado>
  )
}

