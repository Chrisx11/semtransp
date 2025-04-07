"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"
import { Trash2, AlertTriangle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface ExcluirTrocaOleoProps {
  trocaId: number | null
  veiculoPlaca: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: () => void
}

export function ExcluirTrocaOleo({ trocaId, veiculoPlaca, open, onOpenChange, onDelete }: ExcluirTrocaOleoProps) {
  const [confirmacao, setConfirmacao] = useState("")
  const [excluindo, setExcluindo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const handleExcluir = async () => {
    if (!trocaId) return

    try {
      setExcluindo(true)
      setErro(null)

      // 1. Buscar os dados da troca de óleo antes de excluir
      const { data: trocaData, error: trocaError } = await supabase
        .from("trocas_oleo")
        .select("*")
        .eq("id", trocaId)
        .single()

      if (trocaError) throw trocaError

      // 2. Excluir os registros de saída relacionados a esta troca de óleo
      // Buscamos saídas que tenham a referência à troca de óleo na observação
      const { data: saidasData, error: saidasError } = await supabase
        .from("saidas")
        .select("id")
        .ilike("observacao", `%ID: ${trocaId}%`)

      if (saidasError) {
        console.error("Erro ao buscar saídas relacionadas:", saidasError)
      } else if (saidasData && saidasData.length > 0) {
        // Excluir todas as saídas encontradas
        const saidaIds = saidasData.map((saida) => saida.id)
        console.log(`Excluindo ${saidaIds.length} registros de saída relacionados à troca de óleo ${trocaId}`)

        const { error: deleteError } = await supabase.from("saidas").delete().in("id", saidaIds)

        if (deleteError) {
          console.error("Erro ao excluir saídas relacionadas:", deleteError)
        }
      }

      // 3. Atualizar as quantidades dos produtos no estoque

      // 3.1 Devolver o óleo principal ao estoque
      if (trocaData.produto_oleo_id) {
        // Obter a quantidade atual do produto
        const { data: produtoData, error: produtoError } = await supabase
          .from("produtos")
          .select("quantidade")
          .eq("id", trocaData.produto_oleo_id)
          .single()

        if (produtoError) {
          console.error("Erro ao buscar produto:", produtoError)
        } else {
          // Calcular a nova quantidade
          const novaQuantidade = (produtoData.quantidade || 0) + trocaData.quantidade_oleo

          // Atualizar o produto com a nova quantidade
          const { error: updateError } = await supabase
            .from("produtos")
            .update({ quantidade: novaQuantidade })
            .eq("id", trocaData.produto_oleo_id)

          if (updateError) {
            console.error("Erro ao atualizar estoque do óleo:", updateError)
          }
        }
      }

      // 3.2 Devolver os produtos adicionais ao estoque
      if (trocaData.produtos) {
        let produtosAdicionais

        // Tratar tanto string JSON quanto objeto
        if (typeof trocaData.produtos === "string") {
          try {
            produtosAdicionais = JSON.parse(trocaData.produtos)
          } catch (e) {
            console.error("Erro ao processar JSON de produtos:", e)
            produtosAdicionais = []
          }
        } else {
          produtosAdicionais = trocaData.produtos
        }

        if (Array.isArray(produtosAdicionais)) {
          for (const produto of produtosAdicionais) {
            // Obter a quantidade atual do produto
            const { data: produtoData, error: produtoError } = await supabase
              .from("produtos")
              .select("quantidade")
              .eq("id", produto.id)
              .single()

            if (produtoError) {
              console.error(`Erro ao buscar produto ${produto.id}:`, produtoError)
              continue
            }

            // Calcular a nova quantidade
            const novaQuantidade = (produtoData.quantidade || 0) + produto.quantidade

            // Atualizar o produto com a nova quantidade
            const { error: updateError } = await supabase
              .from("produtos")
              .update({ quantidade: novaQuantidade })
              .eq("id", produto.id)

            if (updateError) {
              console.error(`Erro ao atualizar estoque do produto ${produto.id}:`, updateError)
            }
          }
        }
      }

      // 4. Excluir o registro da troca de óleo
      const { error } = await supabase.from("trocas_oleo").delete().eq("id", trocaId)

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Registro de troca de óleo excluído com sucesso. Os produtos foram devolvidos ao estoque.",
      })

      // Fechar o diálogo e atualizar os dados
      onOpenChange(false)
      onDelete()
      setConfirmacao("")
    } catch (error: any) {
      console.error("Erro ao excluir troca de óleo:", error)
      setErro(error.message || "Erro desconhecido ao excluir o registro")
      toast({
        title: "Erro",
        description: "Não foi possível excluir o registro de troca de óleo: " + error.message,
        variant: "destructive",
      })
    } finally {
      setExcluindo(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Excluir Registro de Troca de Óleo</DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita. Os produtos utilizados serão devolvidos ao estoque.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Atenção</AlertTitle>
          <AlertDescription>
            Esta ação excluirá permanentemente o registro de troca de óleo do veículo {veiculoPlaca}. Os produtos
            utilizados serão devolvidos automaticamente ao estoque.
          </AlertDescription>
        </Alert>

        {erro && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{erro}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="confirmacao">
              Digite <span className="font-bold">EXCLUIR</span> para confirmar:
            </Label>
            <Input
              id="confirmacao"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              placeholder="EXCLUIR"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={excluindo}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleExcluir}
            disabled={confirmacao !== "EXCLUIR" || excluindo}
            className="gap-2"
          >
            {excluindo ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            Excluir Registro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

