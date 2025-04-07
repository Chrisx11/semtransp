"use client"

import type React from "react"

import { useState, useEffect } from "react"
import LayoutAutenticado from "@/components/layout-autenticado"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus, MoreHorizontal, Eye, Trash2 } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Produto {
  id: number
  nome: string
  unidade: string
  quantidade?: number
  categoria?: string
}

interface Colaborador {
  id: number
  nome: string
  cargo: string
  secretaria: string
}

interface Veiculo {
  id: number
  placa: string
  modelo: string
  marca: string
  status: string
}

interface Saida {
  id: number
  produto_id: number
  produto_nome: string
  quantidade: number
  unidade: string
  data_saida: string
  solicitante: string
  destino: string
}

export default function SaidasPage() {
  const [busca, setBusca] = useState("")
  const [saidas, setSaidas] = useState<Saida[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingProdutos, setLoadingProdutos] = useState(true)
  const [loadingColaboradores, setLoadingColaboradores] = useState(true)
  const [loadingVeiculos, setLoadingVeiculos] = useState(true)
  const [salvandoSaida, setSalvandoSaida] = useState(false)
  const [userData, setUserData] = useState<any>(null)

  // Estados para os diálogos
  const [novaSaidaDialogOpen, setNovaSaidaDialogOpen] = useState(false)
  const [visualizarDialogOpen, setVisualizarDialogOpen] = useState(false)
  const [saidaSelecionada, setSaidaSelecionada] = useState<Saida | null>(null)

  // Estados para o formulário de nova saída
  const [novaSaida, setNovaSaida] = useState({
    produto_id: 0,
    quantidade: 1,
    solicitante_id: 0,
    veiculo_id: 0,
  })

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

  // Carregar saídas, produtos, colaboradores e veículos do Supabase
  useEffect(() => {
    fetchSaidas()
    fetchProdutos()
    fetchColaboradores()
    fetchVeiculos()
  }, [])

  const fetchSaidas = async () => {
    try {
      setLoading(true)

      // 1. Primeiro, buscar todas as saídas sem tentar acessar a tabela produtos
      const { data: saidasData, error: saidasError } = await supabase
        .from("saidas")
        .select("id, quantidade, unidade, data_saida, solicitante, destino, produto_id")
        .order("data_saida", { ascending: false })

      if (saidasError) {
        throw saidasError
      }

      if (!saidasData || saidasData.length === 0) {
        setSaidas([])
        return
      }

      // 2. Buscar todos os produtos para fazer o mapeamento em memória
      const { data: produtosData, error: produtosError } = await supabase.from("produtos").select("id, nome")

      if (produtosError) {
        throw produtosError
      }

      // 3. Criar um mapa de produtos para facilitar a busca
      const produtosMap = new Map()
      if (produtosData) {
        produtosData.forEach((produto) => {
          produtosMap.set(produto.id, produto.nome)
        })
      }

      // 4. Transformar os dados para o formato esperado pelo componente
      const saidasFormatadas: Saida[] = saidasData.map((saida) => ({
        id: saida.id,
        produto_id: saida.produto_id,
        produto_nome: produtosMap.get(saida.produto_id) || "Produto não encontrado",
        quantidade: saida.quantidade,
        unidade: saida.unidade,
        data_saida: saida.data_saida,
        solicitante: saida.solicitante,
        destino: saida.destino,
      }))

      setSaidas(saidasFormatadas)
    } catch (error) {
      console.error("Erro ao buscar saídas:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar as saídas.",
        variant: "destructive",
      })

      // Em caso de erro, definir uma lista vazia
      setSaidas([])
    } finally {
      setLoading(false)
    }
  }

  const fetchProdutos = async () => {
    try {
      setLoadingProdutos(true)

      // Buscar produtos reais do Supabase
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
        // Se não houver dados, usar uma lista vazia
        setProdutos([])
      }
    } catch (error) {
      console.error("Erro ao buscar produtos:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os produtos.",
        variant: "destructive",
      })

      // Em caso de erro, definir uma lista vazia
      setProdutos([])
    } finally {
      setLoadingProdutos(false)
    }
  }

  const fetchColaboradores = async () => {
    try {
      setLoadingColaboradores(true)

      // Buscar colaboradores do Supabase
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id, nome, cargo, secretaria")
        .eq("status", "Ativo") // Apenas colaboradores ativos
        .order("nome", { ascending: true })

      if (error) {
        throw error
      }

      if (data) {
        setColaboradores(data)
      } else {
        // Se não houver dados, usar uma lista vazia
        setColaboradores([])
      }
    } catch (error) {
      console.error("Erro ao buscar colaboradores:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os colaboradores.",
        variant: "destructive",
      })

      // Em caso de erro, definir uma lista vazia
      setColaboradores([])
    } finally {
      setLoadingColaboradores(false)
    }
  }

  const fetchVeiculos = async () => {
    try {
      setLoadingVeiculos(true)

      // Buscar veículos do Supabase - removendo o filtro de status
      const { data, error } = await supabase
        .from("veiculos")
        .select("id, placa, modelo, marca, status")
        .order("placa", { ascending: true })

      if (error) {
        throw error
      }

      if (data) {
        setVeiculos(data)
      } else {
        // Se não houver dados, usar uma lista vazia
        setVeiculos([])
      }
    } catch (error) {
      console.error("Erro ao buscar veículos:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os veículos.",
        variant: "destructive",
      })

      // Em caso de erro, definir uma lista vazia
      setVeiculos([])
    } finally {
      setLoadingVeiculos(false)
    }
  }

  // Filtrar saídas com base na busca
  const saidasFiltradas = saidas.filter(
    (saida) =>
      saida.produto_nome.toLowerCase().includes(busca.toLowerCase()) ||
      saida.solicitante.toLowerCase().includes(busca.toLowerCase()) ||
      saida.destino.toLowerCase().includes(busca.toLowerCase()),
  )

  const formatarData = (dataString: string) => {
    try {
      const data = new Date(dataString)
      return format(data, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    } catch (error) {
      return dataString
    }
  }

  // Funções para manipular o formulário de nova saída
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNovaSaida((prev) => ({
      ...prev,
      [name]: name === "quantidade" ? Number.parseInt(value) || 0 : value,
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setNovaSaida((prev) => ({
      ...prev,
      [name]: Number.parseInt(value) || 0,
    }))
  }

  // Função para adicionar nova saída
  const handleAdicionarSaida = async () => {
    try {
      setSalvandoSaida(true)

      if (!novaSaida.produto_id || novaSaida.quantidade <= 0 || !novaSaida.solicitante_id || !novaSaida.veiculo_id) {
        toast({
          title: "Erro",
          description: "Por favor, preencha todos os campos obrigatórios.",
          variant: "destructive",
        })
        return
      }

      // Buscar o produto selecionado
      const produtoSelecionado = produtos.find((p) => p.id === novaSaida.produto_id)
      if (!produtoSelecionado) {
        toast({
          title: "Erro",
          description: "Produto não encontrado.",
          variant: "destructive",
        })
        return
      }

      // Verificar se há estoque suficiente
      if ((produtoSelecionado.quantidade || 0) < novaSaida.quantidade) {
        toast({
          title: "Erro",
          description: `Estoque insuficiente. Disponível: ${produtoSelecionado.quantidade} ${produtoSelecionado.unidade}`,
          variant: "destructive",
        })
        return
      }

      // Buscar o colaborador selecionado
      const colaboradorSelecionado = colaboradores.find((c) => c.id === novaSaida.solicitante_id)
      if (!colaboradorSelecionado) {
        toast({
          title: "Erro",
          description: "Colaborador não encontrado.",
          variant: "destructive",
        })
        return
      }

      // Buscar o veículo selecionado
      const veiculoSelecionado = veiculos.find((v) => v.id === novaSaida.veiculo_id)
      if (!veiculoSelecionado) {
        toast({
          title: "Erro",
          description: "Veículo não encontrado.",
          variant: "destructive",
        })
        return
      }

      // Formatar o nome do solicitante e o destino
      const nomeSolicitante = colaboradorSelecionado.nome
      const destino = `${veiculoSelecionado.marca} ${veiculoSelecionado.modelo} - Placa: ${veiculoSelecionado.placa}`

      // 1. Inserir a saída no banco de dados
      const { data: saidaInserida, error: erroInsercao } = await supabase
        .from("saidas")
        .insert({
          produto_id: novaSaida.produto_id,
          quantidade: novaSaida.quantidade,
          unidade: produtoSelecionado.unidade,
          data_saida: new Date().toISOString(),
          solicitante: nomeSolicitante,
          destino: destino,
        })
        .select()

      if (erroInsercao) {
        throw erroInsercao
      }

      // 2. Atualizar a quantidade do produto
      const novaQuantidade = (produtoSelecionado.quantidade || 0) - novaSaida.quantidade

      const { error: erroAtualizacao } = await supabase
        .from("produtos")
        .update({
          quantidade: novaQuantidade,
          updated_at: new Date().toISOString(),
        })
        .eq("id", novaSaida.produto_id)

      if (erroAtualizacao) {
        throw erroAtualizacao
      }

      // Atualizar a lista de produtos localmente
      setProdutos(
        produtos.map((produto) =>
          produto.id === novaSaida.produto_id ? { ...produto, quantidade: novaQuantidade } : produto,
        ),
      )

      toast({
        title: "Sucesso",
        description: "Saída registrada com sucesso!",
      })

      // Recarregar as saídas para mostrar a nova saída
      fetchSaidas()

      // Resetar formulário e fechar diálogo
      setNovaSaida({
        produto_id: 0,
        quantidade: 1,
        solicitante_id: 0,
        veiculo_id: 0,
      })
      setNovaSaidaDialogOpen(false)
    } catch (error) {
      console.error("Erro ao adicionar saída:", error)
      toast({
        title: "Erro",
        description: "Não foi possível registrar a saída.",
        variant: "destructive",
      })
    } finally {
      setSalvandoSaida(false)
    }
  }

  // Função para excluir saída
  const handleExcluirSaida = async (id: number) => {
    try {
      // Encontrar a saída que será excluída
      const saidaParaExcluir = saidas.find((saida) => saida.id === id)

      if (!saidaParaExcluir) {
        throw new Error("Saída não encontrada")
      }

      // 1. Excluir a saída do banco de dados
      const { error: erroExclusao } = await supabase.from("saidas").delete().eq("id", id)

      if (erroExclusao) {
        throw erroExclusao
      }

      // 2. Atualizar a lista local de saídas
      setSaidas((prev) => prev.filter((saida) => saida.id !== id))

      // 3. Atualizar o estoque do produto no banco de dados e localmente
      const produtoAfetado = produtos.find((produto) => produto.id === saidaParaExcluir.produto_id)

      if (produtoAfetado && produtoAfetado.quantidade !== undefined) {
        // Calcular a nova quantidade
        const novaQuantidade = (produtoAfetado.quantidade || 0) + saidaParaExcluir.quantidade

        // Atualizar no banco de dados
        const { error: erroAtualizacao } = await supabase
          .from("produtos")
          .update({
            quantidade: novaQuantidade,
            updated_at: new Date().toISOString(),
          })
          .eq("id", saidaParaExcluir.produto_id)

        if (erroAtualizacao) {
          throw erroAtualizacao
        }

        // Atualizar a quantidade do produto localmente
        setProdutos((prevProdutos) =>
          prevProdutos.map((produto) =>
            produto.id === saidaParaExcluir.produto_id ? { ...produto, quantidade: novaQuantidade } : produto,
          ),
        )
      }

      toast({
        title: "Sucesso",
        description: "Saída excluída com sucesso e estoque atualizado!",
      })
    } catch (error) {
      console.error("Erro ao excluir saída:", error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir a saída.",
        variant: "destructive",
      })
    }
  }

  return (
    <LayoutAutenticado>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Saídas de Produtos</h2>
          <p className="text-muted-foreground">Gerencie as saídas de produtos do estoque.</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar saídas..."
              className="pl-8"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <Button onClick={() => setNovaSaidaDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Saída
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Saídas</CardTitle>
            <CardDescription>Total de {saidasFiltradas.length} saídas encontradas.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Quantidade</TableHead>
                    <TableHead>Solicitante</TableHead>
                    <TableHead>Destino</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {saidasFiltradas.map((saida) => (
                    <TableRow key={saida.id}>
                      <TableCell>{formatarData(saida.data_saida)}</TableCell>
                      <TableCell className="font-medium">{saida.produto_nome}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-red-50 text-red-700 hover:bg-red-50 hover:text-red-700">
                          -{saida.quantidade} {saida.unidade}
                        </Badge>
                      </TableCell>
                      <TableCell>{saida.solicitante}</TableCell>
                      <TableCell>{saida.destino}</TableCell>
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
                                setSaidaSelecionada(saida)
                                setVisualizarDialogOpen(true)
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              <span>Visualizar</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="flex items-center text-red-600 cursor-pointer"
                              onClick={() => handleExcluirSaida(saida.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Excluir</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}

                  {saidasFiltradas.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        Nenhuma saída encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Diálogo para Nova Saída */}
      <Dialog open={novaSaidaDialogOpen} onOpenChange={setNovaSaidaDialogOpen}>
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <DialogTitle>Registrar Nova Saída</DialogTitle>
            <DialogDescription>Registre a saída de um produto do estoque.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Seleção de Produto */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="produto" className="text-right">
                Produto
              </Label>
              <div className="col-span-3">
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
                      ) : novaSaida.produto_id ? (
                        produtos.find((produto) => produto.id === novaSaida.produto_id)?.nome
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
                                setNovaSaida((prev) => ({
                                  ...prev,
                                  produto_id: produto.id,
                                }))
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  novaSaida.produto_id === produto.id ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{produto.nome}</span>
                                <span className="text-xs text-muted-foreground">
                                  Estoque: {produto.quantidade} {produto.unidade}
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
            </div>

            {/* Quantidade */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantidade" className="text-right">
                Quantidade
              </Label>
              <Input
                id="quantidade"
                name="quantidade"
                type="number"
                min="1"
                value={novaSaida.quantidade}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>

            {/* Seleção de Solicitante (Colaborador) */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="solicitante" className="text-right">
                Solicitante
              </Label>
              <div className="col-span-3">
                <Select
                  value={novaSaida.solicitante_id.toString()}
                  onValueChange={(value) => handleSelectChange("solicitante_id", value)}
                  disabled={loadingColaboradores}
                >
                  <SelectTrigger>
                    {loadingColaboradores ? (
                      <span className="flex items-center">
                        <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                        Carregando...
                      </span>
                    ) : (
                      <SelectValue placeholder="Selecione um colaborador" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {colaboradores.map((colaborador) => (
                      <SelectItem key={colaborador.id} value={colaborador.id.toString()}>
                        <div className="flex flex-col">
                          <span>{colaborador.nome}</span>
                          <span className="text-xs text-muted-foreground">{colaborador.cargo}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Seleção de Destino (Veículo) */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="destino" className="text-right">
                Veículo
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
                      ) : novaSaida.veiculo_id ? (
                        (() => {
                          const veiculo = veiculos.find((v) => v.id === novaSaida.veiculo_id)
                          return veiculo
                            ? `${veiculo.marca} ${veiculo.modelo} - ${veiculo.placa}`
                            : "Selecione um veículo"
                        })()
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
                        <CommandList>
                          {veiculos.map((veiculo) => (
                            <CommandItem
                              key={veiculo.id}
                              value={`${veiculo.marca} ${veiculo.modelo} ${veiculo.placa}`}
                              onSelect={() => {
                                setNovaSaida((prev) => ({
                                  ...prev,
                                  veiculo_id: veiculo.id,
                                }))
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  novaSaida.veiculo_id === veiculo.id ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <div className="flex flex-col">
                                <span>
                                  {veiculo.marca} {veiculo.modelo}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Placa: {veiculo.placa} {veiculo.status !== "Ativo" && `(${veiculo.status})`}
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
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovaSaidaDialogOpen(false)} disabled={salvandoSaida}>
              Cancelar
            </Button>
            <Button onClick={handleAdicionarSaida} disabled={salvandoSaida}>
              {salvandoSaida ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                  Registrando...
                </>
              ) : (
                "Registrar Saída"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para Visualizar Saída */}
      <Dialog open={visualizarDialogOpen} onOpenChange={setVisualizarDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Detalhes da Saída</DialogTitle>
            <DialogDescription>Informações completas sobre a saída de produto.</DialogDescription>
          </DialogHeader>
          {saidaSelecionada && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Data</Label>
                <div className="col-span-3">{formatarData(saidaSelecionada.data_saida)}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Produto</Label>
                <div className="col-span-3">{saidaSelecionada.produto_nome}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Quantidade</Label>
                <div className="col-span-3">
                  <Badge variant="outline" className="bg-red-50 text-red-700">
                    -{saidaSelecionada.quantidade} {saidaSelecionada.unidade}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Solicitante</Label>
                <div className="col-span-3">{saidaSelecionada.solicitante}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Destino</Label>
                <div className="col-span-3">{saidaSelecionada.destino}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setVisualizarDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </LayoutAutenticado>
  )
}

