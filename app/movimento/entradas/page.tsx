"use client"

import type React from "react"

import { useState, useEffect } from "react"
import LayoutAutenticado from "@/components/layout-autenticado"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus, MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react"
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

interface Produto {
  id: number
  nome: string
  unidade: string
  localizacao: string
  quantidade?: number
  categoria?: string
}

interface Entrada {
  id: number
  produto_id: number
  produto_nome: string
  quantidade: number
  unidade: string
  data_entrada: string
  responsavel: string
  localizacao: string
}

export default function EntradasPage() {
  const [busca, setBusca] = useState("")
  const [entradas, setEntradas] = useState<Entrada[]>([])
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingProdutos, setLoadingProdutos] = useState(true)
  const [salvandoEntrada, setSalvandoEntrada] = useState(false)
  const [userData, setUserData] = useState<any>(null)

  // Estados para os diálogos
  const [novaEntradaDialogOpen, setNovaEntradaDialogOpen] = useState(false)
  const [visualizarDialogOpen, setVisualizarDialogOpen] = useState(false)
  const [editarDialogOpen, setEditarDialogOpen] = useState(false)
  const [entradaSelecionada, setEntradaSelecionada] = useState<Entrada | null>(null)

  // Estados para o formulário de nova entrada
  const [novaEntrada, setNovaEntrada] = useState({
    produto_id: 0,
    quantidade: 1,
    localizacao: "",
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

  // Carregar entradas e produtos do Supabase
  useEffect(() => {
    fetchEntradas()
    fetchProdutos()
  }, [])

  const fetchEntradas = async () => {
    try {
      setLoading(true)

      // Buscar entradas do Supabase
      const { data, error } = await supabase
        .from("entradas")
        .select(`
          id, 
          quantidade, 
          unidade, 
          data_entrada, 
          responsavel, 
          localizacao, 
          produto_id, 
          produtos(nome)
        `)
        .order("data_entrada", { ascending: false })

      if (error) {
        throw error
      }

      if (data && data.length > 0) {
        // Transformar os dados para o formato esperado pelo componente
        const entradasFormatadas: Entrada[] = data.map((entrada) => ({
          id: entrada.id,
          produto_id: entrada.produto_id,
          produto_nome: entrada.produtos?.nome || "Produto não encontrado",
          quantidade: entrada.quantidade,
          unidade: entrada.unidade,
          data_entrada: entrada.data_entrada,
          responsavel: entrada.responsavel,
          localizacao: entrada.localizacao,
        }))

        setEntradas(entradasFormatadas)
      } else {
        // Se não houver dados, usar uma lista vazia
        setEntradas([])
      }
    } catch (error) {
      console.error("Erro ao buscar entradas:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar as entradas.",
        variant: "destructive",
      })

      // Em caso de erro, definir uma lista vazia
      setEntradas([])
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
        .select("id, nome, categoria, quantidade, unidade, localizacao")
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

  // Filtrar entradas com base na busca
  const entradasFiltradas = entradas.filter(
    (entrada) =>
      entrada.produto_nome.toLowerCase().includes(busca.toLowerCase()) ||
      entrada.responsavel.toLowerCase().includes(busca.toLowerCase()) ||
      entrada.localizacao.toLowerCase().includes(busca.toLowerCase()),
  )

  const formatarData = (dataString: string) => {
    try {
      const data = new Date(dataString)
      return format(data, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
    } catch (error) {
      return dataString
    }
  }

  // Funções para manipular o formulário de nova entrada
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setNovaEntrada((prev) => ({
      ...prev,
      [name]: name === "quantidade" ? Number.parseInt(value) || 0 : value,
    }))
  }

  const handleProdutoChange = (produtoId: string) => {
    const id = Number.parseInt(produtoId)
    const produtoSelecionado = produtos.find((p) => p.id === id)

    if (produtoSelecionado) {
      // Preencher automaticamente a localização com a do produto
      setNovaEntrada((prev) => ({
        ...prev,
        produto_id: id,
        localizacao: produtoSelecionado.localizacao || "",
        // Também podemos definir a unidade aqui se necessário
      }))

      // Feedback visual para o usuário
      if (produtoSelecionado.localizacao) {
        toast({
          title: "Localização preenchida",
          description: `Localização "${produtoSelecionado.localizacao}" preenchida automaticamente.`,
          variant: "default",
        })
      }
    } else {
      setNovaEntrada((prev) => ({
        ...prev,
        produto_id: id,
        localizacao: "",
      }))
    }
  }

  // Função para adicionar nova entrada
  const handleAdicionarEntrada = async () => {
    try {
      setSalvandoEntrada(true)

      if (!novaEntrada.produto_id || novaEntrada.quantidade <= 0) {
        toast({
          title: "Erro",
          description: "Por favor, selecione um produto e informe uma quantidade válida.",
          variant: "destructive",
        })
        return
      }

      // Buscar o produto selecionado
      const produtoSelecionado = produtos.find((p) => p.id === novaEntrada.produto_id)

      if (!produtoSelecionado) {
        toast({
          title: "Erro",
          description: "Produto não encontrado.",
          variant: "destructive",
        })
        return
      }

      // 1. Inserir a entrada no banco de dados
      const { data: entradaInserida, error: erroInsercao } = await supabase
        .from("entradas")
        .insert({
          produto_id: novaEntrada.produto_id,
          quantidade: novaEntrada.quantidade,
          unidade: produtoSelecionado.unidade,
          data_entrada: new Date().toISOString(),
          responsavel: userData?.nome || "Usuário Atual",
          localizacao: novaEntrada.localizacao,
        })
        .select()

      if (erroInsercao) {
        throw erroInsercao
      }

      // 2. Atualizar a quantidade do produto
      const novaQuantidade = (produtoSelecionado.quantidade || 0) + novaEntrada.quantidade

      const { error: erroAtualizacao } = await supabase
        .from("produtos")
        .update({
          quantidade: novaQuantidade,
          updated_at: new Date().toISOString(),
        })
        .eq("id", novaEntrada.produto_id)

      if (erroAtualizacao) {
        throw erroAtualizacao
      }

      // Atualizar a lista de produtos localmente
      setProdutos(
        produtos.map((produto) =>
          produto.id === novaEntrada.produto_id ? { ...produto, quantidade: novaQuantidade } : produto,
        ),
      )

      toast({
        title: "Sucesso",
        description: "Entrada registrada com sucesso!",
      })

      // Recarregar as entradas para mostrar a nova entrada
      fetchEntradas()

      // Resetar formulário e fechar diálogo
      setNovaEntrada({
        produto_id: 0,
        quantidade: 1,
        localizacao: "",
      })
      setNovaEntradaDialogOpen(false)
    } catch (error) {
      console.error("Erro ao adicionar entrada:", error)
      toast({
        title: "Erro",
        description: "Não foi possível registrar a entrada.",
        variant: "destructive",
      })
    } finally {
      setSalvandoEntrada(false)
    }
  }

  // Função para editar entrada
  const handleEditarEntrada = async () => {
    try {
      if (!entradaSelecionada) return

      // Em um sistema real, isso seria enviado para o banco de dados
      setEntradas((prev) =>
        prev.map((entrada) => (entrada.id === entradaSelecionada.id ? entradaSelecionada : entrada)),
      )

      toast({
        title: "Sucesso",
        description: "Entrada atualizada com sucesso!",
      })

      setEditarDialogOpen(false)
    } catch (error) {
      console.error("Erro ao editar entrada:", error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a entrada.",
        variant: "destructive",
      })
    }
  }

  // Função para excluir entrada
  const handleExcluirEntrada = async (id: number) => {
    try {
      // Encontrar a entrada que será excluída
      const entradaParaExcluir = entradas.find((entrada) => entrada.id === id)

      if (!entradaParaExcluir) {
        throw new Error("Entrada não encontrada")
      }

      // 1. Excluir a entrada do banco de dados
      const { error: erroExclusao } = await supabase.from("entradas").delete().eq("id", id)

      if (erroExclusao) {
        throw erroExclusao
      }

      // 2. Atualizar a lista local de entradas
      setEntradas((prev) => prev.filter((entrada) => entrada.id !== id))

      // 3. Atualizar o estoque do produto localmente
      // Encontrar o produto correspondente
      const produtoAfetado = produtos.find((produto) => produto.id === entradaParaExcluir.produto_id)

      if (produtoAfetado && produtoAfetado.quantidade !== undefined) {
        // Atualizar a quantidade do produto localmente
        setProdutos((prevProdutos) =>
          prevProdutos.map((produto) =>
            produto.id === entradaParaExcluir.produto_id
              ? { ...produto, quantidade: (produto.quantidade || 0) - entradaParaExcluir.quantidade }
              : produto,
          ),
        )
      }

      toast({
        title: "Sucesso",
        description: "Entrada excluída com sucesso!",
      })
    } catch (error) {
      console.error("Erro ao excluir entrada:", error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir a entrada.",
        variant: "destructive",
      })
    }
  }

  return (
    <LayoutAutenticado>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Entradas de Produtos</h2>
          <p className="text-muted-foreground">Gerencie as entradas de produtos no estoque.</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar entradas..."
              className="pl-8"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <Button onClick={() => setNovaEntradaDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Entrada
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Histórico de Entradas</CardTitle>
            <CardDescription>Total de {entradasFiltradas.length} entradas encontradas.</CardDescription>
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
                    <TableHead>Responsável</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entradasFiltradas.map((entrada) => (
                    <TableRow key={entrada.id}>
                      <TableCell>{formatarData(entrada.data_entrada)}</TableCell>
                      <TableCell className="font-medium">{entrada.produto_nome}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 hover:bg-green-50 hover:text-green-700"
                        >
                          +{entrada.quantidade} {entrada.unidade}
                        </Badge>
                      </TableCell>
                      <TableCell>{entrada.responsavel}</TableCell>
                      <TableCell>{entrada.localizacao}</TableCell>
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
                                setEntradaSelecionada(entrada)
                                setVisualizarDialogOpen(true)
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              <span>Visualizar</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="flex items-center cursor-pointer"
                              onClick={() => {
                                setEntradaSelecionada(entrada)
                                setEditarDialogOpen(true)
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Editar</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="flex items-center text-red-600 cursor-pointer"
                              onClick={() => handleExcluirEntrada(entrada.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Excluir</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}

                  {entradasFiltradas.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        Nenhuma entrada encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Diálogo para Nova Entrada */}
      <Dialog open={novaEntradaDialogOpen} onOpenChange={setNovaEntradaDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Registrar Nova Entrada</DialogTitle>
            <DialogDescription>Adicione um novo produto ao estoque.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
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
                      ) : novaEntrada.produto_id ? (
                        produtos.find((produto) => produto.id === novaEntrada.produto_id)?.nome
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
                                handleProdutoChange(produto.id.toString())
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  novaEntrada.produto_id === produto.id ? "opacity-100" : "opacity-0",
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
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantidade" className="text-right">
                Quantidade
              </Label>
              <Input
                id="quantidade"
                name="quantidade"
                type="number"
                min="1"
                value={novaEntrada.quantidade}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="localizacao" className="text-right">
                Localização
              </Label>
              <Input
                id="localizacao"
                name="localizacao"
                value={novaEntrada.localizacao}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovaEntradaDialogOpen(false)} disabled={salvandoEntrada}>
              Cancelar
            </Button>
            <Button onClick={handleAdicionarEntrada} disabled={salvandoEntrada}>
              {salvandoEntrada ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                  Registrando...
                </>
              ) : (
                "Registrar Entrada"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para Visualizar Entrada */}
      <Dialog open={visualizarDialogOpen} onOpenChange={setVisualizarDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Detalhes da Entrada</DialogTitle>
            <DialogDescription>Informações completas sobre a entrada de produto.</DialogDescription>
          </DialogHeader>
          {entradaSelecionada && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Data</Label>
                <div className="col-span-3">{formatarData(entradaSelecionada.data_entrada)}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Produto</Label>
                <div className="col-span-3">{entradaSelecionada.produto_nome}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Quantidade</Label>
                <div className="col-span-3">
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    +{entradaSelecionada.quantidade} {entradaSelecionada.unidade}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Responsável</Label>
                <div className="col-span-3">{entradaSelecionada.responsavel}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Localização</Label>
                <div className="col-span-3">{entradaSelecionada.localizacao}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setVisualizarDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para Editar Entrada */}
      <Dialog open={editarDialogOpen} onOpenChange={setEditarDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Entrada</DialogTitle>
            <DialogDescription>Atualize as informações da entrada de produto.</DialogDescription>
          </DialogHeader>
          {entradaSelecionada && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Data</Label>
                <div className="col-span-3">{formatarData(entradaSelecionada.data_entrada)}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Produto</Label>
                <div className="col-span-3">{entradaSelecionada.produto_nome}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-quantidade" className="text-right">
                  Quantidade
                </Label>
                <Input
                  id="edit-quantidade"
                  type="number"
                  min="1"
                  value={entradaSelecionada.quantidade}
                  onChange={(e) =>
                    setEntradaSelecionada({
                      ...entradaSelecionada,
                      quantidade: Number.parseInt(e.target.value) || 0,
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Responsável</Label>
                <div className="col-span-3">{entradaSelecionada.responsavel}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-localizacao" className="text-right">
                  Localização
                </Label>
                <Input
                  id="edit-localizacao"
                  value={entradaSelecionada.localizacao}
                  onChange={(e) =>
                    setEntradaSelecionada({
                      ...entradaSelecionada,
                      localizacao: e.target.value,
                    })
                  }
                  className="col-span-3"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditarDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditarEntrada}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </LayoutAutenticado>
  )
}

