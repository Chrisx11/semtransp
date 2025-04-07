"use client"

import type React from "react"

import { useState, useEffect } from "react"
import LayoutAutenticado from "@/components/layout-autenticado"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus, MoreHorizontal, Eye, Pencil, Trash2, X, FileText } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { supabase } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"

// Adicione os imports para os novos componentes
import { VisualizarProduto } from "@/components/visualizar-produto"
import { EditarProduto } from "@/components/editar-produto"

// Adicionar os imports necessários para gerar o PDF
import { jsPDF } from "jspdf"
// Importar a biblioteca e aplicar ao jsPDF
import autoTable from "jspdf-autotable"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

// Adicione o import do componente Switch:
import { Switch } from "@/components/ui/switch"

// Lista de categorias de produtos padrão em ordem alfabética
const categoriasProdutosPadrao = [
  "Acessórios",
  "Baterias",
  "Elétrica",
  "Ferramentas",
  "Filtros",
  "Fluidos",
  "Freios",
  "Iluminação",
  "Lubrificantes",
  "Outro",
  "Peças Automotivas",
  "Pneus",
  "Suspensão",
]

// Lista de unidades de medida
const unidadesMedida = [
  "Unidade",
  "Par",
  "Jogo",
  "Kit",
  "Litro",
  "Metro",
  "Kg",
  "Caixa",
  "Pacote",
  "Frasco 500ml",
  "Frasco 1L",
  "Galão",
]

interface VeiculoCompativel {
  id: number
  placa: string
  modelo: string
  marca: string
}

interface ProdutoSimilar {
  id: number
  nome: string
  categoria?: string
}

// Interface para Produto
interface Produto {
  id: number
  nome: string
  categoria: string
  quantidade: number
  unidade: string
  localizacao: string
  compatibilidade: VeiculoCompativel[]
  similares: ProdutoSimilar[]
  created_at?: string
  updated_at?: string
}

// Chave para armazenar categorias personalizadas no localStorage
const STORAGE_KEY = "categorias_produtos_personalizadas"

