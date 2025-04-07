"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface Produto {
  id: number
  nome: string
  categoria: string
  quantidade: number
  unidade: string
  localizacao: string
}

interface ProdutosPorCategoria {
  [categoria: string]: Produto[]
}

interface VisualizarVeiculoProps {
  veiculo: {
    id: number
    placa: string
    modelo: string
    marca: string
    ano: string
    tipo: string
    secretaria: string
    status: string
    renavam: string
    chassi: string
    tipo_medicao?: string
    cor?: string
    tipo_combustivel?: string // Novo campo
  } | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VisualizarVeiculo({ veiculo, open, onOpenChange }: VisualizarVeiculoProps) {
  const [produtosCompativeis, setProdutosCompativeis] = useState<Produto[]>([])
  const [produtosPorCategoria, setProdutosPorCategoria] = useState<ProdutosPorCategoria>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && veiculo) {
      buscarProdutosCompativeis(veiculo.id)
    }
  }, [open, veiculo])

  const buscarProdutosCompativeis = async (veiculoId: number) => {
    try {
      setLoading(true)

      // Buscar produtos que têm este veículo na lista de compatibilidade
      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .filter("compatibilidade", "cs", `[{"id":${veiculoId}}]`)

      if (error) {
        console.error("Erro ao buscar produtos compatíveis:", error)
        return
      }

      if (data) {
        setProdutosCompativeis(data)

        // Organizar produtos por categoria
        const porCategoria: ProdutosPorCategoria = {}
        data.forEach((produto) => {
          if (!porCategoria[produto.categoria]) {
            porCategoria[produto.categoria] = []
          }
          porCategoria[produto.categoria].push(produto)
        })

        // Ordenar produtos dentro de cada categoria por quantidade (do maior para o menor)
        Object.keys(porCategoria).forEach((categoria) => {
          porCategoria[categoria].sort((a, b) => b.quantidade - a.quantidade)
        })

        setProdutosPorCategoria(porCategoria)
      }
    } catch (error) {
      console.error("Erro ao buscar produtos compatíveis:", error)
    } finally {
      setLoading(false)
    }
  }

  if (!veiculo) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do Veículo</DialogTitle>
          <DialogDescription>Informações completas do veículo.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="detalhes" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="detalhes">Detalhes</TabsTrigger>
            <TabsTrigger value="pecas">Peças Compatíveis ({produtosCompativeis.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="detalhes" className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Placa</h3>
                <p className="text-base">{veiculo.placa}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Modelo</h3>
                <p className="text-base">{veiculo.modelo}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Marca</h3>
                <p className="text-base">{veiculo.marca}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Cor</h3>
                <p className="text-base">{veiculo.cor || "Não informada"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Ano</h3>
                <p className="text-base">{veiculo.ano}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Tipo</h3>
                <p className="text-base">{veiculo.tipo}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Secretaria</h3>
                <p className="text-base">{veiculo.secretaria}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    veiculo.status === "Ativo"
                      ? "bg-green-100 text-green-800"
                      : veiculo.status === "Manutenção"
                        ? "bg-yellow-100 text-yellow-800"
                        : "bg-red-100 text-red-800"
                  }`}
                >
                  {veiculo.status}
                </span>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Renavam</h3>
                <p className="text-base">{veiculo.renavam}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Chassi</h3>
                <p className="text-base">{veiculo.chassi}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Tipo de Medição</h3>
                <p className="text-base">{veiculo.tipo_medicao || "Quilometragem"}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground">Tipo de Combustível</h3>
                <p className="text-base">{veiculo.tipo_combustivel || "Não informado"}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pecas" className="mt-4">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            ) : produtosCompativeis.length > 0 ? (
              <Accordion type="multiple" className="w-full">
                {Object.keys(produtosPorCategoria)
                  .sort()
                  .map((categoria) => (
                    <AccordionItem key={categoria} value={categoria}>
                      <AccordionTrigger className="text-base font-medium">
                        {categoria} ({produtosPorCategoria[categoria].length})
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pt-2">
                          {produtosPorCategoria[categoria].map((produto) => (
                            <Card key={produto.id}>
                              <CardContent className="p-4">
                                <div className="flex justify-between items-center">
                                  <div>
                                    <h4 className="font-medium">{produto.nome}</h4>
                                    <div className="text-sm text-muted-foreground">
                                      <p>
                                        Estoque: {produto.quantidade} {produto.unidade}
                                      </p>
                                      <p>Localização: {produto.localizacao || "Não especificada"}</p>
                                    </div>
                                  </div>
                                  <Badge variant="outline">{produto.categoria}</Badge>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
              </Accordion>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma peça compatível encontrada para este veículo.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}

