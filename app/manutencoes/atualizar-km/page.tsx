"use client"

import { useState, useEffect } from "react"
import LayoutAutenticado from "@/components/layout-autenticado"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
// Adicionar o ícone Trash2 na lista de imports do lucide-react
import { Search, MoreHorizontal, Eye, History, RefreshCw, Trash2 } from "lucide-react"
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
import { supabase } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

// Atualizar a interface Veiculo para incluir a cor
interface Veiculo {
  id: number
  placa: string
  modelo: string
  marca: string
  ano: string
  tipo: string
  secretaria: string
  status: string
  tipo_medicao: string
  cor?: string // Nova propriedade
  medicao_atual?: number
  ultima_atualizacao?: string
}

interface AtualizacaoKm {
  id: number
  veiculo_id: number
  medicao_anterior: number
  medicao_atual: number
  data_atualizacao: string
  usuario: string
  observacao?: string
}

export default function AtualizarKmPage() {
  const [busca, setBusca] = useState("")
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [loading, setLoading] = useState(true)

  // Estados para os diálogos
  const [visualizarDialogOpen, setVisualizarDialogOpen] = useState(false)
  const [historicoDialogOpen, setHistoricoDialogOpen] = useState(false)
  const [atualizarDialogOpen, setAtualizarDialogOpen] = useState(false)
  const [veiculoSelecionado, setVeiculoSelecionado] = useState<Veiculo | null>(null)

  // Estado para o histórico
  const [historico, setHistorico] = useState<AtualizacaoKm[]>([])
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)

  // Estado para atualização
  const [novaMedicao, setNovaMedicao] = useState<number>(0)
  const [observacao, setObservacao] = useState<string>("")
  const [salvandoAtualizacao, setSalvandoAtualizacao] = useState(false)
  const [userData, setUserData] = useState<any>(null)

  // Adicionar estados para o diálogo de confirmação de exclusão após o estado userData
  const [excluirDialogOpen, setExcluirDialogOpen] = useState(false)
  const [atualizacaoParaExcluir, setAtualizacaoParaExcluir] = useState<AtualizacaoKm | null>(null)
  const [senhaExclusao, setSenhaExclusao] = useState("")
  const [excluindo, setExcluindo] = useState(false)

  // Carregar dados do usuário logado
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

  // Carregar veículos ao iniciar
  useEffect(() => {
    fetchVeiculos()
  }, [])

  // Função para buscar veículos
  const fetchVeiculos = async () => {
    try {
      setLoading(true)

      // Buscar veículos do Supabase
      const { data, error } = await supabase.from("veiculos").select("*").order("placa", { ascending: true })

      if (error) {
        throw error
      }

      if (data) {
        // Buscar as últimas atualizações de quilometragem para cada veículo
        const veiculosComMedicao = await Promise.all(
          data.map(async (veiculo) => {
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

        setVeiculos(veiculosComMedicao)
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

  // Função para buscar histórico de atualizações
  const fetchHistorico = async (veiculoId: number) => {
    try {
      setCarregandoHistorico(true)

      const { data, error } = await supabase
        .from("atualizacoes_km")
        .select("*")
        .eq("veiculo_id", veiculoId)
        .order("data_atualizacao", { ascending: false })

      if (error) {
        throw error
      }

      setHistorico(data || [])
    } catch (error) {
      console.error("Erro ao buscar histórico:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico de atualizações.",
        variant: "destructive",
      })
      setHistorico([])
    } finally {
      setCarregandoHistorico(false)
    }
  }

  // Função para atualizar quilometragem
  const handleAtualizarKm = async () => {
    if (!veiculoSelecionado) return

    try {
      setSalvandoAtualizacao(true)

      // Validar se a nova medição é maior que a atual
      if (novaMedicao <= (veiculoSelecionado.medicao_atual || 0)) {
        toast({
          title: "Erro",
          description: `A nova ${getMedicaoLabel(veiculoSelecionado.tipo_medicao, false)} deve ser maior que a atual.`,
          variant: "destructive",
        })
        return
      }

      // Criar registro de atualização
      const atualizacao = {
        veiculo_id: veiculoSelecionado.id,
        medicao_anterior: veiculoSelecionado.medicao_atual || 0,
        medicao_atual: novaMedicao,
        data_atualizacao: new Date().toISOString(),
        usuario: userData?.nome || "Usuário do Sistema",
        observacao: observacao || null,
      }

      // Inserir no banco de dados
      const { error } = await supabase.from("atualizacoes_km").insert(atualizacao)

      if (error) {
        throw error
      }

      // Atualizar a lista local
      setVeiculos((prevVeiculos) =>
        prevVeiculos.map((veiculo) =>
          veiculo.id === veiculoSelecionado.id
            ? {
                ...veiculo,
                medicao_atual: novaMedicao,
                ultima_atualizacao: new Date().toISOString(),
              }
            : veiculo,
        ),
      )

      toast({
        title: "Sucesso",
        description: `${getMedicaoLabel(veiculoSelecionado.tipo_medicao, false)} atualizada com sucesso!`,
      })

      // Limpar e fechar
      setNovaMedicao(0)
      setObservacao("")
      setAtualizarDialogOpen(false)
    } catch (error) {
      console.error("Erro ao atualizar quilometragem:", error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a quilometragem.",
        variant: "destructive",
      })
    } finally {
      setSalvandoAtualizacao(false)
    }
  }

  // Adicionar função para excluir atualização após a função handleAtualizarKm
  const handleExcluirAtualizacao = async () => {
    if (!atualizacaoParaExcluir) return

    try {
      setExcluindo(true)

      // Verificar a senha
      if (senhaExclusao !== "@Semtransp2025") {
        toast({
          title: "Erro",
          description: "Senha incorreta. Operação não autorizada.",
          variant: "destructive",
        })
        return
      }

      // Excluir o registro
      const { error } = await supabase.from("atualizacoes_km").delete().eq("id", atualizacaoParaExcluir.id)

      if (error) {
        throw error
      }

      // Atualizar a lista de histórico
      setHistorico(historico.filter((item) => item.id !== atualizacaoParaExcluir.id))

      // Se for a última atualização, atualizar o veículo selecionado
      if (veiculoSelecionado && historico.length > 0) {
        // Encontrar a atualização mais recente após a exclusão
        const historicoAtualizado = historico.filter((item) => item.id !== atualizacaoParaExcluir.id)

        if (historicoAtualizado.length > 0) {
          // Ordenar por data (mais recente primeiro)
          historicoAtualizado.sort(
            (a, b) => new Date(b.data_atualizacao).getTime() - new Date(a.data_atualizacao).getTime(),
          )

          // Atualizar o veículo com a medição mais recente
          const medicaoMaisRecente = historicoAtualizado[0].medicao_atual
          const dataMaisRecente = historicoAtualizado[0].data_atualizacao

          setVeiculoSelecionado({
            ...veiculoSelecionado,
            medicao_atual: medicaoMaisRecente,
            ultima_atualizacao: dataMaisRecente,
          })

          // Atualizar a lista de veículos
          setVeiculos((prevVeiculos) =>
            prevVeiculos.map((veiculo) =>
              veiculo.id === veiculoSelecionado.id
                ? { ...veiculo, medicao_atual: medicaoMaisRecente, ultima_atualizacao: dataMaisRecente }
                : veiculo,
            ),
          )
        } else {
          // Se não houver mais atualizações, zerar a medição
          setVeiculoSelecionado({
            ...veiculoSelecionado,
            medicao_atual: 0,
            ultima_atualizacao: undefined,
          })

          // Atualizar a lista de veículos
          setVeiculos((prevVeiculos) =>
            prevVeiculos.map((veiculo) =>
              veiculo.id === veiculoSelecionado.id
                ? { ...veiculo, medicao_atual: 0, ultima_atualizacao: undefined }
                : veiculo,
            ),
          )
        }
      }

      toast({
        title: "Sucesso",
        description: "Registro excluído com sucesso!",
      })

      // Limpar e fechar
      setAtualizacaoParaExcluir(null)
      setSenhaExclusao("")
      setExcluirDialogOpen(false)
    } catch (error) {
      console.error("Erro ao excluir atualização:", error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir o registro.",
        variant: "destructive",
      })
    } finally {
      setExcluindo(false)
    }
  }

  // Formatar data
  const formatarData = (dataString?: string) => {
    if (!dataString) return "Nunca atualizado"

    try {
      const data = new Date(dataString)
      return format(data, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    } catch (error) {
      return dataString
    }
  }

  // Obter label para o tipo de medição
  const getMedicaoLabel = (tipoMedicao: string, plural = true) => {
    switch (tipoMedicao) {
      case "Quilometragem":
        return plural ? "Quilômetros" : "Quilometragem"
      case "Horimetro":
        return plural ? "Horas" : "Leitura do Horímetro"
      case "Meses":
        return plural ? "Meses" : "Meses de Uso"
      default:
        return plural ? "Medições" : "Medição"
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

  // Filtrar veículos com base na busca
  const veiculosFiltrados = veiculos.filter(
    (veiculo) =>
      veiculo.placa.toLowerCase().includes(busca.toLowerCase()) ||
      veiculo.modelo.toLowerCase().includes(busca.toLowerCase()) ||
      veiculo.marca.toLowerCase().includes(busca.toLowerCase()) ||
      veiculo.secretaria.toLowerCase().includes(busca.toLowerCase()),
  )

  return (
    <LayoutAutenticado>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Atualizar Quilometragem</h2>
          <p className="text-muted-foreground">Atualize e acompanhe a quilometragem dos veículos da frota.</p>
        </div>

        {/* Modificar a seção dos botões na parte superior da página */}
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
            <CardDescription>
              Selecione um veículo para atualizar sua quilometragem ou visualizar o histórico.
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
                  <TableHead>Medição Atual</TableHead>
                  <TableHead>Última Atualização</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
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
                          className="bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                        >
                          {veiculo.medicao_atual || 0} {getMedicaoUnidade(veiculo.tipo_medicao)}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatarData(veiculo.ultima_atualizacao)}</TableCell>
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
                                setVeiculoSelecionado(veiculo)
                                setVisualizarDialogOpen(true)
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              <span>Visualizar</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="flex items-center cursor-pointer"
                              onClick={() => {
                                setVeiculoSelecionado(veiculo)
                                setNovaMedicao(veiculo.medicao_atual || 0)
                                setAtualizarDialogOpen(true)
                              }}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              <span>Atualizar {getMedicaoLabel(veiculo.tipo_medicao, false)}</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="flex items-center cursor-pointer"
                              onClick={() => {
                                setVeiculoSelecionado(veiculo)
                                fetchHistorico(veiculo.id)
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
                    <TableCell colSpan={7} className="h-24 text-center">
                      Nenhum veículo encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Diálogo para Visualizar Veículo */}
      <Dialog open={visualizarDialogOpen} onOpenChange={setVisualizarDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Detalhes do Veículo</DialogTitle>
            <DialogDescription>Informações completas do veículo selecionado.</DialogDescription>
          </DialogHeader>
          {veiculoSelecionado && (
            <div className="grid gap-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Placa</h3>
                  <p className="text-base">{veiculoSelecionado.placa}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Modelo</h3>
                  <p className="text-base">{veiculoSelecionado.modelo}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Marca</h3>
                  <p className="text-base">{veiculoSelecionado.marca}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Cor</h3>
                  <p className="text-base">{veiculoSelecionado.cor || "Não informada"}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Ano</h3>
                  <p className="text-base">{veiculoSelecionado.ano}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Tipo</h3>
                  <p className="text-base">{veiculoSelecionado.tipo}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Secretaria</h3>
                  <p className="text-base">{veiculoSelecionado.secretaria}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                  <Badge
                    variant="outline"
                    className={
                      veiculoSelecionado.status === "Ativo"
                        ? "bg-green-50 text-green-700"
                        : veiculoSelecionado.status === "Manutenção"
                          ? "bg-yellow-50 text-yellow-700"
                          : "bg-red-50 text-red-700"
                    }
                  >
                    {veiculoSelecionado.status}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Tipo de Medição</h3>
                  <p className="text-base">{veiculoSelecionado.tipo_medicao}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {getMedicaoLabel(veiculoSelecionado.tipo_medicao, false)} Atual
                  </h3>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                    {veiculoSelecionado.medicao_atual || 0} {getMedicaoUnidade(veiculoSelecionado.tipo_medicao)}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground">Última Atualização</h3>
                  <p className="text-base">{formatarData(veiculoSelecionado.ultima_atualizacao)}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setVisualizarDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para Histórico de Atualizações */}
      <Dialog open={historicoDialogOpen} onOpenChange={setHistoricoDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de Atualizações</DialogTitle>
            <DialogDescription>
              {veiculoSelecionado &&
                `Histórico de atualizações de ${getMedicaoLabel(veiculoSelecionado.tipo_medicao, false).toLowerCase()} do veículo ${veiculoSelecionado.marca} ${veiculoSelecionado.modelo} (${veiculoSelecionado.placa})`}
            </DialogDescription>
          </DialogHeader>

          {/* Modificar o conteúdo do diálogo de histórico para adicionar o botão de exclusão */}
          {/* Substituir o bloco de código do histórico dentro do Dialog de Histórico de Atualizações */}
          {carregandoHistorico ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          ) : historico.length > 0 ? (
            <div className="space-y-4 py-4">
              {historico.map((item, index) => (
                <div key={index} className="border rounded-md p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <span className="text-sm font-medium">Atualização: </span>
                      <Badge
                        variant="outline"
                        className="bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-200 mr-2"
                      >
                        {item.medicao_anterior}{" "}
                        {veiculoSelecionado && getMedicaoUnidade(veiculoSelecionado.tipo_medicao)}
                      </Badge>
                      <span className="mx-1">→</span>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                        {item.medicao_atual} {veiculoSelecionado && getMedicaoUnidade(veiculoSelecionado.tipo_medicao)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{formatarData(item.data_atualizacao)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setAtualizacaoParaExcluir(item)
                          setSenhaExclusao("")
                          setExcluirDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Usuário: </span>
                    <span className="text-sm">{item.usuario}</span>
                  </div>
                  {item.observacao && (
                    <div className="mt-2">
                      <span className="text-sm font-medium">Observação: </span>
                      <div className="mt-1 p-2 bg-gray-50 rounded-md text-sm">{item.observacao}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum histórico de atualização encontrado para este veículo.
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setHistoricoDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para Atualizar Quilometragem */}
      <Dialog open={atualizarDialogOpen} onOpenChange={setAtualizarDialogOpen}>
        <DialogContent className="sm:max-w-[900px] w-[95vw]">
          <DialogHeader>
            <DialogTitle>Atualizar Quilometragem</DialogTitle>
            <DialogDescription>Selecione um veículo e atualize sua quilometragem</DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 py-4">
            {/* Seleção de veículo */}

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="veiculo_select" className="text-right">
                Veículo
              </Label>
              <div className="col-span-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" role="combobox" className="w-full justify-between">
                      {veiculoSelecionado
                        ? `${veiculoSelecionado.placa} - ${veiculoSelecionado.marca} ${veiculoSelecionado.modelo}`
                        : "Digite para buscar veículo..."}
                      <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Digite placa, marca ou modelo..." />
                      <CommandList className="max-h-[300px]">
                        <CommandEmpty>Nenhum veículo encontrado.</CommandEmpty>
                        <CommandGroup>
                          {veiculos.map((veiculo) => (
                            <CommandItem
                              key={veiculo.id}
                              value={`${veiculo.placa} ${veiculo.marca} ${veiculo.modelo}`}
                              onSelect={() => {
                                setVeiculoSelecionado(veiculo)
                                setNovaMedicao(veiculo.medicao_atual || 0)
                              }}
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{veiculo.placa}</span>
                                <span className="text-xs text-muted-foreground">
                                  {veiculo.marca} {veiculo.modelo} - {veiculo.medicao_atual || 0}{" "}
                                  {getMedicaoUnidade(veiculo.tipo_medicao)}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Mostrar os campos de atualização apenas se um veículo estiver selecionado */}
            {veiculoSelecionado && (
              <>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="medicao_atual" className="text-right">
                    {getMedicaoLabel(veiculoSelecionado.tipo_medicao, false)} Atual
                  </Label>
                  <div className="col-span-3">
                    <Badge variant="outline" className="bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                      {veiculoSelecionado.medicao_atual || 0} {getMedicaoUnidade(veiculoSelecionado.tipo_medicao)}
                    </Badge>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="nova_medicao" className="text-right">
                    Nova {getMedicaoLabel(veiculoSelecionado.tipo_medicao, false)}
                  </Label>
                  <div className="col-span-3 flex items-center gap-2">
                    <Input
                      id="nova_medicao"
                      type="number"
                      value={novaMedicao}
                      onChange={(e) => setNovaMedicao(Number(e.target.value))}
                      min={veiculoSelecionado.medicao_atual || 0}
                      className="flex-1"
                    />
                    <span className="text-sm text-muted-foreground">
                      {getMedicaoUnidade(veiculoSelecionado.tipo_medicao)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="observacao" className="text-right pt-2">
                    Observação
                  </Label>
                  <Input
                    id="observacao"
                    value={observacao}
                    onChange={(e) => setObservacao(e.target.value)}
                    placeholder="Opcional: adicione uma observação"
                    className="col-span-3"
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAtualizarDialogOpen(false)} disabled={salvandoAtualizacao}>
              Cancelar
            </Button>
            <Button
              onClick={handleAtualizarKm}
              disabled={
                salvandoAtualizacao || !veiculoSelecionado || novaMedicao <= (veiculoSelecionado?.medicao_atual || 0)
              }
            >
              {salvandoAtualizacao ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                  Salvando...
                </>
              ) : (
                "Salvar Atualização"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Adicionar o diálogo de confirmação de exclusão após o diálogo de atualização de quilometragem */}
      {/* Diálogo para Confirmar Exclusão */}
      <Dialog open={excluirDialogOpen} onOpenChange={setExcluirDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Confirmar Exclusão</DialogTitle>
            <DialogDescription>
              Digite a senha de administrador para confirmar a exclusão deste registro.
            </DialogDescription>
          </DialogHeader>

          {atualizacaoParaExcluir && (
            <div className="grid gap-6 py-4">
              <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-amber-800 dark:bg-amber-950 dark:border-amber-800 dark:text-amber-200">
                <p className="font-medium mb-2 dark:text-amber-200">Atenção: Esta ação não pode ser desfeita!</p>
                <p className="text-sm dark:text-amber-300">
                  Você está prestes a excluir o registro de atualização de{" "}
                  {veiculoSelecionado?.tipo_medicao || "quilometragem"} de:
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline" className="bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                    {atualizacaoParaExcluir.medicao_anterior}{" "}
                    {veiculoSelecionado && getMedicaoUnidade(veiculoSelecionado.tipo_medicao)}
                  </Badge>
                  <span className="mx-1">→</span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200">
                    {atualizacaoParaExcluir.medicao_atual}{" "}
                    {veiculoSelecionado && getMedicaoUnidade(veiculoSelecionado.tipo_medicao)}
                  </Badge>
                </div>
                <p className="mt-2 text-sm dark:text-amber-300">
                  Data: {formatarData(atualizacaoParaExcluir.data_atualizacao)}
                </p>
              </div>

              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="senha_exclusao" className="text-right dark:text-gray-200">
                  Senha
                </Label>
                <Input
                  id="senha_exclusao"
                  type="password"
                  value={senhaExclusao}
                  onChange={(e) => setSenhaExclusao(e.target.value)}
                  placeholder="Digite a senha de administrador"
                  className="col-span-3"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setExcluirDialogOpen(false)} disabled={excluindo}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleExcluirAtualizacao} disabled={excluindo || !senhaExclusao}>
              {excluindo ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                  Excluindo...
                </>
              ) : (
                "Excluir Registro"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </LayoutAutenticado>
  )
}

