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
import { ChevronsUpDown, Check } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"

// Lista atualizada de tipos de veículos
const tiposVeiculos = [
  "Automóvel",
  "Caminhão (Caminhão Rígido)",
  "Caminhonete",
  "Camioneta (SUV)",
  "Micro-ônibus",
  "Ônibus",
  "Motocicleta",
  "Motoneta",
  "Triciclo",
  "Quadriciclo",
  "Utilitário",
  "Reboque/Semi-reboque",
  "Trator de Rodas",
  "Trator de Esteiras",
  "Especial",
  "Competição",
  "Bonde/Veículo de Trilhos",
  "Sidecar",
]

// Lista de secretarias
const secretarias = [
  { value: "SEMGOV", label: "GOVERNO - SEMGOV" },
  { value: "SEMPLAD", label: "PLANEJAMENTO E ADMINISTRAÇÃO - SEMPLAD" },
  { value: "SEMFAZ", label: "FAZENDA - SEMFAZ" },
  { value: "SEMEDUC", label: "EDUCAÇÃO - SEMEDUC" },
  { value: "SEMUSA", label: "SAÚDE - SEMUSA" },
  { value: "SEMTHRAB", label: "ASSISTÊNCIA SOCIAL, TRABALHO E HABITAÇÃO - SEMTHRAB" },
  { value: "SEMOSP", label: "OBRAS E SERVIÇOS PÚBLICOS - SEMOSP" },
  { value: "SEMALP", label: "AMBIENTE E LIMPEZA PÚBLICA - SEMALP" },
  { value: "SEMAEV", label: "AGRICULTURA E ESTRADAS VICINAIS - SEMAEV" },
  { value: "PROGEM", label: "PROCURADORIA - PROGEM" },
  { value: "SEMCI", label: "CONTROLE INTERNO - SEMCI" },
  { value: "SEMGAP", label: "CHEFIA DE GABINETE DO PREFEITO - SEMGAP" },
  { value: "SEMCTEL", label: "CULTURA, TURISMO, ESPORTE E LAZER - SEMCTEL" },
  { value: "SEMSEG", label: "SEGURANÇA, DEFESA CIVIL E ORDEM PÚBLICA - SEMSEG" },
  { value: "SEMTRANSP", label: "TRANSPORTES - SEMTRANSP" },
]

interface Veiculo {
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
}

interface EditarVeiculoProps {
  veiculo: Veiculo | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (veiculo: Veiculo) => void
}

