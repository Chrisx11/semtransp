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

interface Colaborador {
  id: number
  nome: string
  cargo: string
  secretaria: string
  contato: string
  status: string
}

interface EditarColaboradorProps {
  colaborador: Colaborador | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (colaborador: Colaborador) => void
}

export function EditarColaborador({ colaborador, open, onOpenChange, onSave }: EditarColaboradorProps) {
  const [formData, setFormData] = useState<Colaborador | null>(null)

  useEffect(() => {
    if (colaborador) {
      setFormData({ ...colaborador })
    }
  }, [colaborador])

  if (!formData) return null

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev!,
      [name]: value,
    }))
  }

  const handleStatusChange = (value: string) => {
    setFormData((prev) => ({
      ...prev!,
      status: value,
    }))
  }

  const handleSubmit = () => {
    onSave(formData)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Colaborador</DialogTitle>
          <DialogDescription>Atualize as informações do colaborador abaixo.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="nome" className="text-right">
              Nome
            </Label>
            <Input id="nome" name="nome" value={formData.nome} onChange={handleInputChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cargo" className="text-right">
              Cargo
            </Label>
            <Input id="cargo" name="cargo" value={formData.cargo} onChange={handleInputChange} className="col-span-3" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="secretaria" className="text-right">
              Secretaria
            </Label>
            <Input
              id="secretaria"
              name="secretaria"
              value={formData.secretaria}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="contato" className="text-right">
              Contato
            </Label>
            <Input
              id="contato"
              name="contato"
              value={formData.contato}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select value={formData.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Ativo">Ativo</SelectItem>
                <SelectItem value="Inativo">Inativo</SelectItem>
              </SelectContent>
            </Select>
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

