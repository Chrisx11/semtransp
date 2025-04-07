"use client"

import type React from "react"

import { useState, useEffect } from "react"
import LayoutAutenticado from "@/components/layout-autenticado"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, MoreHorizontal, Eye, Pencil, Trash2, UserPlus, Lock } from "lucide-react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { Badge } from "@/components/ui/badge"

interface Usuario {
  id: number
  username: string
  password: string
  nome_completo: string
  cargo: string
  status: string
  ultimo_login?: string
  created_at: string
}

export default function UsuariosPage() {
  const [busca, setBusca] = useState("")
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)

  // Estados para os diálogos
  const [novoUsuarioDialogOpen, setNovoUsuarioDialogOpen] = useState(false)
  const [visualizarDialogOpen, setVisualizarDialogOpen] = useState(false)
  const [editarDialogOpen, setEditarDialogOpen] = useState(false)
  const [alterarSenhaDialogOpen, setAlterarSenhaDialogOpen] = useState(false)
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<Usuario | null>(null)

  // Estados para o formulário de novo usuário
  const [novoUsuario, setNovoUsuario] = useState({
    username: "",
    password: "",
    nome_completo: "",
    cargo: "",
    status: "Ativo",
  })

  // Estado para alteração de senha
  const [novaSenha, setNovaSenha] = useState({
    password: "",
    confirmPassword: "",
  })

  // Carregar usuários do Supabase
  useEffect(() => {
    fetchUsuarios()
  }, [])

  const fetchUsuarios = async () => {
    try {
      setLoading(true)
      // Simulação de dados - em um sistema real, isso viria do banco de dados
      const mockUsuarios: Usuario[] = [
        {
          id: 1,
          username: "admin",
          password: "********",
          nome_completo: "Administrador do Sistema",
          cargo: "Administrador",
          status: "Ativo",
          ultimo_login: "2025-03-15T10:30:00",
          created_at: "2025-01-01T00:00:00",
        },
        {
          id: 2,
          username: "joao.silva",
          password: "********",
          nome_completo: "João Silva",
          cargo: "Operador",
          status: "Ativo",
          ultimo_login: "2025-03-14T14:45:00",
          created_at: "2025-01-15T00:00:00",
        },
        {
          id: 3,
          username: "maria.oliveira",
          password: "********",
          nome_completo: "Maria Oliveira",
          cargo: "Supervisor",
          status: "Inativo",
          ultimo_login: "2025-02-20T09:15:00",
          created_at: "2025-01-20T00:00:00",
        },
      ]

      setUsuarios(mockUsuarios)
    } catch (error) {
      console.error("Erro ao buscar usuários:", error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os usuários.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Filtrar usuários com base na busca
  const usuariosFiltrados = usuarios.filter(
    (usuario) =>
      usuario.username.toLowerCase().includes(busca.toLowerCase()) ||
      usuario.nome_completo.toLowerCase().includes(busca.toLowerCase()) ||
      usuario.cargo.toLowerCase().includes(busca.toLowerCase()),
  )

  // Funções para manipular o formulário de novo usuário
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setNovoUsuario((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setNovoUsuario((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Função para adicionar novo usuário
  const handleAdicionarUsuario = async () => {
    try {
      // Validações básicas
      if (!novoUsuario.username || !novoUsuario.password || !novoUsuario.nome_completo || !novoUsuario.cargo) {
        toast({
          title: "Erro",
          description: "Por favor, preencha todos os campos obrigatórios.",
          variant: "destructive",
        })
        return
      }

      // Verificar se o nome de usuário já existe
      if (usuarios.some((u) => u.username === novoUsuario.username)) {
        toast({
          title: "Erro",
          description: "Este nome de usuário já está em uso.",
          variant: "destructive",
        })
        return
      }

      // Em um sistema real, isso seria enviado para o banco de dados
      const novoUsuarioCompleto: Usuario = {
        id: Math.max(0, ...usuarios.map((u) => u.id)) + 1,
        username: novoUsuario.username,
        password: "********", // A senha real seria criptografada
        nome_completo: novoUsuario.nome_completo,
        cargo: novoUsuario.cargo,
        status: novoUsuario.status,
        created_at: new Date().toISOString(),
      }

      // Adicionar à lista local
      setUsuarios((prev) => [...prev, novoUsuarioCompleto])

      toast({
        title: "Sucesso",
        description: "Usuário cadastrado com sucesso!",
      })

      // Resetar formulário e fechar diálogo
      setNovoUsuario({
        username: "",
        password: "",
        nome_completo: "",
        cargo: "",
        status: "Ativo",
      })
      setNovoUsuarioDialogOpen(false)
    } catch (error) {
      console.error("Erro ao adicionar usuário:", error)
      toast({
        title: "Erro",
        description: "Não foi possível cadastrar o usuário.",
        variant: "destructive",
      })
    }
  }

  // Função para editar usuário
  const handleEditarUsuario = async () => {
    try {
      if (!usuarioSelecionado) return

      // Em um sistema real, isso seria enviado para o banco de dados
      setUsuarios((prev) =>
        prev.map((usuario) => (usuario.id === usuarioSelecionado.id ? usuarioSelecionado : usuario)),
      )

      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso!",
      })

      setEditarDialogOpen(false)
    } catch (error) {
      console.error("Erro ao editar usuário:", error)
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o usuário.",
        variant: "destructive",
      })
    }
  }

  // Função para alterar senha
  const handleAlterarSenha = async () => {
    try {
      if (!usuarioSelecionado) return

      // Validar se as senhas coincidem
      if (novaSenha.password !== novaSenha.confirmPassword) {
        toast({
          title: "Erro",
          description: "As senhas não coincidem.",
          variant: "destructive",
        })
        return
      }

      // Em um sistema real, a senha seria criptografada e atualizada no banco de dados
      toast({
        title: "Sucesso",
        description: "Senha alterada com sucesso!",
      })

      // Resetar formulário e fechar diálogo
      setNovaSenha({
        password: "",
        confirmPassword: "",
      })
      setAlterarSenhaDialogOpen(false)
    } catch (error) {
      console.error("Erro ao alterar senha:", error)
      toast({
        title: "Erro",
        description: "Não foi possível alterar a senha.",
        variant: "destructive",
      })
    }
  }

  // Função para excluir usuário
  const handleExcluirUsuario = async (id: number) => {
    try {
      // Em um sistema real, isso seria enviado para o banco de dados
      setUsuarios((prev) => prev.filter((usuario) => usuario.id !== id))

      toast({
        title: "Sucesso",
        description: "Usuário excluído com sucesso!",
      })
    } catch (error) {
      console.error("Erro ao excluir usuário:", error)
      toast({
        title: "Erro",
        description: "Não foi possível excluir o usuário.",
        variant: "destructive",
      })
    }
  }

  // Formatar data
  const formatarData = (dataString?: string) => {
    if (!dataString) return "-"
    try {
      const data = new Date(dataString)
      return new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(data)
    } catch (error) {
      return dataString
    }
  }

  return (
    <LayoutAutenticado>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Usuários do Sistema</h2>
          <p className="text-muted-foreground">Gerencie os usuários que têm acesso ao sistema.</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar usuários..."
              className="pl-8"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
            />
          </div>
          <Button onClick={() => setNovoUsuarioDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Novo Usuário
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuários</CardTitle>
            <CardDescription>Total de {usuariosFiltrados.length} usuários encontrados.</CardDescription>
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
                    <TableHead>Nome de Usuário</TableHead>
                    <TableHead>Nome Completo</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Último Login</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {usuariosFiltrados.map((usuario) => (
                    <TableRow key={usuario.id}>
                      <TableCell className="font-medium">{usuario.username}</TableCell>
                      <TableCell>{usuario.nome_completo}</TableCell>
                      <TableCell>{usuario.cargo}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            usuario.status === "Ativo" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                          }
                        >
                          {usuario.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{formatarData(usuario.ultimo_login)}</TableCell>
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
                                setUsuarioSelecionado(usuario)
                                setVisualizarDialogOpen(true)
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              <span>Visualizar</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="flex items-center cursor-pointer"
                              onClick={() => {
                                setUsuarioSelecionado(usuario)
                                setEditarDialogOpen(true)
                              }}
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Editar</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="flex items-center cursor-pointer"
                              onClick={() => {
                                setUsuarioSelecionado(usuario)
                                setAlterarSenhaDialogOpen(true)
                              }}
                            >
                              <Lock className="mr-2 h-4 w-4" />
                              <span>Alterar Senha</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="flex items-center text-red-600 cursor-pointer"
                              onClick={() => handleExcluirUsuario(usuario.id)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Excluir</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}

                  {usuariosFiltrados.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        Nenhum usuário encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Diálogo para Novo Usuário */}
      <Dialog open={novoUsuarioDialogOpen} onOpenChange={setNovoUsuarioDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Cadastrar Novo Usuário</DialogTitle>
            <DialogDescription>Crie um novo usuário para acesso ao sistema.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="username" className="text-right">
                Nome de Usuário*
              </Label>
              <Input
                id="username"
                name="username"
                value={novoUsuario.username}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                Senha*
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={novoUsuario.password}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nome_completo" className="text-right">
                Nome Completo*
              </Label>
              <Input
                id="nome_completo"
                name="nome_completo"
                value={novoUsuario.nome_completo}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cargo" className="text-right">
                Cargo*
              </Label>
              <Input
                id="cargo"
                name="cargo"
                value={novoUsuario.cargo}
                onChange={handleInputChange}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="status" className="text-right">
                Status
              </Label>
              <Select value={novoUsuario.status} onValueChange={(value) => handleSelectChange("status", value)}>
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
            <Button variant="outline" onClick={() => setNovoUsuarioDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAdicionarUsuario}>Cadastrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para Visualizar Usuário */}
      <Dialog open={visualizarDialogOpen} onOpenChange={setVisualizarDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
            <DialogDescription>Informações completas sobre o usuário.</DialogDescription>
          </DialogHeader>
          {usuarioSelecionado && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Nome de Usuário</Label>
                <div className="col-span-3">{usuarioSelecionado.username}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Nome Completo</Label>
                <div className="col-span-3">{usuarioSelecionado.nome_completo}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Cargo</Label>
                <div className="col-span-3">{usuarioSelecionado.cargo}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Status</Label>
                <div className="col-span-3">
                  <Badge
                    variant="outline"
                    className={
                      usuarioSelecionado.status === "Ativo" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                    }
                  >
                    {usuarioSelecionado.status}
                  </Badge>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Último Login</Label>
                <div className="col-span-3">{formatarData(usuarioSelecionado.ultimo_login)}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right font-medium">Data de Criação</Label>
                <div className="col-span-3">{formatarData(usuarioSelecionado.created_at)}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setVisualizarDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para Editar Usuário */}
      <Dialog open={editarDialogOpen} onOpenChange={setEditarDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>Atualize as informações do usuário.</DialogDescription>
          </DialogHeader>
          {usuarioSelecionado && (
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label className="text-right">Nome de Usuário</Label>
                <div className="col-span-3">{usuarioSelecionado.username}</div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-nome" className="text-right">
                  Nome Completo
                </Label>
                <Input
                  id="edit-nome"
                  value={usuarioSelecionado.nome_completo}
                  onChange={(e) =>
                    setUsuarioSelecionado({
                      ...usuarioSelecionado,
                      nome_completo: e.target.value,
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-cargo" className="text-right">
                  Cargo
                </Label>
                <Input
                  id="edit-cargo"
                  value={usuarioSelecionado.cargo}
                  onChange={(e) =>
                    setUsuarioSelecionado({
                      ...usuarioSelecionado,
                      cargo: e.target.value,
                    })
                  }
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="edit-status" className="text-right">
                  Status
                </Label>
                <Select
                  value={usuarioSelecionado.status}
                  onValueChange={(value) =>
                    setUsuarioSelecionado({
                      ...usuarioSelecionado,
                      status: value,
                    })
                  }
                >
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
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditarDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditarUsuario}>Salvar Alterações</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para Alterar Senha */}
      <Dialog open={alterarSenhaDialogOpen} onOpenChange={setAlterarSenhaDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Alterar Senha</DialogTitle>
            <DialogDescription>
              {usuarioSelecionado && `Alterar senha do usuário ${usuarioSelecionado.username}`}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nova-senha" className="text-right">
                Nova Senha
              </Label>
              <Input
                id="nova-senha"
                type="password"
                value={novaSenha.password}
                onChange={(e) => setNovaSenha({ ...novaSenha, password: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="confirmar-senha" className="text-right">
                Confirmar Senha
              </Label>
              <Input
                id="confirmar-senha"
                type="password"
                value={novaSenha.confirmPassword}
                onChange={(e) => setNovaSenha({ ...novaSenha, confirmPassword: e.target.value })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAlterarSenhaDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAlterarSenha}>Alterar Senha</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </LayoutAutenticado>
  )
}