export function EditarVeiculo({ veiculo, open, onOpenChange, onSave }: EditarVeiculoProps) {
  const [formData, setFormData] = useState<Veiculo | null>(null)
  const [secretariaOpen, setSecretariaOpen] = useState(false)
  const [tipoVeiculoOpen, setTipoVeiculoOpen] = useState(false)

  useEffect(() => {
    if (veiculo) {
      setFormData({ ...veiculo })
    }
  }, [veiculo])

  if (!formData) return null

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev!,
      [name]: value,
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({
      ...prev!,
      [name]: value,
    }))
  }

  const handleSubmit = () => {
    onSave(formData)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Veículo</DialogTitle>
          <DialogDescription>Atualize as informações do veículo abaixo.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-6 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="placa" className="text-right">
              Placa
            </Label>
            <Input id="placa" name="placa" value={formData.placa} onChange={handleInputChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="modelo" className="text-right">
              Modelo
            </Label>
            <Input
              id="modelo"
              name="modelo"
              value={formData.modelo}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="marca" className="text-right">
              Marca
            </Label>
            <Input id="marca" name="marca" value={formData.marca} onChange={handleInputChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cor" className="text-right">
              Cor
            </Label>
            <Input id="cor" name="cor" value={formData.cor || ""} onChange={handleInputChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="ano" className="text-right">
              Ano
            </Label>
            <Input id="ano" name="ano" value={formData.ano} onChange={handleInputChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tipo" className="text-right">
              Tipo
            </Label>
            <Popover open={tipoVeiculoOpen} onOpenChange={setTipoVeiculoOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={tipoVeiculoOpen}
                  className="col-span-3 justify-between h-12 text-left"
                >
                  {formData.tipo || "Selecione o tipo de veículo..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Buscar tipo de veículo..." />
                  <CommandList className="max-h-[300px]">
                    <CommandEmpty>
                      <div className="py-3 px-4 text-sm">
                        <p>Tipo não encontrado.</p>
                        <p className="text-muted-foreground">Pressione Enter para usar "{formData.tipo || "..."}"</p>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full rounded-t-none"
                        onClick={() => {
                          const input = document.querySelector(
                            'input[placeholder="Buscar tipo de veículo..."]',
                          ) as HTMLInputElement
                          if (input && input.value) {
                            handleSelectChange("tipo", input.value)
                            setTipoVeiculoOpen(false)
                          }
                        }}
                      >
                        Adicionar "{formData.tipo || "..."}"
                      </Button>
                    </CommandEmpty>
                    <CommandGroup>
                      {tiposVeiculos.map((tipo) => (
                        <CommandItem
                          key={tipo}
                          value={tipo}
                          onSelect={(currentValue) => {
                            handleSelectChange("tipo", currentValue)
                            setTipoVeiculoOpen(false)
                          }}
                          className="py-2 text-left"
                        >
                          <Check className={cn("mr-2 h-4 w-4", formData.tipo === tipo ? "opacity-100" : "opacity-0")} />
                          <span className="text-left">{tipo}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="renavam" className="text-right">
              Renavam
            </Label>
            <Input
              id="renavam"
              name="renavam"
              value={formData.renavam}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="chassi" className="text-right">
              Chassi
            </Label>
            <Input
              id="chassi"
              name="chassi"
              value={formData.chassi}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tipo_medicao" className="text-right">
              Tipo de Medição
            </Label>
            <Select
              value={formData.tipo_medicao || "Quilometragem"}
              onValueChange={(value) => handleSelectChange("tipo_medicao", value)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecione o tipo de medição" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Quilometragem">Quilometragem</SelectItem>
                <SelectItem value="Horimetro">Horimetro</SelectItem>
                <SelectItem value="Meses">Meses</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="tipo_combustivel" className="text-right">
              Combustível
            </Label>
            <Select
              value={formData.tipo_combustivel || ""}
              onValueChange={(value) => handleSelectChange("tipo_combustivel", value)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecione o tipo de combustível" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Gasolina">Gasolina</SelectItem>
                <SelectItem value="Etanol">Etanol</SelectItem>
                <SelectItem value="Flex">Flex (Gasolina/Etanol)</SelectItem>
                <SelectItem value="Diesel">Diesel</SelectItem>
                <SelectItem value="Diesel S10">Diesel S10</SelectItem>
                <SelectItem value="Biodiesel">Biodiesel</SelectItem>
                <SelectItem value="GNV">GNV</SelectItem>
                <SelectItem value="Híbrido">Híbrido</SelectItem>
                <SelectItem value="Elétrico">Elétrico</SelectItem>
                <SelectItem value="Outro">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select value={formData.status} onValueChange={(value) => handleSelectChange("status", value)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Manutenção">Manutenção</SelectItem>
                <SelectItem value="Inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4 mt-4">
            <Label htmlFor="secretaria" className="text-right">
              Secretaria
            </Label>
            <Popover open={secretariaOpen} onOpenChange={setSecretariaOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={secretariaOpen}
                  className="col-span-3 justify-between h-12 text-left"
                >
                  {formData.secretaria
                    ? secretarias.find((s) => s.value === formData.secretaria)?.label || formData.secretaria
                    : "Selecione a secretaria..."}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Buscar secretaria..." />
                  <CommandList className="max-h-[300px]">
                    <CommandEmpty>
                      <div className="py-3 px-4 text-sm">
                        <p>Secretaria não encontrada.</p>
                        <p className="text-muted-foreground">
                          Pressione Enter para usar "{formData.secretaria || "..."}"
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full rounded-t-none"
                        onClick={() => {
                          const input = document.querySelector(
                            'input[placeholder="Buscar secretaria..."]',
                          ) as HTMLInputElement
                          if (input && input.value) {
                            handleSelectChange("secretaria", input.value)
                            setSecretariaOpen(false)
                          }
                        }}
                      >
                        Adicionar "{formData.secretaria || "..."}"
                      </Button>
                    </CommandEmpty>
                    <CommandGroup>
                      {secretarias.map((secretaria) => (
                        <CommandItem
                          key={secretaria.value}
                          value={secretaria.value}
                          onSelect={(currentValue) => {
                            handleSelectChange("secretaria", currentValue)
                            setSecretariaOpen(false)
                          }}
                          className="py-2 text-left"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              formData.secretaria === secretaria.value ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <span className="text-left">{secretaria.label}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
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

