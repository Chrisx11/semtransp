"use client"

import { useState, useEffect } from "react"
import LayoutAutenticado from "@/components/layout-autenticado"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, MoreHorizontal, Eye, Pencil, ShoppingBag, History, AlertCircle } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

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

export default function PedidosCompraPage() {
  const [busca, setBusca] = useState("")
  // Atualizar o estado para incluir o filtro de status
  const [filtroStatus, setFiltroStatus] = useState<string | null>(null)
  const [ordensServico, setOrdensServico] = useState<OrdemServico[]>([])
  const [loading, setLoading] = useState(true)

  // Estados para os diálogos
  const [visualizarDialogOpen, setVisualizarDialogOpen] = useState(false)
  const [editarDialogOpen, setEditarDialogOpen] = useState(false)
  const [alterarStatusDialogOpen, setAlterarStatusDialogOpen] = useState(false)
  const [historicoDialogOpen, setHistoricoDialogOpen] = useState(false)
  const [ordemSelecionada, setOrdemSelecionada] = useState<OrdemServico | null>(null)
  const [editandoOrdem, setEditandoOrdem] = useState<OrdemServico | null>(null)
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const [salvandoStatus, setSalvandoStatus] = useState(false)

  // Estado para o histórico
  const [historicoPedido, setHistoricoPedido] = useState<HistoricoItem[]>([])
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)

  // Estado para alteração de status
  const [novoStatus, setNovoStatus] = useState("")
  const [observacao, setObservacao] = useState("")

  // Carregar ordens de serviço pendentes ao iniciar
  useEffect(() => {
    fetchOrdensServico()
  }, [])

  // Função para buscar ordens de serviço
  const fetchOrdensServico = async () => {
    try {
      setLoading(true)

      // Buscar ordens de serviço do Supabase com status "Pendente"
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
          status_pedido: ordem.status_pedido || "Em aprovação",
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

  // Função para alterar o status de um pedido
  const handleAlterarStatus = async () => {
    if (!ordemSelecionada || !novoStatus) return

    try {
      setSalvandoStatus(true)

      // Verificar se o status é "Recusado" para voltar para ordem de serviço
      if (novoStatus === "Recusado") {
        // Atualizar o status da ordem para "Aberta"
        const { error: errorOrdem } = await supabase
          .from("ordens_servico")
          .update({
            status: "Aberta",
            status_pedido: novoStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", ordemSelecionada.id)

        if (errorOrdem) {
          throw errorOrdem
        }
      } else if (novoStatus === "Finalizado") {
        // Atualizar o status da ordem para "Concluída"
        const { error: errorOrdem } = await supabase
          .from("ordens_servico")
          .update({
            status: "Concluída",
            status_pedido: novoStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", ordemSelecionada.id)

        if (errorOrdem) {
          throw errorOrdem
        }
      } else {
        // Atualizar apenas o status_pedido
        const { error: errorOrdem } = await supabase
          .from("ordens_servico")
          .update({
            status_pedido: novoStatus,
            updated_at: new Date().toISOString(),
          })
          .eq("id", ordemSelecionada.id)

        if (errorOrdem) {
          throw errorOrdem
        }
      }

      // Registrar no histórico
      const historicoItem = {
        ordem_id: ordemSelecionada.id,
        data: new Date().toISOString(),
        status_anterior: ordemSelecionada.status_pedido || "Em aprovação",
        status_novo: novoStatus,
        observacao: observacao,
        usuario: "Usuário Atual", // Idealmente, usar o nome do usuário logado
      }

      const { error: errorHistorico } = await supabase.from("historico_pedidos").insert(historicoItem)

      if (errorHistorico) {
        throw errorHistorico
      }

      toast({
        title: "Sucesso",
        description: "Status do pedido alterado com sucesso!",
      })

      // Atualizar a lista de ordens
      if (novoStatus === "Recusado" || novoStatus === "Finalizado") {
        setOrdensServico((prevOrdens) => prevOrdens.filter((ordem) => ordem.id !== ordemSelecionada.id))
      } else {
        setOrdensServico((prevOrdens) =>
          prevOrdens.map((ordem) =>
            ordem.id === ordemSelecionada.id ? { ...ordem, status_pedido: novoStatus } : ordem,
          ),
        )
      }

      // Limpar estados
      setNovoStatus("")
      setObservacao("")
      setAlterarStatusDialogOpen(false)
    } catch (error) {
      console.error("Erro ao alterar status do pedido:", error)
      toast({
        title: "Erro",
        description: "Não foi possível alterar o status do pedido.",
        variant: "destructive",
      })
    } finally {
      setSalvandoStatus(false)
    }
  }

  // Função para editar uma ordem
  const handleEditarOrdem = async () => {
    if (!editandoOrdem) return

    try {
      setSalvandoEdicao(true)

      const { error } = await supabase
        .from("ordens_servico")
        .update({
          servicos_solicitados: editandoOrdem.servicos_solicitados,
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
        description: "Pedido de compra atualizado com sucesso!",
      })

      setEditarDialogOpen(false)
    } catch (error) {
      console.error("Erro ao editar pedido:", error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o pedido.",
        variant: "destructive",
      })
    } finally {
      setSalvandoEdicao(false)
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
      case "Aprovado":
        return "bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300"
      case "Aguardando Fornecedor":
        return "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300"
      case "Recusado":
        return "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
      case "Aguardando OS":
        return "bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300"
      case "Fila de Serviço":
        return "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
      case "Serviço Externo":
        return "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
      case "Em Serviço":
        return "bg-cyan-50 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300"
      case "Finalizado":
        return "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
      default:
        return "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
    }
  }

  // Modificar a função de filtragem para incluir o filtro por status
  const ordensFiltradas = ordensServico.filter(
    (ordem) =>
      ((ordem.veiculo?.toLowerCase() || "").includes(busca.toLowerCase()) ||
        (ordem.solicitante?.toLowerCase() || "").includes(busca.toLowerCase()) ||
        (ordem.mecanico?.toLowerCase() || "").includes(busca.toLowerCase()) ||
        (ordem.servicos_solicitados?.toLowerCase() || "").includes(busca.toLowerCase())) &&
      (filtroStatus === null || ordem.status_pedido === filtroStatus),
  )

  return (
    <LayoutAutenticado>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pedidos de Compra</h2>
          <p className="text-muted-foreground">Gerencie os pedidos de compra para peças e materiais.</p>
        </div>

        {/* Adicionar os filtros coloridos abaixo da barra de pesquisa */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col gap-4 items-start w-full max-w-xl">
            <div className="relative w-full max-w-2xl">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar pedidos..."
                className="pl-8"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                className={`text-xs px-2 py-1 h-7 ${filtroStatus === null ? "bg-gray-100 dark:bg-gray-800" : ""}`}
                onClick={() => setFiltroStatus(null)}
              >
                Todos
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`text-xs px-2 py-1 h-7 bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950 dark:text-blue-300 dark:hover:bg-blue-900 ${filtroStatus === "Em aprovação" ? "ring-1 ring-blue-700 dark:ring-blue-400" : ""}`}
                onClick={() => setFiltroStatus("Em aprovação")}
              >
                Em aprovação
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`text-xs px-2 py-1 h-7 bg-teal-50 text-teal-700 hover:bg-teal-100 dark:bg-teal-950 dark:text-teal-300 dark:hover:bg-teal-900 ${filtroStatus === "Aprovado" ? "ring-1 ring-teal-700 dark:ring-teal-400" : ""}`}
                onClick={() => setFiltroStatus("Aprovado")}
              >
                Aprovado
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`text-xs px-2 py-1 h-7 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:bg-yellow-950 dark:text-yellow-300 dark:hover:bg-yellow-900 ${filtroStatus === "Aguardando Fornecedor" ? "ring-1 ring-yellow-700 dark:ring-yellow-400" : ""}`}
                onClick={() => setFiltroStatus("Aguardando Fornecedor")}
              >
                Aguardando Fornecedor
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`text-xs px-2 py-1 h-7 bg-purple-50 text-purple-700 hover:bg-purple-100 dark:bg-purple-950 dark:text-purple-300 dark:hover:bg-purple-900 ${filtroStatus === "Aguardando OS" ? "ring-1 ring-purple-700 dark:ring-purple-400" : ""}`}
                onClick={() => setFiltroStatus("Aguardando OS")}
              >
                Aguardando OS
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`text-xs px-2 py-1 h-7 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950 dark:text-indigo-300 dark:hover:bg-indigo-900 ${filtroStatus === "Fila de Serviço" ? "ring-1 ring-indigo-700 dark:ring-indigo-400" : ""}`}
                onClick={() => setFiltroStatus("Fila de Serviço")}
              >
                Fila de Serviço
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`text-xs px-2 py-1 h-7 bg-orange-50 text-orange-700 hover:bg-orange-100 dark:bg-orange-950 dark:text-orange-300 dark:hover:bg-orange-900 ${filtroStatus === "Serviço Externo" ? "ring-1 ring-orange-700 dark:ring-orange-400" : ""}`}
                onClick={() => setFiltroStatus("Serviço Externo")}
              >
                Serviço Externo
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`text-xs px-2 py-1 h-7 bg-cyan-50 text-cyan-700 hover:bg-cyan-100 dark:bg-cyan-950 dark:text-cyan-300 dark:hover:bg-cyan-900 ${filtroStatus === "Em Serviço" ? "ring-1 ring-cyan-700 dark:ring-cyan-400" : ""}`}
                onClick={() => setFiltroStatus("Em Serviço")}
              >
                Em Serviço
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`text-xs px-2 py-1 h-7 bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900 ${filtroStatus === "Finalizado" ? "ring-1 ring-green-700 dark:ring-green-400" : ""}`}
                onClick={() => setFiltroStatus("Finalizado")}
              >
                Finalizado
              </Button>
              <Button
                variant="outline"
                size="sm"
                className={`text-xs px-2 py-1 h-7 bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900 ${filtroStatus === "Recusado" ? "ring-1 ring-red-700 dark:ring-red-400" : ""}`}
                onClick={() => setFiltroStatus("Recusado")}
              >
                Recusado
              </Button>
            </div>
          </div>
          <Button onClick={() => fetchOrdensServico()}>
            <ShoppingBag className="mr-2 h-4 w-4" />
            Atualizar Pedidos
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pedidos de Compra</CardTitle>
            <CardDescription>Pedidos de compra pendentes enviados pelo setor de manutenção.</CardDescription>
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
                        <Badge variant="outline" className={getStatusBadgeClass(ordem.status_pedido || "Em aprovação")}>
                          {ordem.status_pedido || "Em aprovação"}
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
                              onClick={() => {
                                setOrdemSelecionada(ordem)
                                setNovoStatus("")
                                setObservacao("")
                                setAlterarStatusDialogOpen(true)
                              }}
                            >
                              <AlertCircle className="mr-2 h-4 w-4" />
                              <span>Alterar Status</span>
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
                    <TableCell colSpan={6} className="h-24 text-center">
                      Nenhum pedido de compra pendente encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Diálogo para Visualizar Pedido */}
      <Dialog open={visualizarDialogOpen} onOpenChange={setVisualizarDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Pedido de Compra</DialogTitle>
            <DialogDescription>Informações completas do pedido de compra.</DialogDescription>
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

      {/* Diálogo para Editar Pedido */}
      <Dialog open={editarDialogOpen} onOpenChange={setEditarDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Pedido de Compra</DialogTitle>
            <DialogDescription>Atualize as informações do pedido de compra.</DialogDescription>
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

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Defeitos Comunicados</h3>
                <div className="p-3 bg-gray-50 rounded-md min-h-[80px]">
                  {editandoOrdem.defeitos || "Nenhum defeito registrado."}
                </div>
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

      {/* Diálogo para Alterar Status */}
      <Dialog open={alterarStatusDialogOpen} onOpenChange={setAlterarStatusDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Alterar Status do Pedido</DialogTitle>
            <DialogDescription>Selecione o novo status e adicione uma observação sobre a alteração.</DialogDescription>
          </DialogHeader>
          {ordemSelecionada && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="status-atual" className="text-right">
                  Status Atual
                </Label>
                <div className="col-span-3">
                  <Badge
                    variant="outline"
                    className={getStatusBadgeClass(ordemSelecionada.status_pedido || "Em aprovação")}
                  >
                    {ordemSelecionada.status_pedido || "Em aprovação"}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="novo-status" className="text-right">
                  Novo Status
                </Label>
                <Select value={novoStatus} onValueChange={setNovoStatus}>
                  <SelectTrigger className="col-span-3">
                    <SelectValue placeholder="Selecione o novo status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Em aprovação">Em aprovação</SelectItem>
                    <SelectItem value="Aprovado">Aprovado</SelectItem>
                    <SelectItem value="Recusado">Recusado (Volta para Ordem de Serviço)</SelectItem>
                    <SelectItem value="Aguardando OS">Aguardando OS</SelectItem>
                    <SelectItem value="Aguardando Fornecedor">Aguardando Fornecedor</SelectItem>
                    <SelectItem value="Fila de Serviço">Fila de Serviço</SelectItem>
                    <SelectItem value="Serviço Externo">Serviço Externo</SelectItem>
                    <SelectItem value="Em Serviço">Em Serviço</SelectItem>
                    <SelectItem value="Finalizado">Finalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-4 items-start gap-4">
                <Label htmlFor="observacao" className="text-right pt-2">
                  Observação
                </Label>
                <Textarea
                  id="observacao"
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Adicione uma observação sobre a alteração de status"
                  className="col-span-3 min-h-[100px]"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlterarStatusDialogOpen(false)} disabled={salvandoStatus}>
              Cancelar
            </Button>
            <Button onClick={handleAlterarStatus} disabled={salvandoStatus || !novoStatus}>
              {salvandoStatus ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                  Salvando...
                </>
              ) : (
                "Salvar Alteração"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para Visualizar Histórico */}
      <Dialog open={historicoDialogOpen} onOpenChange={setHistoricoDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico do Pedido</DialogTitle>
            <DialogDescription>Histórico completo de alterações e observações do pedido.</DialogDescription>
          </DialogHeader>
          {ordemSelecionada && (
            <div className="py-4">
              <div className="mb-4">
                <h3 className="text-sm font-medium">Pedido para o veículo: {ordemSelecionada.veiculo}</h3>
                <p className="text-sm text-muted-foreground">
                  Aberto em: {formatarData(ordemSelecionada.data_abertura)}
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
                  Nenhum histórico encontrado para este pedido.
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

