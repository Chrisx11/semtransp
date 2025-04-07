"use client"

import type React from "react"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Search } from "lucide-react"
import { supabase } from "@/lib/supabase"

// Lista de categorias de produtos em ordem alfabética
const categoriasProdutos = [
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

interface Produto {
  id: number
  nome: string
  categoria: string
  quantidade: number
  unidade: string
  localizacao: string
  compatibilidade: VeiculoCompativel[]
  similares: ProdutoSimilar[]
}

interface EditarProdutoProps {
  produto: Produto | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (produto: Produto) => void
}

export function EditarProduto({ produto, open, onOpenChange, onSave }: EditarProdutoProps) {
  const [formData, setFormData] = useState<Produto | null>(null)
  const [veiculosBusca, setVeiculosBusca] = useState("")
  const [veiculosResultados, setVeiculosResultados] = useState<VeiculoCompativel[]>([])
  const [produtosBusca, setProdutosBusca] = useState("")
  const [produtosResultados, setProdutosResultados] = useState<ProdutoSimilar[]>([])
  const [buscandoVeiculos, setBuscandoVeiculos] = useState(false)
  const [buscandoProdutos, setBuscandoProdutos] = useState(false)
  const [categoriaOriginal, setCategoriaOriginal] = useState<string>("")

  useEffect(() => {
    if (produto) {
      setFormData({ ...produto })
      setCategoriaOriginal(produto.categoria)
      if (open) {
        fetchProdutoAtualizado(produto.id)
      }
    }
  }, [produto, open])

  const fetchProdutoAtualizado = async (id: number) => {
    try {
      const { data, error } = await supabase.from("produtos").select("*").eq("id", id).single()

      if (error) {
        throw error
      }

      if (data) {
        setFormData({
          ...data,
          compatibilidade: data.compatibilidade || [],
          similares: data.similares || [],
        })
        setCategoriaOriginal(data.categoria)
      }
    } catch (error) {
      console.error("Erro ao buscar produto atualizado:", error)
    }
  }

  useEffect(() => {
    if (veiculosBusca.length >= 2) {
      buscarVeiculos()
    } else {
      setVeiculosResultados([])
    }
  }, [veiculosBusca])

  useEffect(() => {
    if (produtosBusca.length >= 2 && formData?.categoria) {
      buscarProdutos()
    } else {
      setProdutosResultados([])
    }
  }, [produtosBusca, formData?.categoria])

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
        const veiculosFiltrados = data.filter((veiculo) => !formData?.compatibilidade.some((v) => v.id === veiculo.id))
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
        .eq("categoria", formData?.categoria || "") // Filtrar apenas produtos da mesma categoria
        .neq("id", formData?.id || 0) // Excluir o produto atual
        .limit(5)

      if (error) throw error

      if (data) {
        // Filtrar produtos que já estão na lista de similares
        const produtosFiltrados = data.filter((produto) => !formData?.similares.some((p) => p.id === produto.id))
        setProdutosResultados(produtosFiltrados)
      }
    } catch (error) {
      console.error("Erro ao buscar produtos:", error)
    } finally {
      setBuscandoProdutos(false)
    }
  }

  if (!formData) return null

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev!,
      [name]: value,
    }))
  }

  const handleNumberInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    const numericValue = Number.parseFloat(value)

    if (!isNaN(numericValue)) {
      setFormData((prev) => ({
        ...prev!,
        [name]: numericValue,
      }))
    } else if (value === "") {
      setFormData((prev) => ({
        ...prev!,
        [name]: 0,
      }))
    }
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev!,
      [name]: value,
    }))

    // Se a categoria mudar, limpar a lista de produtos similares
    if (name === "categoria" && value !== categoriaOriginal) {
      setFormData((prev) => ({
        ...prev!,
        similares: [],
      }))
      setProdutosBusca("")
      setProdutosResultados([])
    }
  }

  const adicionarVeiculo = (veiculo: VeiculoCompativel) => {
    setFormData((prev) => ({
      ...prev!,
      compatibilidade: [...prev!.compatibilidade, veiculo],
    }))
    setVeiculosBusca("")
    setVeiculosResultados([])
  }

  const removerVeiculo = (id: number) => {
    setFormData((prev) => ({
      ...prev!,
      compatibilidade: prev!.compatibilidade.filter((v) => v.id !== id),
    }))
  }

  const adicionarProdutoSimilar = (produto: ProdutoSimilar) => {
    setFormData((prev) => ({
      ...prev!,
      similares: [...prev!.similares, produto],
    }))
    setProdutosBusca("")
    setProdutosResultados([])
  }

  const removerProdutoSimilar = (id: number) => {
    setFormData((prev) => ({
      ...prev!,
      similares: prev!.similares.filter((p) => p.id !== id),
    }))
  }

  const handleSubmit = () => {
    onSave(formData)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1000px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Produto</DialogTitle>
          <DialogDescription>Atualize as informações do produto abaixo.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid gap-2">
            <Label htmlFor="nome">Descrição</Label>
            <Input id="nome" name="nome" value={formData.nome} onChange={handleInputChange} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="categoria">Categoria</Label>
            <Select value={formData.categoria} onValueChange={(value) => handleSelectChange("categoria", value)}>
              <SelectTrigger>
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
            {formData.categoria !== categoriaOriginal && formData.similares.length > 0 && (
              <div className="text-amber-600 text-sm mt-1">
                Atenção: Ao mudar a categoria, todos os produtos similares serão removidos.
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="quantidade">Estoque Inicial</Label>
            <Input
              id="quantidade"
              name="quantidade"
              type="number"
              min="0"
              step="1"
              value={formData.quantidade}
              onChange={handleNumberInputChange}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="unidade">Unidade</Label>
            <Select value={formData.unidade} onValueChange={(value) => handleSelectChange("unidade", value)}>
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
              value={formData.localizacao || ""}
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
              {formData.compatibilidade.length > 0 && (
                <div className="border rounded-md p-3 mt-2">
                  <h4 className="text-sm font-medium mb-2">Veículos Compatíveis</h4>
                  <div className="space-y-2">
                    {formData.compatibilidade.map((veiculo) => (
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
            <div className="text-muted-foreground mb-2 text-sm">
              Apenas produtos da categoria "{formData.categoria}" serão exibidos como similares.
            </div>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produtos similares..."
                  className="pl-8"
                  value={produtosBusca}
                  onChange={(e) => setProdutosBusca(e.target.value)}
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
              {formData.similares.length > 0 && (
                <div className="border rounded-md p-3 mt-2">
                  <h4 className="text-sm font-medium mb-2">Produtos Similares</h4>
                  <div className="space-y-2">
                    {formData.similares.map((produto) => (
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
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSubmit}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

