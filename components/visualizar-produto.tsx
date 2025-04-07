"use client"

import { useState, useEffect, useMemo } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

// Adicionar interfaces para as movimentações
interface VeiculoCompativel {
  id: number
  placa: string
  modelo: string
  marca: string
}

interface ProdutoSimilar {
  id: number
  nome: string
}

interface Movimentacao {
  id: number
  tipo: "entrada" | "saida"
  data: string
  quantidade: number
  unidade: string
  responsavel?: string
  solicitante?: string
  destino?: string
  localizacao?: string
}

interface VisualizarProdutoProps {
  produto: {
    id: number
    nome: string
    categoria: string
    quantidade: number
    unidade: string
    localizacao: string
    compatibilidade: VeiculoCompativel[]
    similares: ProdutoSimilar[]
  } | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VisualizarProduto({ produto: produtoInicial, open, onOpenChange }: VisualizarProdutoProps) {
  const [produto, setProduto] = useState<VisualizarProdutoProps["produto"]>(null)
  const [loading, setLoading] = useState(false)
  const [movimentacoes, setMovimentacoes] = useState<Movimentacao[]>([])
  const [loadingMovimentacoes, setLoadingMovimentacoes] = useState(false)
  const [dataInicial, setDataInicial] = useState<Date | undefined>(
    new Date(new Date().setMonth(new Date().getMonth() - 1)),
  )
  const [dataFinal, setDataFinal] = useState<Date | undefined>(new Date())

  // Efeito para buscar dados atualizados quando o diálogo é aberto
  useEffect(() => {
    if (open && produtoInicial?.id) {
      fetchProdutoAtualizado(produtoInicial.id)
      fetchMovimentacoes(produtoInicial.id)
    } else if (!open) {
      // Limpar o produto quando o diálogo é fechado
      setProduto(null)
      setMovimentacoes([])
    }
  }, [open, produtoInicial])

  // Efeito para atualizar as movimentações quando o período muda
  useEffect(() => {
    if (produto?.id && open) {
      fetchMovimentacoes(produto.id)
    }
  }, [dataInicial, dataFinal, produto?.id, open])

  const fetchProdutoAtualizado = async (id: number) => {
    try {
      setLoading(true)
      console.log("Buscando produto atualizado:", id)

      const { data, error } = await supabase.from("produtos").select("*").eq("id", id).single()

      if (error) {
        console.error("Erro ao buscar produto:", error)
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados do produto.",
          variant: "destructive",
        })
        return
      }

      console.log("Produto atualizado:", data)

      if (data) {
        setProduto({
          ...data,
          compatibilidade: data.compatibilidade || [],
          similares: data.similares || [],
        })
      }
    } catch (error) {
      console.error("Erro ao buscar produto atualizado:", error)
    } finally {
      setLoading(false)
    }
  }

  const fetchMovimentacoes = async (produtoId: number) => {
    try {
      setLoadingMovimentacoes(true)

      // Formatar datas para ISO string
      const dataInicialISO = dataInicial ? new Date(dataInicial.setHours(0, 0, 0, 0)).toISOString() : undefined
      const dataFinalISO = dataFinal ? new Date(dataFinal.setHours(23, 59, 59, 999)).toISOString() : undefined

      // Buscar entradas
      const { data: entradas, error: erroEntradas } = await supabase
        .from("entradas")
        .select("id, quantidade, unidade, data_entrada, responsavel, localizacao")
        .eq("produto_id", produtoId)
        .gte(dataInicialISO ? "data_entrada" : "id", dataInicialISO || 0)
        .lte(dataFinalISO ? "data_entrada" : "id", dataFinalISO || "9999-12-31T23:59:59.999Z")

      if (erroEntradas) {
        console.error("Erro ao buscar entradas:", erroEntradas)
        throw erroEntradas
      }

      // Buscar saídas
      const { data: saidas, error: erroSaidas } = await supabase
        .from("saidas")
        .select("id, quantidade, unidade, data_saida, solicitante, destino")
        .eq("produto_id", produtoId)
        .gte(dataInicialISO ? "data_saida" : "id", dataInicialISO || 0)
        .lte(dataFinalISO ? "data_saida" : "id", dataFinalISO || "9999-12-31T23:59:59.999Z")

      if (erroSaidas) {
        console.error("Erro ao buscar saídas:", erroSaidas)
        throw erroSaidas
      }

      // Transformar entradas no formato de movimentações
      const entradasFormatadas: Movimentacao[] = entradas
        ? entradas.map((entrada) => ({
            id: entrada.id,
            tipo: "entrada",
            data: entrada.data_entrada,
            quantidade: entrada.quantidade,
            unidade: entrada.unidade,
            responsavel: entrada.responsavel,
            localizacao: entrada.localizacao,
            solicitante: undefined,
            destino: undefined,
          }))
        : []

      // Transformar saídas no formato de movimentações
      const saidasFormatadas: Movimentacao[] = saidas
        ? saidas.map((saida) => ({
            id: saida.id,
            tipo: "saida",
            data: saida.data_saida,
            quantidade: saida.quantidade,
            unidade: saida.unidade,
            solicitante: saida.solicitante,
            destino: saida.destino,
            responsavel: undefined,
            localizacao: undefined,
          }))
        : []

      // Combinar e ordenar por data (mais recente primeiro)
      const todasMovimentacoes = [...entradasFormatadas, ...saidasFormatadas].sort(
        (a, b) => new Date(b.data).getTime() - new Date(a.data).getTime(),
      )

      setMovimentacoes(todasMovimentacoes)
    } catch (error) {
      console.error("Erro ao buscar movimentações:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico de movimentações.",
        variant: "destructive",
      })
    } finally {
      setLoadingMovimentacoes(false)
    }
  }

  const formatarData = (dataString: string) => {
    try {
      const data = new Date(dataString)
      return format(data, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    } catch (error) {
      return dataString
    }
  }

  // Estatísticas de movimentação
  const estatisticas = useMemo(() => {
    const totalEntradas = movimentacoes.filter((m) => m.tipo === "entrada").reduce((sum, m) => sum + m.quantidade, 0)

    const totalSaidas = movimentacoes.filter((m) => m.tipo === "saida").reduce((sum, m) => sum + m.quantidade, 0)

    return {
      totalEntradas,
      totalSaidas,
      saldo: totalEntradas - totalSaidas,
    }
  }, [movimentacoes])

  if (!open) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Produto</DialogTitle>
          <DialogDescription>Informações completas do produto.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        ) : produto ? (
          <div className="py-4">
            <Card className="mb-6">
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Descrição</h3>
                    <p className="text-base font-semibold">{produto.nome}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Categoria</h3>
                    <p className="text-base">
                      <Badge variant="outline">{produto.categoria}</Badge>
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Estoque</h3>
                    <p className="text-base">
                      {produto.quantidade} {produto.unidade}
                    </p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">Localização</h3>
                    <p className="text-base">{produto.localizacao || "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Tabs defaultValue="compatibilidade" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="compatibilidade">
                  Compatibilidade ({produto.compatibilidade?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="similares">Produtos Similares ({produto.similares?.length || 0})</TabsTrigger>
                <TabsTrigger value="movimentacoes">Histórico de Movimentações</TabsTrigger>
              </TabsList>

              <TabsContent value="compatibilidade" className="mt-4">
                {produto.compatibilidade && produto.compatibilidade.length > 0 ? (
                  <div className="space-y-3">
                    {produto.compatibilidade.map((veiculo, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h4 className="text-sm font-medium">
                                {veiculo.marca} {veiculo.modelo}
                              </h4>
                              <p className="text-xs text-muted-foreground">Placa: {veiculo.placa}</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Nenhum veículo compatível registrado.</div>
                )}
              </TabsContent>

              <TabsContent value="similares" className="mt-4">
                {produto.similares && produto.similares.length > 0 ? (
                  <div className="space-y-3">
                    {produto.similares.map((similar, index) => (
                      <Card key={index}>
                        <CardContent className="p-4">
                          <h4 className="text-sm font-medium">{similar.nome}</h4>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">Nenhum produto similar registrado.</div>
                )}
              </TabsContent>

              <TabsContent value="movimentacoes" className="mt-4">
                <div className="space-y-4">
                  {/* Filtro de período */}
                  <div className="flex flex-wrap gap-4 items-center justify-between">
                    <div className="flex flex-wrap gap-2 items-center">
                      <div className="flex items-center gap-2">
                        <span className="text-sm">De:</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-[180px] justify-start text-left font-normal",
                                !dataInicial && "text-muted-foreground",
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dataInicial ? format(dataInicial, "dd/MM/yyyy") : <span>Selecione a data</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={dataInicial} onSelect={setDataInicial} initialFocus />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm">Até:</span>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-[180px] justify-start text-left font-normal",
                                !dataFinal && "text-muted-foreground",
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {dataFinal ? format(dataFinal, "dd/MM/yyyy") : <span>Selecione a data</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar mode="single" selected={dataFinal} onSelect={setDataFinal} initialFocus />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      onClick={() => {
                        setDataInicial(new Date(new Date().setMonth(new Date().getMonth() - 1)))
                        setDataFinal(new Date())
                      }}
                      size="sm"
                    >
                      Último mês
                    </Button>
                  </div>

                  {/* Estatísticas */}
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <Card>
                      <CardContent className="p-4 flex flex-col items-center justify-center">
                        <h4 className="text-sm font-medium text-muted-foreground">Total de Entradas</h4>
                        <p className="text-xl font-bold text-green-600">
                          +{estatisticas.totalEntradas} {produto.unidade}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 flex flex-col items-center justify-center">
                        <h4 className="text-sm font-medium text-muted-foreground">Total de Saídas</h4>
                        <p className="text-xl font-bold text-red-600">
                          -{estatisticas.totalSaidas} {produto.unidade}
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4 flex flex-col items-center justify-center">
                        <h4 className="text-sm font-medium text-muted-foreground">Saldo no Período</h4>
                        <p
                          className={`text-xl font-bold ${estatisticas.saldo >= 0 ? "text-green-600" : "text-red-600"}`}
                        >
                          {estatisticas.saldo >= 0 ? "+" : ""}
                          {estatisticas.saldo} {produto.unidade}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Tabela de movimentações */}
                  {loadingMovimentacoes ? (
                    <div className="flex justify-center py-8">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                    </div>
                  ) : movimentacoes.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Data</TableHead>
                          <TableHead>Tipo</TableHead>
                          <TableHead>Quantidade</TableHead>
                          <TableHead>Detalhes</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {movimentacoes.map((movimentacao) => (
                          <TableRow key={`${movimentacao.tipo}-${movimentacao.id}`}>
                            <TableCell>{formatarData(movimentacao.data)}</TableCell>
                            <TableCell>
                              {movimentacao.tipo === "entrada" ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700">
                                  Entrada
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-50 text-red-700">
                                  Saída
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {movimentacao.tipo === "entrada" ? (
                                <span className="text-green-600">
                                  +{movimentacao.quantidade} {movimentacao.unidade}
                                </span>
                              ) : (
                                <span className="text-red-600">
                                  -{movimentacao.quantidade} {movimentacao.unidade}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {movimentacao.tipo === "entrada" ? (
                                <div className="text-sm">
                                  <p>Responsável: {movimentacao.responsavel}</p>
                                  <p>Localização: {movimentacao.localizacao || "-"}</p>
                                </div>
                              ) : (
                                <div className="text-sm">
                                  <p>Solicitante: {movimentacao.solicitante}</p>
                                  <p>Destino: {movimentacao.destino}</p>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Nenhuma movimentação encontrada no período selecionado.
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">Produto não encontrado ou dados indisponíveis.</div>
        )}
      </DialogContent>
    </Dialog>
  )
}

