"use client"

import { DialogFooter } from "@/components/ui/dialog"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"

interface ConfigurarTrocaVeiculoProps {
  veiculo: {
    id: number
    placa: string
    modelo: string
    marca: string
    tipo_medicao?: string
    valor_troca?: number
    status?: string
  } | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: () => void
}

export function ConfigurarTrocaVeiculo({ veiculo, open, onOpenChange, onSave }: ConfigurarTrocaVeiculoProps) {
  const [valorTroca, setValorTroca] = useState<number>(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (veiculo && open) {
      setValorTroca(veiculo.valor_troca || 0)
    }
  }, [veiculo, open])

  if (!veiculo) return null

  const getTipoMedicaoLabel = () => {
    switch (veiculo.tipo_medicao) {
      case "Quilometragem":
        return "Quilometragem para Troca (KM)"
      case "Horimetro":
        return "Horas para Troca"
      case "Meses":
        return "Meses para Troca"
      default:
        return "Valor para Troca"
    }
  }

  const getPlaceholder = () => {
    switch (veiculo.tipo_medicao) {
      case "Quilometragem":
        return "Ex: 10000 (para 10.000 KM)"
      case "Horimetro":
        return "Ex: 250 (para 250 horas)"
      case "Meses":
        return "Ex: 6 (para 6 meses)"
      default:
        return "Informe o valor"
    }
  }

  const handleSave = async () => {
    try {
      setLoading(true)

      const { error } = await supabase
        .from("veiculos")
        .update({
          valor_troca: valorTroca,
          updated_at: new Date().toISOString(),
        })
        .eq("id", veiculo.id)

      if (error) {
        throw error
      }

      toast({
        title: "Sucesso",
        description: "Configuração de troca salva com sucesso!",
      })

      if (onSave) {
        onSave()
      }

      onOpenChange(false)
    } catch (error) {
      console.error("Erro ao salvar configuração de troca:", error)
      toast({
        title: "Erro",
        description: "Não foi possível salvar a configuração de troca.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Configurar Troca</DialogTitle>
          <DialogDescription>
            Configure o valor para cálculo de troca para o veículo {veiculo.marca} {veiculo.modelo} ({veiculo.placa})
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-6">
          <div className="flex items-center justify-between bg-card border p-4 rounded-md">
            <div>
              <h3 className="text-lg font-medium">
                {veiculo.marca} {veiculo.modelo}
              </h3>
              <p className="text-sm text-muted-foreground">Placa: {veiculo.placa}</p>
            </div>
            <Badge
              variant="outline"
              className={
                veiculo.status === "Ativo"
                  ? "bg-green-100 text-green-800"
                  : veiculo.status === "Manutenção"
                    ? "bg-yellow-100 text-yellow-800"
                    : "bg-red-100 text-red-800"
              }
            >
              {veiculo.status}
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-6">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tipo_medicao" className="text-right font-medium">
                Tipo de Medição
              </Label>
              <div className="col-span-3">
                <Badge variant="outline" className="text-base px-3 py-1">
                  {veiculo.tipo_medicao || "Quilometragem"}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="valor_troca" className="text-right font-medium">
                {getTipoMedicaoLabel()}
              </Label>
              <div className="col-span-3">
                <Input
                  id="valor_troca"
                  type="number"
                  value={valorTroca}
                  onChange={(e) => setValorTroca(Number(e.target.value))}
                  placeholder={getPlaceholder()}
                  className="text-lg"
                />
              </div>
            </div>
          </div>

          <div className="bg-card border p-4 rounded-md mt-2">
            <h4 className="font-medium mb-2">Instruções:</h4>
            {veiculo.tipo_medicao === "Quilometragem" && (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Informe a quilometragem em que deve ser realizada a próxima troca.</p>
                <p>• Este valor será usado para calcular alertas de manutenção.</p>
                <p>• Exemplo: Para uma troca a cada 10.000 km, informe "10000".</p>
              </div>
            )}
            {veiculo.tipo_medicao === "Horimetro" && (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Informe a quantidade de horas em que deve ser realizada a próxima troca.</p>
                <p>• Este valor será usado para calcular alertas de manutenção.</p>
                <p>• Exemplo: Para uma troca a cada 250 horas, informe "250".</p>
              </div>
            )}
            {veiculo.tipo_medicao === "Meses" && (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• Informe a quantidade de meses em que deve ser realizada a próxima troca.</p>
                <p>• Este valor será usado para calcular alertas de manutenção.</p>
                <p>• Exemplo: Para uma troca a cada 6 meses, informe "6".</p>
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                Salvando...
              </>
            ) : (
              "Salvar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