export default function ProdutosPage() {
  const [busca, setBusca] = useState("")
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [novoProduto, setNovoProduto] = useState<Omit<Produto, "id">>({
    nome: "",
    categoria: "",
    quantidade: 0,
    unidade: "Unidade",
    localizacao: "",
    compatibilidade: [],
    similares: [],
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [produtoSelecionado, setProdutoSelecionado] = useState<Produto | null>(null)
  const [visualizarDialogOpen, setVisualizarDialogOpen] = useState(false)
  const [editarDialogOpen, setEditarDialogOpen] = useState(false)
  const [veiculosBusca, setVeiculosBusca] = useState("")
  const [veiculosResultados, setVeiculosResultados] = useState<VeiculoCompativel[]>([])
  const [produtosBusca, setProdutosBusca] = useState("")
  const [produtosResultados, setProdutosResultados] = useState<ProdutoSimilar[]>([])
  const [buscandoVeiculos, setBuscandoVeiculos] = useState(false)
  const [buscandoProdutos, setBuscandoProdutos] = useState(false)
  // Altere o estado inicial de ocultarSemEstoque para true:
  const [ocultarSemEstoque, setOcultarSemEstoque] = useState(true)

  // Adicionar estados para gerenciar categorias personalizadas
  const [categoriasProdutos, setCategoriasProdutos] = useState<string[]>(categoriasProdutosPadrao)
  const [novaCategoriaDialogOpen, setNovaCategoriaDialogOpen] = useState(false)
  const [novaCategoria, setNovaCategoria] = useState("")

  // Carregar produtos e categorias personalizadas ao iniciar
  useEffect(() => {
    fetchProdutos()
    carregarCategorias()
  }, [])

  useEffect(() => {
    if (veiculosBusca.length >= 2) {
      buscarVeiculos()
    } else {
      setVeiculosResultados([])
    }
  }, [veiculosBusca])

  useEffect(() => {
    if (produtosBusca.length >= 2 && novoProduto.categoria) {
      buscarProdutos()
    } else {
      setProdutosResultados([])
    }
  }, [produtosBusca, novoProduto.categoria])

  // Função para carregar categorias do localStorage e tentar buscar do banco
  const carregarCategorias = async () => {
    // Primeiro, carregamos as categorias do localStorage (se existirem)
    if (typeof window !== "undefined") {
      try {
        const categoriasArmazenadas = localStorage.getItem(STORAGE_KEY)
        if (categoriasArmazenadas) {
          const categoriasParsed = JSON.parse(categoriasArmazenadas)
          if (Array.isArray(categoriasParsed)) {
            // Combinar categorias padrão com as armazenadas localmente
            const todasCategorias = [...new Set([...categoriasProdutosPadrao, ...categoriasParsed])].sort()
            setCategoriasProdutos(todasCategorias)
          }
        }
      } catch (error) {
        console.error("Erro ao carregar categorias do localStorage:", error)
      }
    }

    // Agora tentamos buscar categorias do banco de dados
    try {
      const { data, error } = await supabase
        .from("categorias_produtos")
        .select("nome")
        .order("nome", { ascending: true })

      // Se a tabela não existir, o erro será tratado silenciosamente
      if (error) {
        console.log("Não foi possível buscar categorias do banco:", error.message)
        return
      }

      if (data && data.length > 0) {
        // Extrair nomes das categorias
        const categoriasPersonalizadas = data.map((cat) => cat.nome)

        // Combinar categorias padrão com personalizadas e remover duplicatas
        const todasCategorias = [...new Set([...categoriasProdutosPadrao, ...categoriasPersonalizadas])].sort()
        setCategoriasProdutos(todasCategorias)

        // Atualizar também o localStorage
        if (typeof window !== "undefined") {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(categoriasPersonalizadas))
        }
      }
    } catch (error) {
      console.error("Erro ao buscar categorias:", error)
    }
  }

  const adicionarNovaCategoria = async () => {
    if (!novaCategoria.trim()) {
      toast({
        title: "Erro",
        description: "O nome da categoria não pode estar vazio.",
        variant: "destructive",
      })
      return
    }

    // Verificar se a categoria já existe na lista local
    if (categoriasProdutos.includes(novaCategoria.trim())) {
      toast({
        title: "Aviso",
        description: "Esta categoria já existe.",
        variant: "destructive",
      })
      return
    }

    // Adicionar à lista local primeiro (para garantir que funcione mesmo sem o banco)
    const novaListaCategorias = [...categoriasProdutos, novaCategoria.trim()].sort()
    setCategoriasProdutos(novaListaCategorias)

    // Definir a categoria do produto como a nova categoria
    setNovoProduto((prev) => ({
      ...prev,
      categoria: novaCategoria.trim(),
    }))

    // Salvar no localStorage
    if (typeof window !== "undefined") {
      try {
        // Obter categorias personalizadas atuais (excluindo as padrão)
        const categoriasPersonalizadas = novaListaCategorias.filter((cat) => !categoriasProdutosPadrao.includes(cat))
        localStorage.setItem(STORAGE_KEY, JSON.stringify(categoriasPersonalizadas))
      } catch (error) {
        console.error("Erro ao salvar no localStorage:", error)
      }
    }

    // Tentar salvar no banco de dados
    try {
      const { error } = await supabase.from("categorias_produtos").insert([{ nome: novaCategoria.trim() }])

      if (error) {
        // Se o erro for porque a tabela não existe, não mostramos erro para o usuário
        // já que a categoria foi adicionada localmente
        if (error.code !== "42P01") {
          // PostgreSQL code for "relation does not exist"
          console.error("Erro ao adicionar categoria no banco:", error)
        }
      }
    } catch (error) {
      console.error("Erro ao adicionar categoria no banco:", error)
      // Não mostramos erro para o usuário, pois a categoria já foi adicionada localmente
    }

    toast({
      title: "Sucesso",
      description: "Nova categoria adicionada com sucesso!",
    })

    // Fechar o diálogo e limpar o campo
    setNovaCategoriaDialogOpen(false)
    setNovaCategoria("")
  }

  const fetchProdutos = async () => {
    try {
      setLoading(true)
      console.log("Buscando produtos...")
      // Buscar produtos ordenados alfabeticamente pelo nome
      const { data, error } = await supabase.from("produtos").select("*").order("nome", { ascending: true })

      if (error) {
        console.error("Erro ao buscar produtos:", error)
        throw error
      }

      if (data) {
        console.log("Produtos encontrados:", data.length)
        // Garantir que todos os produtos tenham os campos compatibilidade e similares
        const produtosFormatados = data.map((item) => ({
          ...item,
          compatibilidade: item.compatibilidade || [],
          similares: item.similares || [],
        }))
        setProdutos(produtosFormatados)
      }
    } catch (error) {
      console.error("Erro ao buscar produtos:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os produtos.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const buscarVeiculos = async () => {
    setBuscandoVeiculos(true)
    try {
      const { data, error } = await supabase
        .from("veiculos")
        .select("id, placa, modelo, marca")
        .or(`placa.ilike.%${veiculosBusca}%,modelo.ilike.%${veiculosBusca}%,marca.ilike.%${veiculosBusca}%`)
        .limit(5)

      if (error) throw error

      if (data) {
        // Filtrar veículos que já estão na lista de compatibilidade
        const veiculosFiltrados = data.filter(
          (veiculo) => !novoProduto.compatibilidade.some((v) => v.id === veiculo.id),
        )
        setVeiculosResultados(veiculosFiltrados)
      }
    } catch (error) {
      console.error("Erro ao buscar veículos:", error)
    } finally {
      setBuscandoVeiculos(false)
    }
  }

  const buscarProdutos = async () => {
    setBuscandoProdutos(true)
    try {
      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome, categoria")
        .ilike("nome", `%${produtosBusca}%`)
        .eq("categoria", novoProduto.categoria) // Filtrar apenas produtos da mesma categoria
        .limit(5)

      if (error) throw error

      if (data) {
        // Filtrar produtos que já estão na lista de similares
        const produtosFiltrados = data.filter((produto) => !novoProduto.similares.some((p) => p.id === produto.id))
        setProdutosResultados(produtosFiltrados)
      }
    } catch (error) {
      console.error("Erro ao buscar produtos:", error)
    } finally {
      setBuscandoProdutos(false)
    }
  }

  // Filtrar produtos com base na busca e na opção de ocultar sem estoque
  const produtosFiltrados = produtos.filter(
    (produto) =>
      (produto.nome.toLowerCase().includes(busca.toLowerCase()) ||
        produto.categoria.toLowerCase().includes(busca.toLowerCase())) &&
      (!ocultarSemEstoque || produto.quantidade > 0),
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNovoProduto((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const numericValue = Number.parseFloat(value)

    if (!isNaN(numericValue)) {
      setNovoProduto((prev) => ({
        ...prev,
        [name]: numericValue,
      }))
    } else if (value === "") {
      setNovoProduto((prev) => ({
        ...prev,
        [name]: 0,
      }))
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setNovoProduto((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Se a categoria mudar, limpar a lista de produtos similares
    if (name === "categoria") {
      setNovoProduto((prev) => ({
        ...prev,
        similares: [],
      }))
      setProdutosBusca("")
      setProdutosResultados([])
    }
  }

  const adicionarVeiculo = (veiculo: VeiculoCompativel) => {
    setNovoProduto((prev) => ({
      ...prev,
      compatibilidade: [...prev.compatibilidade, veiculo],
    }))
    setVeiculosBusca("")
    setVeiculosResultados([])
  }

  const removerVeiculo = (id: number) => {
    setNovoProduto((prev) => ({
      ...prev,
      compatibilidade: prev.compatibilidade.filter((v) => v.id !== id),
    }))
  }

  const adicionarProdutoSimilar = (produto: ProdutoSimilar) => {
    setNovoProduto((prev) => ({
      ...prev,
      similares: [...prev.similares, produto],
    }))
    setProdutosBusca("")
    setProdutosResultados([])
  }

  const removerProdutoSimilar = (id: number) => {
    setNovoProduto((prev) => ({
      ...prev,
      similares: prev.similares.filter((p) => p.id !== id),
    }))
  }

  const handleSubmit = async () => {
    try {
      // Preparar dados para inserção no banco
      const produtoParaInserir = {
        nome: novoProduto.nome,
        categoria: novoProduto.categoria,
        quantidade: novoProduto.quantidade,
        unidade: novoProduto.unidade,
        localizacao: novoProduto.localizacao,
        compatibilidade: novoProduto.compatibilidade,
        similares: novoProduto.similares,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase.from("produtos").insert([produtoParaInserir]).select()

      if (error) {
        console.error("Erro detalhado:", error)
        throw error
      }

      toast({
        title: "Sucesso",
        description: "Produto cadastrado com sucesso!",
      })

      // Resetar formulário e fechar diálogo
      setNovoProduto({
        nome: "",
        categoria: "",
        quantidade: 0,
        unidade: "Unidade",
        localizacao: "",
        compatibilidade: [],
        similares: [],
      })
      setDialogOpen(false)

      // Recarregar a lista de produtos
      fetchProdutos()
    } catch (error) {
      console.error("Erro ao cadastrar produto:", error)
      toast({
        title: "Erro",
        description: "Não foi possível cadastrar o produto. Verifique o console para mais detalhes.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: number) => {
    try {
      // Verificar se existem entradas relacionadas ao produto
      const { data: entradas, error: erroEntradas } = await supabase
        .from("entradas")
        .select("id")
        .eq("produto_id", id)
        .limit(1)

      if (erroEntradas) throw erroEntradas

      // Verificar se existem saídas relacionadas ao produto
      const { data: saidas, error: erroSaidas } = await supabase
        .from("saidas")
        .select("id")
        .eq("produto_id", id)
        .limit(1)

      if (erroSaidas) throw erroSaidas

      // Se existirem entradas ou saídas, não permitir a exclusão
      if ((entradas && entradas.length > 0) || (saidas && saidas.length > 0)) {
        toast({
          title: "Não é possível excluir",
          description: "Este produto possui movimentações de estoque associadas e não pode ser excluído.",
          variant: "destructive",
        })
        return
      }

      // Se não houver entradas ou saídas, prosseguir com a exclusão
      const { error } = await supabase.from("produtos").delete().eq("id", id)

      if (error) {
        throw error
      }

      toast({
        title: "Sucesso",
        description: "Produto excluído com sucesso!",
      })

      // Atualizar a lista local
      setProdutos((prev) => prev.filter((p) => p.id !== id))
    } catch (error) {
      console.error("Erro ao excluir produto:", error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir o produto.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateProduto = async (produtoAtualizado: Produto) => {
    try {
      const { error } = await supabase
        .from("produtos")
        .update({
          nome: produtoAtualizado.nome,
          categoria: produtoAtualizado.categoria,
          quantidade: produtoAtualizado.quantidade,
          unidade: produtoAtualizado.unidade,
          localizacao: produtoAtualizado.localizacao,
          compatibilidade: produtoAtualizado.compatibilidade,
          similares: produtoAtualizado.similares,
          updated_at: new Date().toISOString(),
        })
        .eq("id", produtoAtualizado.id)

      if (error) {
        throw error
      }

      toast({
        title: "Sucesso",
        description: "Produto atualizado com sucesso!",
      })

      // Atualizar a lista local
      setProdutos((prev) =>
        prev.map((p) =>
          p.id === produtoAtualizado.id ? { ...produtoAtualizado, updated_at: new Date().toISOString() } : p,
        ),
      )
    } catch (error) {
      console.error("Erro ao atualizar produto:", error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o produto.",
        variant: "destructive",
      })
    }
  }

  const gerarRelatorioPDF = async () => {
    try {
      // Criar uma instância do jsPDF
      const doc = new jsPDF()

      // Adicionar título
      doc.setFontSize(18)
      doc.text("Relatório de Produtos", 14, 22)

      // Adicionar data e hora
      doc.setFontSize(10)
      const dataHora = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
      doc.text(`Gerado em: ${dataHora}`, 14, 30)

      // Buscar dados de entradas e saídas para cada produto
      const produtosComMovimentacoes = await Promise.all(
        produtos.map(async (produto) => {
          // Buscar entradas
          const { data: entradas, error: erroEntradas } = await supabase
            .from("entradas")
            .select("quantidade")
            .eq("produto_id", produto.id)

          // Buscar saídas
          const { data: saidas, error: erroSaidas } = await supabase
            .from("saidas")
            .select("quantidade")
            .eq("produto_id", produto.id)

          // Calcular totais
          const totalEntradas = entradas ? entradas.reduce((sum, entrada) => sum + entrada.quantidade, 0) : 0

          const totalSaidas = saidas ? saidas.reduce((sum, saida) => sum + saida.quantidade, 0) : 0

          return {
            ...produto,
            totalEntradas,
            totalSaidas,
          }
        }),
      )

      // Preparar dados para a tabela
      const tableColumn = ["Descrição", "Categoria", "Estoque", "Localização", "Entradas", "Saídas"]
      const tableRows = produtosComMovimentacoes.map((produto) => [
        produto.nome,
        produto.categoria,
        `${produto.quantidade} ${produto.unidade}`,
        produto.localizacao || "-",
        produto.totalEntradas.toString(),
        produto.totalSaidas.toString(),
      ])

      // Adicionar a tabela ao PDF
      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
        startY: 40,
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [60, 60, 60] },
      })

      // Adicionar rodapé
      const pageCount = (doc as any).internal.getNumberOfPages()
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10)
        doc.text("SEMTRANSP - Sistema de Gestão de Frota", 14, doc.internal.pageSize.height - 10)
      }

      // Salvar o PDF
      doc.save("relatorio-produtos.pdf")

      toast({
        title: "Sucesso",
        description: "Relatório gerado com sucesso!",
      })
    } catch (error) {
      console.error("Erro ao gerar PDF:", error)
      toast({
        title: "Erro",
        description: "Não foi possível gerar o relatório. " + (error as Error).message,
        variant: "destructive",
      })
    }
  }

  return (
    <LayoutAutenticado>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Produtos</h2>
          <p className="text-muted-foreground">Gerencie o estoque de produtos da SEMTRANSP.</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 w-full max-w-lg">
            <div className="relative w-full">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="Buscar produtos..."
                className="pl-8"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
            </div>
            {/* Substitua o elemento de checkbox pelo componente Switch: */}
            <div className="flex items-center space-x-2">
              <Switch id="ocultarSemEstoque" checked={ocultarSemEstoque} onCheckedChange={setOcultarSemEstoque} />
              <Label htmlFor="ocultarSemEstoque" className="text-sm font-medium whitespace-nowrap">
                Ocultar produtos sem estoque
              </Label>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={gerarRelatorioPDF}>
              <FileText className="mr-2 h-4 w-4" />
              Relatório
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Produto
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Cadastrar Novo Produto</DialogTitle>
                  <DialogDescription>Preencha os dados do novo produto abaixo.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="nome">Descrição</Label>
                    <Input
                      id="nome"
                      name="nome"
                      value={novoProduto.nome}
                      onChange={handleInputChange}
                      placeholder="Ex: Filtro de Óleo"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="categoria">Categoria</Label>
                    <div className="flex gap-2">
                      <Select
                        value={novoProduto.categoria}
                        onValueChange={(value) => handleSelectChange("categoria", value)}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                        <SelectContent>
                          {categoriasProdutos.map((categoria) => (
                            <SelectItem key={categoria} value={categoria}>
                              {categoria}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setNovaCategoriaDialogOpen(true)}
                        className="whitespace-nowrap"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Nova Categoria
                      </Button>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="quantidade">Estoque Inicial</Label>
                    <Input
                      id="quantidade"
                      name="quantidade"
                      type="number"
                      min="0"
                      step="1"
                      value={novoProduto.quantidade}
                      onChange={handleNumberInputChange}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="unidade">Unidade</Label>
                    <Select value={novoProduto.unidade} onValueChange={(value) => handleSelectChange("unidade", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a unidade" />
                      </SelectTrigger>
                      <SelectContent>
                        {unidadesMedida.map((unidade) => (
                          <SelectItem key={unidade} value={unidade}>
                            {unidade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="localizacao">Localização</Label>
                    <Input
                      id="localizacao"
                      name="localizacao"
                      value={novoProduto.localizacao}
                      onChange={handleInputChange}
                      placeholder="Ex: Prateleira A3, Armário 2"
                    />
                  </div>

                  {/* Seção de Compatibilidade */}
                  <div className="mt-4">
                    <h3 className="text-lg font-medium mb-2">Compatibilidade</h3>
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar veículos por placa, modelo ou marca..."
                          className="pl-8"
                          value={veiculosBusca}
                          onChange={(e) => setVeiculosBusca(e.target.value)}
                        />
                        {buscandoVeiculos && (
                          <div className="absolute right-2.5 top-2.5">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                          </div>
                        )}
                      </div>

                      {veiculosResultados.length > 0 && (
                        <div className="border rounded-md overflow-hidden">
                          <ul className="divide-y">
                            {veiculosResultados.map((veiculo) => (
                              <li
                                key={veiculo.id}
                                className="p-2 hover:bg-muted cursor-pointer flex justify-between items-center"
                                onClick={() => adicionarVeiculo(veiculo)}
                              >
                                <div>
                                  <p className="font-medium">
                                    {veiculo.marca} {veiculo.modelo}
                                  </p>
                                  <p className="text-sm text-gray-500">Placa: {veiculo.placa}</p>
                                </div>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <span className="sr-only">Adicionar</span>
                                  <span className="text-blue-600">+</span>
                                </Button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Lista de veículos compatíveis */}
                      {novoProduto.compatibilidade.length > 0 && (
                        <div className="border rounded-md p-3 mt-2">
                          <h4 className="text-sm font-medium mb-2">Veículos Compatíveis</h4>
                          <div className="space-y-2">
                            {novoProduto.compatibilidade.map((veiculo) => (
                              <div
                                key={veiculo.id}
                                className="flex items-center justify-between bg-muted p-2 rounded-md border"
                              >
                                <div>
                                  <p className="text-sm font-medium">
                                    {veiculo.marca} {veiculo.modelo}
                                  </p>
                                  <p className="text-xs text-gray-500">Placa: {veiculo.placa}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removerVeiculo(veiculo.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Seção de Produtos Similares */}
                  <div className="mt-4">
                    <h3 className="text-lg font-medium mb-2">Produtos Similares</h3>
                    {!novoProduto.categoria ? (
                      <div className="text-amber-600 mb-2 text-sm">
                        Selecione uma categoria primeiro para buscar produtos similares.
                      </div>
                    ) : (
                      <div className="text-muted-foreground mb-2 text-sm">
                        Apenas produtos da categoria "{novoProduto.categoria}" serão exibidos como similares.
                      </div>
                    )}
                    <div className="space-y-4">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar produtos similares..."
                          className="pl-8"
                          value={produtosBusca}
                          onChange={(e) => setProdutosBusca(e.target.value)}
                          disabled={!novoProduto.categoria} // Desabilitar se não houver categoria selecionada
                        />
                        {buscandoProdutos && (
                          <div className="absolute right-2.5 top-2.5">
                            <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                          </div>
                        )}
                      </div>

                      {produtosResultados.length > 0 && (
                        <div className="border rounded-md overflow-hidden">
                          <ul className="divide-y">
                            {produtosResultados.map((produto) => (
                              <li
                                key={produto.id}
                                className="p-2 hover:bg-muted cursor-pointer flex justify-between items-center"
                                onClick={() => adicionarProdutoSimilar(produto)}
                              >
                                <div>
                                  <p className="font-medium">{produto.nome}</p>
                                </div>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <span className="sr-only">Adicionar</span>
                                  <span className="text-blue-600">+</span>
                                </Button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Lista de produtos similares */}
                      {novoProduto.similares.length > 0 && (
                        <div className="border rounded-md p-3 mt-2">
                          <h4 className="text-sm font-medium mb-2">Produtos Similares</h4>
                          <div className="space-y-2">
                            {novoProduto.similares.map((produto) => (
                              <div
                                key={produto.id}
                                className="flex items-center justify-between bg-muted p-2 rounded-md border"
                              >
                                <div>
                                  <p className="text-sm font-medium">{produto.nome}</p>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removerProdutoSimilar(produto.id)}
                                  className="h-8 w-8 p-0"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="button" onClick={handleSubmit}>
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Diálogo para adicionar nova categoria */}
        <Dialog open={novaCategoriaDialogOpen} onOpenChange={setNovaCategoriaDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Adicionar Nova Categoria</DialogTitle>
              <DialogDescription>Digite o nome da nova categoria de produtos.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="novaCategoria">Nome da Categoria</Label>
                <Input
                  id="novaCategoria"
                  value={novaCategoria}
                  onChange={(e) => setNovaCategoria(e.target.value)}
                  placeholder="Ex: Ferramentas Elétricas"
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNovaCategoriaDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" onClick={adicionarNovaCategoria}>
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Produtos</CardTitle>
            <CardDescription>
              {ocultarSemEstoque
                ? `Mostrando ${produtosFiltrados.length} produtos em estoque de um total de ${produtos.length}.`
                : `Total de ${produtosFiltrados.length} produtos encontrados.`}
            </CardDescription>
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
                    <TableHead>Descrição</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Estoque</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {produtosFiltrados.map((produto) => (
                    <TableRow key={produto.id}>
                      <TableCell className="font-medium">{produto.nome}</TableCell>
                      <TableCell>{produto.categoria}</TableCell>
                      <TableCell>
                        {produto.quantidade} {produto.unidade}
                      </TableCell>
                      <TableCell>{produto.localizacao || "-"}</TableCell>
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
                                setProdutoSelecionado(produto)
                                setVisualizarDialogOpen(true)
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              <span>Visualizar</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="flex items-center cursor-pointer"
                              onClick={() => {
                                setProdutoSelecionado(produto)
                                setEditarDialogOpen(true)
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Editar</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="flex items-center text-red-600 cursor-pointer"
                              onClick={() => handleDelete(produto.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Excluir</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}

                  {produtosFiltrados.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        Nenhum produto encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <VisualizarProduto
          produto={produtoSelecionado}
          open={visualizarDialogOpen}
          onOpenChange={setVisualizarDialogOpen}
        />

        <EditarProduto
          produto={produtoSelecionado}
          open={editarDialogOpen}
          onOpenChange={setEditarDialogOpen}
          onSave={handleUpdateProduto}
        />
      </div>
      <Toaster />
    </LayoutAutenticado>
  )
}

