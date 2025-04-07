"use client"

import type React from "react"

import { useState, useEffect } from "react"
import LayoutAutenticado from "@/components/layout-autenticado"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, UserPlus, MoreHorizontal, Eye, Pencil, Trash2 } from "lucide-react"
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
import { supabase } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"

// Adicione os imports para os novos componentes
import { VisualizarColaborador } from "@/components/visualizar-colaborador"
import { EditarColaborador } from "@/components/editar-colaborador"

import { FileText } from "lucide-react"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

interface Colaborador {
  id: number
  nome: string
  cargo: string
  secretaria: string
  contato: string
  status: string
  created_at?: string
  updated_at?: string
}

export default function ColaboradoresPage() {
  const [busca, setBusca] = useState("")
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [loading, setLoading] = useState(true)
  const [novoColaborador, setNovoColaborador] = useState<Omit<Colaborador, "id">>({
    nome: "",
    cargo: "",
    secretaria: "",
    contato: "",
    status: "Ativo",
  })
  const [dialogOpen, setDialogOpen] = useState(false)

  // Adicione estes estados no componente ColaboradoresPage
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState<Colaborador | null>(null)
  const [visualizarDialogOpen, setVisualizarDialogOpen] = useState(false)
  const [editarDialogOpen, setEditarDialogOpen] = useState(false)

  // Carregar colaboradores do Supabase
  useEffect(() => {
    fetchColaboradores()
  }, [])

  const fetchColaboradores = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("colaboradores").select("*").order("nome", { ascending: true })

      if (error) {
        throw error
      }

      if (data) {
        setColaboradores(data)
      }
    } catch (error) {
      console.error("Erro ao buscar colaboradores:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os colaboradores.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Filtrar colaboradores com base na busca
  const colaboradoresFiltrados = colaboradores.filter(
    (colaborador) =>
      colaborador.nome.toLowerCase().includes(busca.toLowerCase()) ||
      colaborador.cargo.toLowerCase().includes(busca.toLowerCase()) ||
      colaborador.secretaria.toLowerCase().includes(busca.toLowerCase()) ||
      colaborador.contato.toLowerCase().includes(busca.toLowerCase()),
  )

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNovoColaborador((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSubmit = async () => {
    try {
      // Adicionar timestamp
      const colaboradorCompleto = {
        ...novoColaborador,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase.from("colaboradores").insert([colaboradorCompleto]).select()

      if (error) {
        throw error
      }

      toast({
        title: "Sucesso",
        description: "Colaborador cadastrado com sucesso!",
      })

      // Resetar formulário e fechar diálogo
      setNovoColaborador({
        nome: "",
        cargo: "",
        secretaria: "",
        contato: "",
        status: "Ativo",
      })
      setDialogOpen(false)

      // Recarregar a lista de colaboradores
      fetchColaboradores()
    } catch (error) {
      console.error("Erro ao cadastrar colaborador:", error)
      toast({
        title: "Erro",
        description: "Não foi possível cadastrar o colaborador.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const { error } = await supabase.from("colaboradores").delete().eq("id", id)

      if (error) {
        throw error
      }

      toast({
        title: "Sucesso",
        description: "Colaborador excluído com sucesso!",
      })

      // Atualizar a lista local
      setColaboradores((prev) => prev.filter((c) => c.id !== id))
    } catch (error) {
      console.error("Erro ao excluir colaborador:", error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir o colaborador.",
        variant: "destructive",
      })
    }
  }

  // Adicione esta função para atualizar um colaborador
  const handleUpdateColaborador = async (colaboradorAtualizado: Colaborador) => {
    try {
      // Adicionar timestamp de atualização
      const dadosAtualizados = {
        ...colaboradorAtualizado,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from("colaboradores").update(dadosAtualizados).eq("id", dadosAtualizados.id)

      if (error) {
        throw error
      }

      toast({
        title: "Sucesso",
        description: "Colaborador atualizado com sucesso!",
      })

      // Atualizar a lista local
      setColaboradores((prev) => prev.map((c) => (c.id === colaboradorAtualizado.id ? dadosAtualizados : c)))
    } catch (error) {
      console.error("Erro ao atualizar colaborador:", error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o colaborador.",
        variant: "destructive",
      })
    }
  }

  // Modifique a função gerarRelatorioPDF para incluir a imagem no cabeçalho
  const gerarRelatorioPDF = () => {
    // Criar nova instância do PDF
    const doc = new jsPDF()

    // URL da imagem
    const imageUrl = "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQGfgRKJ25IbgbezBljMYEw_74sj5phrSfL_Q&s"

    // Função para adicionar a imagem após carregá-la
    const addImageToPdf = (imgData: string) => {
      // Tamanho da página
      const pageWidth = doc.internal.pageSize.getWidth()

      // Definir tamanho da imagem (largura reduzida para 30mm)
      const imgWidth = 30
      const imgHeight = 18

      // Calcular posição X para centralizar
      const imgX = (pageWidth - imgWidth) / 2

      // Adicionar a imagem com transparência (0.8 = 80% de opacidade)
      doc.addImage(imgData, "JPEG", imgX, 10, imgWidth, imgHeight, undefined, "FAST", 0.8)

      // Adicionar texto da Secretaria
      doc.setFontSize(12)
      doc.setTextColor(0, 0, 0)
      doc.text("Secretaria Municipal de Transportes - Italva/RJ", pageWidth / 2, 35, { align: "center" })

      // Adicionar título abaixo do texto da Secretaria
      doc.setFontSize(16)
      doc.text("Relatório de Colaboradores", 14, 45)

      // Adicionar data de geração
      const dataAtual = new Date().toLocaleDateString("pt-BR")
      doc.setFontSize(10)
      doc.text(`Data de geração: ${dataAtual}`, 14, 52)

      // Preparar dados para a tabela
      const dadosTabela = colaboradoresFiltrados.map((col) => [
        col.nome,
        col.cargo,
        col.secretaria,
        col.contato,
        col.status,
      ])

      // Adicionar tabela ao PDF
      autoTable(doc, {
        head: [["Nome", "Cargo", "Secretaria", "Contato", "Status"]],
        body: dadosTabela,
        startY: 58, // Ajustado para começar abaixo do título e data
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 240, 240] },
      })

      // Adicionar rodapé
      const totalPaginas = doc.internal.getNumberOfPages()
      for (let i = 1; i <= totalPaginas; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.text(
          `Página ${i} de ${totalPaginas} - SEMTRANSP - Sistema de Gestão`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" },
        )
      }

      // Salvar o PDF
      doc.save("relatorio-colaboradores.pdf")

      toast({
        title: "Relatório gerado",
        description: "O relatório de colaboradores foi gerado com sucesso!",
      })
    }

    // Carregar a imagem
    const img = new Image()
    img.crossOrigin = "anonymous" // Importante para evitar problemas de CORS
    img.onload = () => {
      // Converter a imagem para base64
      const canvas = document.createElement("canvas")
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext("2d")
      ctx?.drawImage(img, 0, 0)
      const imgData = canvas.toDataURL("image/jpeg")

      // Adicionar a imagem ao PDF
      addImageToPdf(imgData)
    }
    img.onerror = () => {
      // Se falhar ao carregar a imagem, gerar o PDF sem ela
      console.error("Erro ao carregar a imagem")

      // Adicionar texto da Secretaria
      const pageWidth = doc.internal.pageSize.getWidth()
      doc.setFontSize(12)
      doc.text("Secretaria Municipal de Transportes - Italva/RJ", pageWidth / 2, 20, { align: "center" })

      // Adicionar título
      doc.setFontSize(16)
      doc.text("Relatório de Colaboradores", 14, 30)

      // Adicionar data de geração
      const dataAtual = new Date().toLocaleDateString("pt-BR")
      doc.setFontSize(10)
      doc.text(`Data de geração: ${dataAtual}`, 14, 38)

      // Preparar dados para a tabela
      const dadosTabela = colaboradoresFiltrados.map((col) => [
        col.nome,
        col.cargo,
        col.secretaria,
        col.contato,
        col.status,
      ])

      // Adicionar tabela ao PDF
      autoTable(doc, {
        head: [["Nome", "Cargo", "Secretaria", "Contato", "Status"]],
        body: dadosTabela,
        startY: 45,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [41, 128, 185], textColor: 255 },
        alternateRowStyles: { fillColor: [240, 240, 240] },
      })

      // Adicionar rodapé
      const totalPaginas = doc.internal.getNumberOfPages()
      for (let i = 1; i <= totalPaginas; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.text(
          `Página ${i} de ${totalPaginas} - SEMTRANSP - Sistema de Gestão`,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" },
        )
      }

      // Salvar o PDF
      doc.save("relatorio-colaboradores.pdf")

      toast({
        title: "Relatório gerado",
        description: "O relatório de colaboradores foi gerado com sucesso!",
      })
    }

    // Iniciar o carregamento da imagem
    img.src = imageUrl
  }

  return (
    <LayoutAutenticado>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Colaboradores</h2>
          <p className="text-muted-foreground">Gerencie os colaboradores da SEMTRANSP.</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar colaboradores..."
              className="pl-8"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={gerarRelatorioPDF}>
              <FileText className="mr-2 h-4 w-4" />
              Relatório
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Novo Colaborador
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Cadastrar Novo Colaborador</DialogTitle>
                  <DialogDescription>Preencha os dados do novo colaborador abaixo.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="nome" className="text-right">
                      Nome
                    </Label>
                    <Input
                      id="nome"
                      name="nome"
                      value={novoColaborador.nome}
                      onChange={handleInputChange}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="cargo" className="text-right">
                      Cargo
                    </Label>
                    <Input
                      id="cargo"
                      name="cargo"
                      value={novoColaborador.cargo}
                      onChange={handleInputChange}
                      className="col-span-3"
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="secretaria" className="text-right">
                      Secretaria
                    </Label>
                    <Input
                      id="secretaria"
                      name="secretaria"
                      value={novoColaborador.secretaria}
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
                      value={novoColaborador.contato}
                      onChange={handleInputChange}
                      className="col-span-3"
                    />
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
            <CardTitle>Lista de Colaboradores</CardTitle>
            <CardDescription>Total de {colaboradoresFiltrados.length} colaboradores encontrados.</CardDescription>
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
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Secretaria</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {colaboradoresFiltrados.map((colaborador) => (
                    <TableRow key={colaborador.id}>
                      <TableCell className="font-medium">{colaborador.nome}</TableCell>
                      <TableCell>{colaborador.cargo}</TableCell>
                      <TableCell>{colaborador.secretaria}</TableCell>
                      <TableCell>{colaborador.contato}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            colaborador.status === "Ativo" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}
                        >
                          {colaborador.status}
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
                                setColaboradorSelecionado(colaborador)
                                setVisualizarDialogOpen(true)
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              <span>Visualizar</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="flex items-center cursor-pointer"
                              onClick={() => {
                                setColaboradorSelecionado(colaborador)
                                setEditarDialogOpen(true)
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Editar</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="flex items-center text-red-600 cursor-pointer"
                              onClick={() => handleDelete(colaborador.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Excluir</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}

                  {colaboradoresFiltrados.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        Nenhum colaborador encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <VisualizarColaborador
          colaborador={colaboradorSelecionado}
          open={visualizarDialogOpen}
          onOpenChange={setVisualizarDialogOpen}
        />

        <EditarColaborador
          colaborador={colaboradorSelecionado}
          open={editarDialogOpen}
          onOpenChange={setEditarDialogOpen}
          onSave={handleUpdateColaborador}
        />
      </div>
      <Toaster />
    </LayoutAutenticado>
  )
}

