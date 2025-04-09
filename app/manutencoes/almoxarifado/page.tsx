"use client"

import { useState, useEffect } from "react"
import LayoutAutenticado from "@/components/layout-autenticado"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Search,
  MoreHorizontal,
  Eye,
  CheckCircle,
  XCircle,
  ShoppingCart,
  History,
  PlusCircle,
  MinusCircle,
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
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
import { supabase } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface OrdemServico {
  id: number
  data_abertura: string
  veiculo_id: number
  veiculo?: string
  solicitante_id: number
  solicitante?: string
  mecanico_id: number
  mecanico?: string
  medicao_atual: number
  tipo_medicao: string
  defeitos: string
  servicos_solicitados: string
  status: string
  status_pedido?: string
  created_at?: string
  updated_at?: string
}

interface HistoricoItem {
  id: number
  ordem_id: number
  data: string
  status_anterior: string
  status_novo: string
  observacao: string
  usuario: string
}

interface Produto {
  id: number
  nome: string
  unidade: string
  quantidade?: number
  categoria?: string
}

interface ItemSaida {
  produto_id: number
  produto_nome: string
  quantidade: number
  unidade: string
}

export default function AlmoxarifadoPage() {
  const [busca, setBusca] = useState("")
  const [tabAtiva, setTabAtiva] = useState("pendentes")
  const [ordens, setOrdens] = useState<OrdemServico[]>([])
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState<any>(null)

  // Estados para os diálogos
  const [visualizarDialogOpen, setVisualizarDialogOpen] = useState(false)
  const [atenderDialogOpen, setAtenderDialogOpen] = useState(false)
  const [rejeitarDialogOpen, setRejeitarDialogOpen] = useState(false)
  const [enviarComprasDialogOpen, setEnviarComprasDialogOpen] = useState(false)
  const [historicoDialogOpen, setHistoricoDialogOpen] = useState(false)
  const [ordemSelecionada, setOrdemSelecionada] = useState<OrdemServico | null>(null)
  const [observacao, setObservacao] = useState("")
  const [processando, setProcessando] = useState(false)

  // Estado para o histórico
  const [historicoPedido, setHistoricoPedido] = useState<HistoricoItem[]>([])
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)

  // Estados para o formulário de saída de estoque
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loadingProdutos, setLoadingProdutos] = useState(true)
  const [itensSaida, setItensSaida] = useState<ItemSaida[]>([])
  const [produtoSelecionado, setProdutoSelecionado] = useState<number | null>(null)
  const [quantidadeSaida, setQuantidadeSaida] = useState(1)
  const [produtoSearch, setProdutoSearch] = useState("")

  // Carregar dados do usuário
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

  // Carregar ordens de serviço ao iniciar
  useEffect(() => {
    fetchOrdens()
    fetchProdutos()
  }, [])

  // Função para buscar ordens de serviço
  const fetchOrdens = async () => {
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
        .eq("status", "Pendente")
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

        setOrdens(ordensFormatadas)
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

  // Função para buscar produtos
  const fetchProdutos = async () => {
    try {
      setLoadingProdutos(true)

      // Buscar produtos do Supabase
      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome, categoria, quantidade, unidade")
        .order("nome", { ascending: true })

      if (error) {
        throw error
      }

      if (data) {
        setProdutos(data)
      } else {
        setProdutos([])
      }
    } catch (error) {
      console.error("Erro ao buscar produtos:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os produtos.",
        variant: "destructive",
      })
      setProdutos([])
    } finally {
      setLoadingProdutos(false)
    }
  }

  // Função para buscar histórico de um pedido
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

  // Funções para manipular itens de saída
  const adicionarItemSaida = () => {
    if (!produtoSelecionado || quantidadeSaida <= 0) {
      toast({
        title: "Erro",
        description: "Selecione um produto e informe uma quantidade válida.",
        variant: "destructive",
      })
      return
    }

    const produtoEncontrado = produtos.find((p) => p.id === produtoSelecionado)
    if (!produtoEncontrado) {
      toast({
        title: "Erro",
        description: "Produto não encontrado.",
        variant: "destructive",
      })
      return
    }

    // Verificar se há estoque suficiente
    if ((produtoEncontrado.quantidade || 0) < quantidadeSaida) {
      toast({
        title: "Erro",
        description: `Estoque insuficiente. Disponível: ${produtoEncontrado.quantidade} ${produtoEncontrado.unidade}`,
        variant: "destructive",
      })
      return
    }

    // Verificar se o produto já está na lista
    const itemExistente = itensSaida.find((item) => item.produto_id === produtoSelecionado)
    if (itemExistente) {
      // Atualizar a quantidade do item existente
      setItensSaida(
        itensSaida.map((item) =>
          item.produto_id === produtoSelecionado ? { ...item, quantidade: item.quantidade + quantidadeSaida } : item,
        ),
      )
    } else {
      // Adicionar novo item
      setItensSaida([
        ...itensSaida,
        {
          produto_id: produtoSelecionado,
          produto_nome: produtoEncontrado.nome,
          quantidade: quantidadeSaida,
          unidade: produtoEncontrado.unidade,
        },
      ])
    }

    // Limpar seleção
    setProdutoSelecionado(null)
    setQuantidadeSaida(1)
    setProdutoSearch("")
  }

  const removerItemSaida = (index: number) => {
    setItensSaida(itensSaida.filter((_, i) => i !== index))
  }

  // Função para atender a solicitação
  const handleAtenderSolicitacao = async () => {
    if (!ordemSelecionada) return

    try {
      setProcessando(true)

      // Verificar se há itens de saída
      if (itensSaida.length === 0) {
        toast({
          title: "Erro",
          description: "É necessário adicionar pelo menos um item para atender a solicitação.",
          variant: "destructive",
        })
        setProcessando(false)
        return
      }

      // Registrar as saídas de estoque
      for (const item of itensSaida) {
        // 1. Inserir a saída no banco de dados
        const { error: erroInsercao } = await supabase.from("saidas").insert({
          produto_id: item.produto_id,
          quantidade: item.quantidade,
          unidade: item.unidade,
          data_saida: new Date().toISOString(),
          solicitante: ordemSelecionada.solicitante || "Não informado",
          destino: ordemSelecionada.veiculo || "Não informado",
        })

        if (erroInsercao) {
          throw erroInsercao
        }

        // 2. Atualizar a quantidade do produto
        const produtoAtual = produtos.find((p) => p.id === item.produto_id)
        if (produtoAtual && produtoAtual.quantidade !== undefined) {
          const novaQuantidade = produtoAtual.quantidade - item.quantidade

          const { error: erroAtualizacao } = await supabase
            .from("produtos")
            .update({
              quantidade: novaQuantidade,
              updated_at: new Date().toISOString(),
            })
            .eq("id", item.produto_id)

          if (erroAtualizacao) {
            throw erroAtualizacao
          }
        }
      }

      // Atualizar o status da ordem
      const { error } = await supabase
        .from("ordens_servico")
        .update({
          status: "Concluída",
          status_pedido: "Finalizado",
          updated_at: new Date().toISOString(),
        })
        .eq("id", ordemSelecionada.id)

      if (error) {
        throw error
      }

      // Registrar no histórico
      const historicoItem = {
        ordem_id: ordemSelecionada.id,
        data: new Date().toISOString(),
        status_anterior: ordemSelecionada.status_pedido || "Em aprovação",
        status_novo: "Finalizado",
        observacao: `[ALMOXARIFADO] ${observacao || "Peças fornecidas pelo Almoxarifado"}`,
        usuario: userData?.nome || "Usuário Atual",
      }

      const { error: errorHistorico } = await supabase.from("historico_pedidos").insert(historicoItem)

      if (errorHistorico) {
        throw errorHistorico
      }

      toast({
        title: "Sucesso",
        description: "Solicitação atendida com sucesso!",
      })

      // Atualizar a lista de ordens e produtos
      fetchOrdens()
      fetchProdutos()

      // Limpar estados
      setObservacao("")
      setItensSaida([])
      setAtenderDialogOpen(false)
    } catch (error) {
      console.error("Erro ao atender solicitação:", error)
      toast({
        title: "Erro",
        description: "Não foi possível atender a solicitação.",
        variant: "destructive",
      })
    } finally {
      setProcessando(false)
    }
  }

  // Função para rejeitar a solicitação
  const handleRejeitarSolicitacao = async () => {
    if (!ordemSelecionada) return

    try {
      setProcessando(true)

      // Atualizar o status da ordem
      const { error } = await supabase
        .from("ordens_servico")
        .update({
          status: "Aberta",
          status_pedido: "Recusado", // Changed from "Rejeitado pelo Almoxarifado" to "Recusado"
          updated_at: new Date().toISOString(),
        })
        .eq("id", ordemSelecionada.id)

      if (error) {
        throw error
      }

      // Registrar no histórico
      const historicoItem = {
        ordem_id: ordemSelecionada.id,
        data: new Date().toISOString(),
        status_anterior: ordemSelecionada.status_pedido || "Em aprovação",
        status_novo: "Recusado", // Changed from "Rejeitado pelo Almoxarifado" to "Recusado"
        observacao: observacao,
        usuario: userData?.nome || "Usuário Atual",
      }

      const { error: errorHistorico } = await supabase.from("historico_pedidos").insert(historicoItem)

      if (errorHistorico) {
        throw errorHistorico
      }

      toast({
        title: "Sucesso",
        description: "Solicitação rejeitada com sucesso!",
      })

      // Atualizar a lista de ordens
      fetchOrdens()

      // Limpar estados
      setObservacao("")
      setRejeitarDialogOpen(false)
    } catch (error) {
      console.error("Erro ao rejeitar solicitação:", error)
      toast({
        title: "Erro",
        description: "Não foi possível rejeitar a solicitação.",
        variant: "destructive",
      })
    } finally {
      setProcessando(false)
    }
  }

  // Função para enviar para compras
  const handleEnviarParaCompras = async () => {
    if (!ordemSelecionada) return

    try {
      setProcessando(true)

      // Atualizar o status da ordem
      const { error } = await supabase
        .from("ordens_servico")
        .update({
          status: "Pendente",
          status_pedido: "Aguardando Fornecedor", // Changed from "Enviado para Compras" to "Aguardando Fornecedor"
          updated_at: new Date().toISOString(),
        })
        .eq("id", ordemSelecionada.id)

      if (error) {
        throw error
      }

      // Registrar no histórico
      const historicoItem = {
        ordem_id: ordemSelecionada.id,
        data: new Date().toISOString(),
        status_anterior: ordemSelecionada.status_pedido || "Em aprovação",
        status_novo: "Aguardando Fornecedor", // Changed from "Enviado para Compras" to "Aguardando Fornecedor"
        observacao: observacao,
        usuario: userData?.nome || "Usuário Atual",
      }

      const { error: errorHistorico } = await supabase.from("historico_pedidos").insert(historicoItem)

      if (errorHistorico) {
        throw errorHistorico
      }

      toast({
        title: "Sucesso",
        description: "Solicitação enviada para compras com sucesso!",
      })

      // Atualizar a lista de ordens
      fetchOrdens()

      // Limpar estados
      setObservacao("")
      setEnviarComprasDialogOpen(false)
    } catch (error) {
      console.error("Erro ao enviar para compras:", error)
      toast({
        title: "Erro",
        description: "Não foi possível enviar a solicitação para compras.",
        variant: "destructive",
      })
    } finally {
      setProcessando(false)
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

  // Obter a cor do badge com base no status
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case "Em aprovação":
        return "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
      case "Finalizado":
        return "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
      case "Recusado": // Changed from "Rejeitado pelo Almoxarifado" to "Recusado"
        return "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
      case "Aguardando Fornecedor": // Changed from "Enviado para Compras" to "Aguardando Fornecedor"
        return "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
      default:
        return "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  // Filtrar ordens de serviço
  const ordensFiltradas = ordens.filter((ordem) => {
    // Aplicar filtro de busca
    const matchBusca =
      (ordem.veiculo?.toLowerCase() || "").includes(busca.toLowerCase()) ||
      (ordem.solicitante?.toLowerCase() || "").includes(busca.toLowerCase()) ||
      (ordem.mecanico?.toLowerCase() || "").includes(busca.toLowerCase()) ||
      (ordem.servicos_solicitados?.toLowerCase() || "").includes(busca.toLowerCase())

    // Aplicar filtro de tab
    if (tabAtiva === "pendentes") {
      return matchBusca && (!ordem.status_pedido || ordem.status_pedido === "Em aprovação") // Alterado de "Em análise" para "Em aprovação"
    } else if (tabAtiva === "atendidos") {
      return matchBusca && ordem.status_pedido === "Finalizado"
    } else if (tabAtiva === "rejeitados") {
      return matchBusca && ordem.status_pedido === "Recusado"
    } else if (tabAtiva === "enviados") {
      return matchBusca && ordem.status_pedido === "Aguardando Fornecedor"
    }

    return matchBusca
  })

  // Filtrar produtos para o seletor
  const produtosFiltrados = produtos
    .filter((produto) => produto.nome.toLowerCase().includes(produtoSearch.toLowerCase()))
    .slice(0, 10) // Limitar a 10 resultados para melhor performance

  return (
    <LayoutAutenticado>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Almoxarifado</h2>
          <p className="text-muted-foreground">Gerencie as solicitações de peças e materiais.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full max-w-xl">
            <div className="relative w-full max-w-2xl">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar solicitações..."
                className="pl-8"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
          </div>
          <Button onClick={fetchOrdens}>Atualizar</Button>
        </div>

        <Tabs defaultValue="pendentes" value={tabAtiva} onValueChange={setTabAtiva}>
          <TabsList className="mb-4">
            <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
            <TabsTrigger value="atendidos">Atendidos</TabsTrigger>
            <TabsTrigger value="rejeitados">Rejeitados</TabsTrigger>
            <TabsTrigger value="enviados">Enviados para Compras</TabsTrigger>
          </TabsList>

          <TabsContent value="pendentes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Solicitações Pendentes</CardTitle>
                <CardDescription>Solicitações aguardando análise do almoxarifado.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Solicitante</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
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
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={getStatusBadgeClass(ordem.status_pedido || "Em análise")}
                            >
                              {ordem.status_pedido || "Em análise"}
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
                                    setOrdemSelecionada(ordem)
                                    setObservacao("")
                                    setAtenderDialogOpen(true)
                                  }}
                                >
                                  <CheckCircle className="mr-2 h-4 w-4" />
                                  <span>Atender</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="flex items-center cursor-pointer"
                                  onClick={() => {
                                    setOrdemSelecionada(ordem)
                                    setObservacao("")
                                    setRejeitarDialogOpen(true)
                                  }}
                                >
                                  <XCircle className="mr-2 h-4 w-4" />
                                  <span>Rejeitar</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="flex items-center cursor-pointer"
                                  onClick={() => {
                                    setOrdemSelecionada(ordem)
                                    setObservacao("")
                                    setEnviarComprasDialogOpen(true)
                                  }}
                                >
                                  <ShoppingCart className="mr-2 h-4 w-4" />
                                  <span>Enviar para Compras</span>
                                </DropdownMenuItem>
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
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          Nenhuma solicitação pendente encontrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="atendidos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Solicitações Atendidas</CardTitle>
                <CardDescription>Solicitações atendidas pelo almoxarifado.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Solicitante</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
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
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={getStatusBadgeClass(ordem.status_pedido || "Em análise")}
                            >
                              {ordem.status_pedido || "Em análise"}
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
                                    setOrdemSelecionada(ordem)
                                    fetchHistoricoPedido(ordem.id)
                                    setHistoricoDialogOpen(true)
                                  }}
                                >
                                  <History className="mr-2 h-4 w-4" />
                                  <span>Histórico</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          Nenhuma solicitação atendida encontrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rejeitados" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Solicitações Rejeitadas</CardTitle>
                <CardDescription>Solicitações rejeitadas pelo almoxarifado.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Solicitante</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
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
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={getStatusBadgeClass(ordem.status_pedido || "Em análise")}
                            >
                              {ordem.status_pedido || "Em análise"}
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
                                    setOrdemSelecionada(ordem)
                                    fetchHistoricoPedido(ordem.id)
                                    setHistoricoDialogOpen(true)
                                  }}
                                >
                                  <History className="mr-2 h-4 w-4" />
                                  <span>Histórico</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          Nenhuma solicitação rejeitada encontrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="enviados" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Enviados para Compras</CardTitle>
                <CardDescription>Solicitações enviadas para o setor de compras.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Veículo</TableHead>
                      <TableHead>Solicitante</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
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
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={getStatusBadgeClass(ordem.status_pedido || "Em análise")}
                            >
                              {ordem.status_pedido || "Em análise"}
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
                                    setOrdemSelecionada(ordem)
                                    fetchHistoricoPedido(ordem.id)
                                    setHistoricoDialogOpen(true)
                                  }}
                                >
                                  <History className="mr-2 h-4 w-4" />
                                  <span>Histórico</span>
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="h-24 text-center">
                          Nenhuma solicitação enviada para compras encontrada.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Diálogo para Visualizar Ordem */}
      <Dialog open={visualizarDialogOpen} onOpenChange={setVisualizarDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Solicitação</DialogTitle>
            <DialogDescription>Informações completas da solicitação de materiais.</DialogDescription>
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
                    className={getStatusBadgeClass(ordemSelecionada.status_pedido || "Em aprovação")}
                  >
                    {ordemSelecionada.status_pedido || "Em aprovação"}
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
                <div className="p-3 bg-gray-50 rounded-md min-h-[80px] dark:bg-gray-800">
                  {ordemSelecionada.defeitos || "Nenhum defeito registrado."}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Peças/Serviços Solicitados</h3>
                <div className="p-3 bg-gray-50 rounded-md min-h-[80px] dark:bg-gray-800">
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

      {/* Diálogo para Atender Solicitação */}
      <Dialog open={atenderDialogOpen} onOpenChange={setAtenderDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Atender Solicitação</DialogTitle>
            <DialogDescription>Registre as saídas de estoque para atender a solicitação.</DialogDescription>
          </DialogHeader>
          {ordemSelecionada && (
            <div className="grid gap-6 py-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Veículo: {ordemSelecionada.veiculo}</h3>
                <p className="text-sm text-muted-foreground mb-4">Solicitante: {ordemSelecionada.solicitante}</p>
                <div className="p-3 bg-gray-50 rounded-md mb-4 dark:bg-gray-800">
                  <h4 className="text-sm font-medium mb-1">Peças/Serviços Solicitados:</h4>
                  <p className="text-sm">
                    {ordemSelecionada.servicos_solicitados || "Nenhum serviço ou peça solicitado."}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="text-sm font-medium mb-4">Registrar Saídas de Estoque</h3>

                <div className="grid grid-cols-1 md:grid-cols-[3fr,1fr,auto] gap-3 mb-4 items-end">
                  <div>
                    <Label htmlFor="produto" className="mb-2 block">
                      Produto
                    </Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between"
                          disabled={loadingProdutos}
                        >
                          {loadingProdutos ? (
                            <span className="flex items-center">
                              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                              Carregando produtos...
                            </span>
                          ) : produtoSelecionado ? (
                            produtos.find((produto) => produto.id === produtoSelecionado)?.nome
                          ) : (
                            "Selecione um produto"
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                        <Command>
                          <CommandInput placeholder="Buscar produto..." />
                          <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                          <CommandGroup>
                            <CommandList>
                              {produtos.map((produto) => (
                                <CommandItem
                                  key={produto.id}
                                  value={produto.nome}
                                  onSelect={() => {
                                    setProdutoSelecionado(produto.id)
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      produtoSelecionado === produto.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span>{produto.nome}</span>
                                    <span className="text-xs text-muted-foreground">
                                      {produto.categoria} - Estoque: {produto.quantidade} {produto.unidade}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandList>
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label htmlFor="quantidade" className="mb-2 block">
                      Quantidade
                    </Label>
                    <Input
                      id="quantidade"
                      type="number"
                      min="1"
                      value={quantidadeSaida}
                      onChange={(e) => setQuantidadeSaida(Number.parseInt(e.target.value) || 1)}
                    />
                  </div>

                  <div className="flex items-end">
                    <Button onClick={adicionarItemSaida} className="flex items-center">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Adicionar
                    </Button>
                  </div>
                </div>

                {itensSaida.length > 0 ? (
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produto</TableHead>
                          <TableHead>Quantidade</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {itensSaida.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>{item.produto_nome}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="bg-red-50 text-red-700">
                                {item.quantidade} {item.unidade}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removerItemSaida(index)}
                                className="h-8 w-8 p-0"
                              >
                                <MinusCircle className="h-4 w-4 text-red-500" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground border rounded-md">
                    Nenhum item adicionado. Adicione pelo menos um item para continuar.
                  </div>
                )}
              </div>

              <div className="grid gap-2 mt-4">
                <Label htmlFor="observacao">Observação</Label>
                <Textarea
                  id="observacao"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Adicione uma observação sobre o atendimento"
                  className="min-h-[100px]"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAtenderDialogOpen(false)
                setItensSaida([])
                setProdutoSelecionado(null)
                setQuantidadeSaida(1)
              }}
              disabled={processando}
            >
              Cancelar
            </Button>
            <Button onClick={handleAtenderSolicitacao} disabled={processando || itensSaida.length === 0}>
              {processando ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                  Processando...
                </>
              ) : (
                "Confirmar Atendimento"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para Rejeitar Solicitação */}
      <Dialog open={rejeitarDialogOpen} onOpenChange={setRejeitarDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Rejeitar Solicitação</DialogTitle>
            <DialogDescription>Confirme a rejeição da solicitação pelo almoxarifado.</DialogDescription>
          </DialogHeader>
          {ordemSelecionada && (
            <div className="grid gap-6 py-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Veículo: {ordemSelecionada.veiculo}</h3>
                <p className="text-sm text-muted-foreground mb-4">Solicitante: {ordemSelecionada.solicitante}</p>
                <div className="p-3 bg-gray-50 rounded-md mb-4 dark:bg-gray-800">
                  <h4 className="text-sm font-medium mb-1">Peças/Serviços Solicitados:</h4>
                  <p className="text-sm">
                    {ordemSelecionada.servicos_solicitados || "Nenhum serviço ou peça solicitado."}
                  </p>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="observacao">Motivo da Rejeição (Obrigatório)</Label>
                <Textarea
                  id="observacao"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Informe o motivo da rejeição"
                  className="min-h-[100px]"
                  required
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejeitarDialogOpen(false)} disabled={processando}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejeitarSolicitacao}
              disabled={processando || !observacao.trim()}
            >
              {processando ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                  Processando...
                </>
              ) : (
                "Confirmar Rejeição"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para Enviar para Compras */}
      <Dialog open={enviarComprasDialogOpen} onOpenChange={setEnviarComprasDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Enviar para Compras</DialogTitle>
            <DialogDescription>Confirme o envio da solicitação para o setor de compras.</DialogDescription>
          </DialogHeader>
          {ordemSelecionada && (
            <div className="grid gap-6 py-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Veículo: {ordemSelecionada.veiculo}</h3>
                <p className="text-sm text-muted-foreground mb-4">Solicitante: {ordemSelecionada.solicitante}</p>
                <div className="p-3 bg-gray-50 rounded-md mb-4 dark:bg-gray-800">
                  <h4 className="text-sm font-medium mb-1">Peças/Serviços Solicitados:</h4>
                  <p className="text-sm">
                    {ordemSelecionada.servicos_solicitados || "Nenhum serviço ou peça solicitado."}
                  </p>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="observacao">Observação</Label>
                <Textarea
                  id="observacao"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Adicione uma observação para o setor de compras"
                  className="min-h-[100px]"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnviarComprasDialogOpen(false)} disabled={processando}>
              Cancelar
            </Button>
            <Button onClick={handleEnviarParaCompras} disabled={processando}>
              {processando ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                  Processando...
                </>
              ) : (
                "Enviar para Compras"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para Visualizar Histórico */}
      <Dialog open={historicoDialogOpen} onOpenChange={setHistoricoDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico da Solicitação</DialogTitle>
            <DialogDescription>Histórico completo de alterações e observações da solicitação.</DialogDescription>
          </DialogHeader>
          {ordemSelecionada && (
            <div className="py-4">
              <div className="mb-4">
                <h3 className="text-sm font-medium">Solicitação para o veículo: {ordemSelecionada.veiculo}</h3>
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
                            {item.status_anterior || "Nova Solicitação"}
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
                        <div className="mt-1 p-2 bg-gray-50 rounded-md text-sm dark:bg-gray-800">
                          {item.observacao || "Nenhuma observação registrada."}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum histórico encontrado para esta solicitação.
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

