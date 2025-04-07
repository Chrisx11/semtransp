"use client"

import type React from "react"

import { useState, useEffect } from "react"
import LayoutAutenticado from "@/components/layout-autenticado"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  ChevronsUpDown,
  Check,
  Settings,
  FuelIcon as Oil,
  FileText,
} from "lucide-react"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import jsPDF from "jspdf"
// Corrigir a importação do jspdf-autotable
import autoTable from "jspdf-autotable"

// Adicione os imports para os novos componentes
import { VisualizarVeiculo } from "@/components/visualizar-veiculo"
import { EditarVeiculo } from "@/components/editar-veiculo"
import { ConfigurarTrocaVeiculo } from "@/components/configurar-troca-veiculo"
import { RegistrarTrocaOleo } from "@/components/registrar-troca-oleo"

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

// Atualizar a interface Veiculo para incluir a cor
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
  valor_troca?: number
  cor?: string // Nova propriedade
  tipo_combustivel?: string // Novo campo
  created_at?: string
  updated_at?: string
}

export default function VeiculosPage() {
  const [busca, setBusca] = useState("")
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [loading, setLoading] = useState(true)
  // Atualizar o estado inicial de novoVeiculo para incluir a cor
  const [novoVeiculo, setNovoVeiculo] = useState<Omit<Veiculo, "id">>({
    placa: "",
    modelo: "",
    marca: "",
    ano: "",
    tipo: "",
    secretaria: "",
    status: "Ativo",
    renavam: "",
    chassi: "",
    tipo_medicao: "Quilometragem", // Valor padrão
    cor: "", // Novo campo
    tipo_combustivel: "", // Novo campo para tipo de combustível
  })
  const [dialogOpen, setDialogOpen] = useState(false)
  const [veiculoSelecionado, setVeiculoSelecionado] = useState<Veiculo | null>(null)
  const [visualizarDialogOpen, setVisualizarDialogOpen] = useState(false)
  const [editarDialogOpen, setEditarDialogOpen] = useState(false)
  const [configurarTrocaDialogOpen, setConfigurarTrocaDialogOpen] = useState(false)
  const [registrarTrocaOleoDialogOpen, setRegistrarTrocaOleoDialogOpen] = useState(false)
  const [secretariaOpen, setSecretariaOpen] = useState(false)
  const [tipoVeiculoOpen, setTipoVeiculoOpen] = useState(false)
  const [configurarTrocaAposCadastro, setConfigurarTrocaAposCadastro] = useState(false)
  const [novoVeiculoCadastrado, setNovoVeiculoCadastrado] = useState<Veiculo | null>(null)

  // Carregar veículos do Supabase
  useEffect(() => {
    fetchVeiculos()
  }, [])

  const fetchVeiculos = async () => {
    try {
      setLoading(true)
      // Limitar os campos retornados para melhorar o desempenho
      const { data, error } = await supabase
        .from("veiculos")
        .select(
          "id, placa, modelo, marca, ano, tipo, secretaria, status, renavam, chassi, tipo_medicao, valor_troca, cor, tipo_combustivel, created_at, updated_at",
        )
        .order("placa", { ascending: true })

      if (error) {
        throw error
      }

      if (data) {
        setVeiculos(data)
      }
    } catch (error) {
      console.error("Erro ao buscar veículos:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os veículos.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Filtrar veículos com base na busca
  const veiculosFiltrados = veiculos.filter(
    (veiculo) =>
      veiculo.placa.toLowerCase().includes(busca.toLowerCase()) ||
      veiculo.modelo.toLowerCase().includes(busca.toLowerCase()) ||
      veiculo.marca.toLowerCase().includes(busca.toLowerCase()) ||
      veiculo.tipo.toLowerCase().includes(busca.toLowerCase()) ||
      veiculo.ano.includes(busca) ||
      veiculo.secretaria.toLowerCase().includes(busca.toLowerCase()),
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNovoVeiculo((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setNovoVeiculo((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async () => {
    try {
      // Atualizar o método handleSubmit para incluir a cor no objeto veiculoParaInserir
      const veiculoParaInserir = {
        placa: novoVeiculo.placa,
        modelo: novoVeiculo.modelo,
        marca: novoVeiculo.marca,
        cor: novoVeiculo.cor, // Novo campo
        ano: novoVeiculo.ano,
        tipo: novoVeiculo.tipo,
        secretaria: novoVeiculo.secretaria,
        status: novoVeiculo.status,
        renavam: novoVeiculo.renavam,
        chassi: novoVeiculo.chassi,
        tipo_medicao: novoVeiculo.tipo_medicao || "Quilometragem", // Valor padrão
        tipo_combustivel: novoVeiculo.tipo_combustivel, // Novo campo
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase.from("veiculos").insert([veiculoParaInserir]).select()

      if (error) {
        throw error
      }

      toast({
        title: "Sucesso",
        description: "Veículo cadastrado com sucesso!",
      })

      // Após cadastrar com sucesso, abrir o modal de configuração de troca
      if (data && data.length > 0) {
        setNovoVeiculoCadastrado(data[0])
        setConfigurarTrocaAposCadastro(true)
      }

      // Resetar formulário e fechar diálogo
      // Atualizar o método de resetar o formulário para incluir a cor
      setNovoVeiculo({
        placa: "",
        modelo: "",
        marca: "",
        cor: "", // Novo campo
        ano: "",
        tipo: "",
        secretaria: "",
        status: "Ativo",
        renavam: "",
        chassi: "",
        tipo_medicao: "Quilometragem", // Valor padrão
        tipo_combustivel: "", // Novo campo
      })
      setDialogOpen(false)

      // Recarregar a lista de veículos
      fetchVeiculos()
    } catch (error) {
      console.error("Erro ao cadastrar veículo:", error)
      toast({
        title: "Erro",
        description: "Não foi possível cadastrar o veículo.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase.from("veiculos").delete().eq("id", id)

      if (error) {
        throw error
      }

      toast({
        title: "Sucesso",
        description: "Veículo excluído com sucesso!",
      })

      // Atualizar a lista local
      setVeiculos((prev) => prev.filter((v) => v.id !== id))
    } catch (error) {
      console.error("Erro ao excluir veículo:", error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir o veículo.",
        variant: "destructive",
      })
    }
  }

  const handleUpdateVeiculo = async (veiculoAtualizado: Veiculo) => {
    try {
      // Preparar dados para atualização no banco
      const dadosAtualizados = {
        placa: veiculoAtualizado.placa,
        modelo: veiculoAtualizado.modelo,
        marca: veiculoAtualizado.marca,
        ano: veiculoAtualizado.ano,
        tipo: veiculoAtualizado.tipo,
        secretaria: veiculoAtualizado.secretaria,
        status: veiculoAtualizado.status,
        renavam: veiculoAtualizado.renavam,
        chassi: veiculoAtualizado.chassi,
        tipo_medicao: veiculoAtualizado.tipo_medicao,
        updated_at: new Date().toISOString(),
        cor: veiculoAtualizado.cor,
        tipo_combustivel: veiculoAtualizado.tipo_combustivel, // Novo campo
      }

      const { error } = await supabase.from("veiculos").update(dadosAtualizados).eq("id", veiculoAtualizado.id)

      if (error) {
        throw error
      }

      toast({
        title: "Sucesso",
        description: "Veículo atualizado com sucesso!",
      })

      // Atualizar a lista local
      setVeiculos((prev) =>
        prev.map((v) =>
          v.id === veiculoAtualizado.id ? { ...veiculoAtualizado, updated_at: new Date().toISOString() } : v,
        ),
      )
    } catch (error) {
      console.error("Erro ao atualizar veículo:", error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o veículo.",
        variant: "destructive",
      })
    }
  }

  // Função para atualizar a lista após configurar a troca
  const handleAfterConfigurarTroca = () => {
    fetchVeiculos()
    setConfigurarTrocaAposCadastro(false)
  }

  // Função para gerar o relatório PDF
  const gerarRelatorioPDF = () => {
    try {
      // Criar uma nova instância do jsPDF
      const doc = new jsPDF()

      // Configurar a imagem do cabeçalho
      const logoUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQGfgRKJ25IbgbezBljMYEw_74sj5phrSfL_Q&s"
      const logoWidth = 30 // mm
      const logoHeight = 18 // mm

      // Carregar a imagem
      const img = new Image()
      img.crossOrigin = "anonymous" // Evitar problemas de CORS

      img.onload = () => {
        try {
          // Adicionar a imagem com transparência
          const pageWidth = doc.internal.pageSize.getWidth()
          const x = (pageWidth - logoWidth) / 2
          doc.addImage(img, "PNG", x, 10, logoWidth, logoHeight, undefined, "FAST", 0.8)

          // Adicionar o texto da Secretaria
          doc.setFont("helvetica", "normal")
          doc.setFontSize(12)
          doc.text("Secretaria Municipal de Transportes - Italva/RJ", pageWidth / 2, 35, { align: "center" })

          // Adicionar o título do relatório
          doc.setFont("helvetica", "bold")
          doc.setFontSize(16)
          doc.text("Relatório de Veículos", pageWidth / 2, 45, { align: "center" })

          // Adicionar a data de geração
          const dataAtual = new Date().toLocaleDateString("pt-BR")
          doc.setFont("helvetica", "normal")
          doc.setFontSize(10)
          doc.text(`Gerado em: ${dataAtual}`, pageWidth / 2, 52, { align: "center" })

          // Preparar os dados para a tabela
          const tableColumn = ["Placa", "Modelo", "Marca", "Cor", "Ano", "Tipo", "Secretaria", "Status"]
          const tableRows = veiculosFiltrados.map((veiculo) => [
            veiculo.placa,
            veiculo.modelo,
            veiculo.marca,
            veiculo.cor || "-",
            veiculo.ano,
            veiculo.tipo,
            veiculo.secretaria,
            veiculo.status,
          ])

          // Definir cores para os status
          const statusColors = {
            Ativo: [200, 250, 200],
            Manutenção: [255, 240, 200],
            Inativo: [250, 200, 200],
          }

          // Adicionar a tabela ao documento usando a função autoTable
          autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 58,
            theme: "grid",
            headStyles: {
              fillColor: [41, 128, 185],
              textColor: 255,
              fontStyle: "bold",
            },
            alternateRowStyles: {
              fillColor: [240, 240, 240],
            },
            // Colorir as células de status
            didDrawCell: (data: any) => {
              if (data.section === "body" && data.column.index === 7) {
                const status = data.cell.raw
                const color = statusColors[status as keyof typeof statusColors] || [255, 255, 255]

                doc.setFillColor(color[0], color[1], color[2])
                doc.rect(data.cell.x, data.cell.y, data.cell.width, data.cell.height, "F")
                doc.setTextColor(0)
                doc.text(status, data.cell.x + data.cell.width / 2, data.cell.y + data.cell.height / 2, {
                  align: "center",
                  baseline: "middle",
                })
              }
            },
            // Adicionar rodapé com número de página
            didDrawPage: (data: any) => {
              const pageCount = doc.internal.getNumberOfPages()
              const pageSize = doc.internal.pageSize
              const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight()
              doc.setFontSize(8)
              doc.text(`Página ${data.pageNumber} de ${pageCount}`, data.settings.margin.left, pageHeight - 10)
              doc.text(
                "Sistema de Gestão de Frotas - SEMTRANSP",
                pageWidth - data.settings.margin.right,
                pageHeight - 10,
                { align: "right" },
              )
            },
          })

          // Salvar o PDF
          doc.save("relatorio-veiculos.pdf")
        } catch (error) {
          console.error("Erro ao gerar PDF:", error)
          // Gerar o PDF sem a imagem em caso de erro
          gerarPDFSemImagem()
        }
      }

      img.onerror = () => {
        console.error("Erro ao carregar a imagem")
        // Gerar o PDF sem a imagem em caso de erro
        gerarPDFSemImagem()
      }

      img.src = logoUrl

      // Função para gerar o PDF sem a imagem em caso de erro
      function gerarPDFSemImagem() {
        const pageWidth = doc.internal.pageSize.getWidth()

        // Adicionar o texto da Secretaria
        doc.setFont("helvetica", "normal")
        doc.setFontSize(12)
        doc.text("Secretaria Municipal de Transportes - Italva/RJ", pageWidth / 2, 20, { align: "center" })

        // Adicionar o título do relatório
        doc.setFont("helvetica", "bold")
        doc.setFontSize(16)
        doc.text("Relatório de Veículos", pageWidth / 2, 30, { align: "center" })

        // Adicionar a data de geração
        const dataAtual = new Date().toLocaleDateString("pt-BR")
        doc.setFont("helvetica", "normal")
        doc.setFontSize(10)
        doc.text(`Gerado em: ${dataAtual}`, pageWidth / 2, 37, { align: "center" })

        // Preparar os dados para a tabela
        const tableColumn = ["Placa", "Modelo", "Marca", "Cor", "Ano", "Tipo", "Secretaria", "Status"]
        const tableRows = veiculosFiltrados.map((veiculo) => [
          veiculo.placa,
          veiculo.modelo,
          veiculo.marca,
          veiculo.cor || "-",
          veiculo.ano,
          veiculo.tipo,
          veiculo.secretaria,
          veiculo.status,
        ])

        // Usar a função autoTable corretamente
        autoTable(doc, {
          head: [tableColumn],
          body: tableRows,
          startY: 45,
          theme: "grid",
          headStyles: {
            fillColor: [41, 128, 185],
            textColor: 255,
            fontStyle: "bold",
          },
          alternateRowStyles: {
            fillColor: [240, 240, 240],
          },
        })

        // Salvar o PDF
        doc.save("relatorio-veiculos.pdf")
      }
    } catch (error) {
      console.error("Erro ao iniciar geração do PDF:", error)
      toast({
        title: "Erro",
        description: "Não foi possível gerar o relatório.",
        variant: "destructive",
      })
    }
  }

  return (
    <LayoutAutenticado>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Veículos</h2>
          <p className="text-muted-foreground">Gerencie os veículos da SEMTRANSP.</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar veículos..."
              className="pl-8"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="flex space-x-2">
            {/* Botão de Relatório */}
            <Button variant="outline" onClick={gerarRelatorioPDF}>
              <FileText className="mr-2 h-4 w-4" />
              Relatório
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Novo Veículo
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Cadastrar Novo Veículo</DialogTitle>
                  <DialogDescription>Preencha os dados do novo veículo abaixo.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="placa" className="text-right">
                      Placa
                    </Label>
                    <Input
                      id="placa"
                      name="placa"
                      value={novoVeiculo.placa}
                      onChange={handleInputChange}
                      className="col-span-3"
                      placeholder="ABC-1234"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="modelo" className="text-right">
                      Modelo
                    </Label>
                    <Input
                      id="modelo"
                      name="modelo"
                      value={novoVeiculo.modelo}
                      onChange={handleInputChange}
                      className="col-span-3"
                      placeholder="Corolla"
                    />
                  </div>
                  {/* Adicionar o campo cor no formulário de novo veículo, após o campo marca */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="marca" className="text-right">
                      Marca
                    </Label>
                    <Input
                      id="marca"
                      name="marca"
                      value={novoVeiculo.marca}
                      onChange={handleInputChange}
                      className="col-span-3"
                      placeholder="Toyota"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="cor" className="text-right">
                      Cor
                    </Label>
                    <Input
                      id="cor"
                      name="cor"
                      value={novoVeiculo.cor}
                      onChange={handleInputChange}
                      className="col-span-3"
                      placeholder="Prata"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="ano" className="text-right">
                      Ano
                    </Label>
                    <Input
                      id="ano"
                      name="ano"
                      value={novoVeiculo.ano}
                      onChange={handleInputChange}
                      className="col-span-3"
                      placeholder="2022"
                    />
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
                          {novoVeiculo.tipo || "Selecione o tipo de veículo..."}
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
                                <p className="text-muted-foreground">
                                  Pressione Enter para usar "{novoVeiculo.tipo || "..."}"
                                </p>
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
                                Adicionar "{novoVeiculo.tipo || "..."}"
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
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      novoVeiculo.tipo === tipo ? "opacity-100" : "opacity-0",
                                    )}
                                  />
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
                      value={novoVeiculo.renavam}
                      onChange={handleInputChange}
                      className="col-span-3"
                      placeholder="12345678901"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="chassi" className="text-right">
                      Chassi
                    </Label>
                    <Input
                      id="chassi"
                      name="chassi"
                      value={novoVeiculo.chassi}
                      onChange={handleInputChange}
                      className="col-span-3"
                      placeholder="9BRBLWHEXG0123456"
                    />
                  </div>
                  {/* No formulário de novo veículo, após o campo de chassi e antes do campo de status, adicione: */}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="tipo_medicao" className="text-right">
                      Tipo de Medição
                    </Label>
                    <Select
                      value={novoVeiculo.tipo_medicao || "Quilometragem"}
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
                      value={novoVeiculo.tipo_combustivel || ""}
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
                    <Select value={novoVeiculo.status} onValueChange={(value) => handleSelectChange("status", value)}>
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
                          {novoVeiculo.secretaria
                            ? secretarias.find((s) => s.value === novoVeiculo.secretaria)?.label ||
                              novoVeiculo.secretaria
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
                                  Pressione Enter para usar "{novoVeiculo.secretaria || "..."}"
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
                                Adicionar "{novoVeiculo.secretaria || "..."}"
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
                                      novoVeiculo.secretaria === secretaria.value ? "opacity-100" : "opacity-0",
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

        <Card>
          <CardHeader>
            <CardTitle>Lista de Veículos</CardTitle>
            <CardDescription>Total de {veiculosFiltrados.length} veículos encontrados.</CardDescription>
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
                    <TableHead>Placa</TableHead>
                    <TableHead>Modelo</TableHead>
                    {/* Adicionar o campo cor na tabela, após a coluna Marca */}
                    <TableHead>Marca</TableHead>
                    <TableHead>Cor</TableHead>
                    <TableHead>Ano</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Secretaria</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {veiculosFiltrados.map((veiculo) => (
                    <TableRow key={veiculo.id}>
                      <TableCell className="font-medium">{veiculo.placa}</TableCell>
                      <TableCell>{veiculo.modelo}</TableCell>
                      {/* Adicionar o valor da cor na linha da tabela, após a célula da marca */}
                      <TableCell>{veiculo.marca}</TableCell>
                      <TableCell>{veiculo.cor || "-"}</TableCell>
                      <TableCell>{veiculo.ano}</TableCell>
                      <TableCell>{veiculo.tipo}</TableCell>
                      <TableCell>{veiculo.secretaria}</TableCell>
                      <TableCell>
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
                      </TableCell>
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
                                setVeiculoSelecionado(veiculo)
                                setVisualizarDialogOpen(true)
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              <span>Visualizar</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="flex items-center cursor-pointer"
                              onClick={() => {
                                setVeiculoSelecionado(veiculo)
                                setEditarDialogOpen(true)
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Editar</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="flex items-center cursor-pointer"
                              onClick={() => {
                                setVeiculoSelecionado(veiculo)
                                setConfigurarTrocaDialogOpen(true)
                              }}
                            >
                              <Settings className="mr-2 h-4 w-4" />
                              <span>Configurar Troca</span>
                            </DropdownMenuItem>

                            {/* Adicionar a nova opção de Troca de Óleo */}
                            <DropdownMenuItem
                              className="flex items-center cursor-pointer"
                              onClick={() => {
                                setVeiculoSelecionado(veiculo)
                                setRegistrarTrocaOleoDialogOpen(true)
                              }}
                            >
                              <Oil className="mr-2 h-4 w-4" />
                              <span>Registrar Troca de Óleo</span>
                            </DropdownMenuItem>

                            <DropdownMenuItem
                              className="flex items-center text-red-600 cursor-pointer"
                              onClick={() => handleDelete(veiculo.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Excluir</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}

                  {veiculosFiltrados.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={8} className="h-24 text-center">
                        Nenhum veículo encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <VisualizarVeiculo
          veiculo={veiculoSelecionado}
          open={visualizarDialogOpen}
          onOpenChange={setVisualizarDialogOpen}
        />

        <EditarVeiculo
          veiculo={veiculoSelecionado}
          open={editarDialogOpen}
          onOpenChange={setEditarDialogOpen}
          onSave={handleUpdateVeiculo}
        />

        <ConfigurarTrocaVeiculo
          veiculo={veiculoSelecionado}
          open={configurarTrocaDialogOpen}
          onOpenChange={setConfigurarTrocaDialogOpen}
          onSave={handleAfterConfigurarTroca}
        />

        {/* Modal para configurar troca após cadastro */}
        <ConfigurarTrocaVeiculo
          veiculo={novoVeiculoCadastrado}
          open={configurarTrocaAposCadastro}
          onOpenChange={setConfigurarTrocaAposCadastro}
          onSave={handleAfterConfigurarTroca}
        />

        <RegistrarTrocaOleo
          veiculo={veiculoSelecionado}
          open={registrarTrocaOleoDialogOpen}
          onOpenChange={setRegistrarTrocaOleoDialogOpen}
          onSave={fetchVeiculos}
        />
      </div>
      <Toaster />
    </LayoutAutenticado>
  )
}

