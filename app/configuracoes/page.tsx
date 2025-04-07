"use client"

import type React from "react"

import { useState, useEffect } from "react"
import LayoutAutenticado from "@/components/layout-autenticado"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import {
  User,
  UserPlus,
  Trash2,
  Eye,
  EyeOff,
  Pencil,
  X,
  Check,
  Loader2,
  AlertTriangle,
  Info,
  Database,
  LayoutDashboard,
  Car,
  Package,
  ArrowDownUp,
  PenToolIcon as Tool,
  Settings,
  Shield,
  Users,
} from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase, supabaseAdmin } from "@/lib/supabase"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"

interface Usuario {
  id: string
  username: string
  nome_completo: string
  cargo: string
  status?: string
  created_at?: string
}

interface Pagina {
  id: string
  nome: string
  descricao: string
  rota: string
}

interface Modulo {
  id: string
  nome: string
  descricao: string
  icone: string
  paginas: Pagina[]
}

interface Permissoes {
  modulos: string[]
  paginas: string[]
}

export default function ConfiguracoesPage() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tableExists, setTableExists] = useState(true)
  const [createTableDialogOpen, setCreateTableDialogOpen] = useState(false)
  const [permissionsError, setPermissionsError] = useState<string | null>(null)
  const [createPermissionsTableDialogOpen, setCreatePermissionsTableDialogOpen] = useState(false)
  const [editingPermissions, setEditingPermissions] = useState<string | null>(null)
  const [permissoesUsuario, setPermissoesUsuario] = useState<Record<string, Permissoes>>({})
  const [selectedPermissions, setSelectedPermissions] = useState<Permissoes>({ modulos: [], paginas: [] })

  // Estados para o formulário de novo usuário
  const [novoUsuario, setNovoUsuario] = useState({
    username: "",
    password: "",
    nome_completo: "",
    cargo: "",
    status: "Ativo",
  })

  // Estados para o formulário de edição
  const [editForm, setEditForm] = useState({
    nome_completo: "",
    cargo: "",
    status: "Ativo",
  })

  // Definição dos módulos e páginas do sistema
  const [modulos, setModulos] = useState<Modulo[]>([
    {
      id: "dashboard",
      nome: "Dashboard",
      descricao: "Painel principal do sistema",
      icone: "LayoutDashboard",
      paginas: [
        {
          id: "dashboard_principal",
          nome: "Dashboard Principal",
          descricao: "Visão geral do sistema",
          rota: "/dashboard",
        },
      ],
    },
    {
      id: "colaboradores",
      nome: "Colaboradores",
      descricao: "Gerenciamento de colaboradores",
      icone: "Users",
      paginas: [
        {
          id: "lista_colaboradores",
          nome: "Lista de Colaboradores",
          descricao: "Visualizar todos os colaboradores",
          rota: "/colaboradores",
        },
      ],
    },
    {
      id: "veiculos",
      nome: "Veículos",
      descricao: "Gerenciamento de veículos",
      icone: "Car",
      paginas: [
        {
          id: "lista_veiculos",
          nome: "Lista de Veículos",
          descricao: "Visualizar todos os veículos",
          rota: "/veiculos",
        },
      ],
    },
    {
      id: "produtos",
      nome: "Produtos",
      descricao: "Gerenciamento de produtos",
      icone: "Package",
      paginas: [
        {
          id: "lista_produtos",
          nome: "Lista de Produtos",
          descricao: "Visualizar todos os produtos",
          rota: "/produtos",
        },
      ],
    },
    {
      id: "movimento",
      nome: "Movimento",
      descricao: "Entradas e saídas",
      icone: "ArrowDownUp",
      paginas: [
        {
          id: "entradas",
          nome: "Entradas",
          descricao: "Registro de entradas",
          rota: "/movimento/entradas",
        },
        {
          id: "saidas",
          nome: "Saídas",
          descricao: "Registro de saídas",
          rota: "/movimento/saidas",
        },
      ],
    },
    {
      id: "manutencoes",
      nome: "Manutenções",
      descricao: "Manutenção de veículos",
      icone: "Tool",
      paginas: [
        {
          id: "ordem_servico",
          nome: "Ordem de Serviço",
          descricao: "Gerenciar ordens de serviço",
          rota: "/manutencoes/ordem-servico",
        },
        {
          id: "almoxarifado",
          nome: "Almoxarifado",
          descricao: "Gerenciar almoxarifado",
          rota: "/manutencoes/almoxarifado",
        },
        {
          id: "pedidos_compra",
          nome: "Pedidos de Compra",
          descricao: "Gerenciar pedidos de compra",
          rota: "/manutencoes/pedidos-compra",
        },
        {
          id: "atualizar_km",
          nome: "Atualizar KM",
          descricao: "Atualizar quilometragem dos veículos",
          rota: "/manutencoes/atualizar-km",
        },
        {
          id: "troca_oleo",
          nome: "Troca de Óleo",
          descricao: "Gerenciar trocas de óleo",
          rota: "/manutencoes/troca-oleo",
        },
        {
          id: "historicos",
          nome: "Históricos",
          descricao: "Visualizar históricos de manutenção",
          rota: "/manutencoes/historicos",
        },
      ],
    },
    {
      id: "configuracoes",
      nome: "Configurações",
      descricao: "Configurações do sistema",
      icone: "Settings",
      paginas: [
        {
          id: "configuracoes_sistema",
          nome: "Configurações do Sistema",
          descricao: "Gerenciar configurações gerais",
          rota: "/configuracoes",
        },
      ],
    },
  ])

  // Carregar usuários
  useEffect(() => {
    fetchUsuarios().then(() => {
      fetchPermissoes()
    })
  }, [])

  const fetchUsuarios = async () => {
    try {
      setLoading(true)
      setError(null)

      const { data, error } = await supabase.from("usuarios").select("*").order("created_at", { ascending: false })

      if (error) {
        // Verificar se o erro é porque a tabela não existe
        if (error.message.includes("relation") && error.message.includes("does not exist")) {
          setTableExists(false)
          setError("A tabela 'usuarios' não existe. Clique no botão abaixo para criar a tabela.")
        } else {
          throw error
        }
      } else {
        setUsuarios(data || [])
      }
    } catch (error: any) {
      console.error("Erro ao buscar usuários:", error)
      setError(error.message || "Erro ao carregar usuários")
      toast({
        title: "Erro",
        description: "Não foi possível carregar os usuários.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchPermissoes = async () => {
    try {
      // Verificar se a tabela existe
      const { data: tableExists, error: tableError } = await supabase.from("permissoes_acesso").select("*").limit(1)

      if (tableError && tableError.message.includes("does not exist")) {
        console.log("Tabela de permissões não existe, usando valores padrão")
        // Definir permissões padrão para todos os usuários
        const defaultPerms: Record<string, Permissoes> = {}
        usuarios.forEach((user) => {
          defaultPerms[user.id] = {
            modulos: modulos.map((m) => m.id),
            paginas: modulos.flatMap((m) => m.paginas.map((p) => p.id)),
          }
        })
        setPermissoesUsuario(defaultPerms)
        return
      }

      // Carregar permissões do banco de dados
      const { data, error } = await supabase.from("permissoes_acesso").select("*")

      if (error) throw error

      const permsMap: Record<string, Permissoes> = {}
      if (data) {
        data.forEach((item: any) => {
          permsMap[item.usuario_id] = {
            modulos: item.modulos || [],
            paginas: item.paginas || [],
          }
        })
      }

      // Definir permissões padrão para usuários que não têm permissões definidas
      usuarios.forEach((user) => {
        if (!permsMap[user.id]) {
          permsMap[user.id] = {
            modulos: modulos.map((m) => m.id),
            paginas: modulos.flatMap((m) => m.paginas.map((p) => p.id)),
          }
        }
      })

      setPermissoesUsuario(permsMap)
    } catch (error: any) {
      console.error("Erro ao carregar permissões:", error)
      // Definir permissões padrão em caso de erro
      const defaultPerms: Record<string, Permissoes> = {}
      usuarios.forEach((user) => {
        defaultPerms[user.id] = {
          modulos: modulos.map((m) => m.id),
          paginas: modulos.flatMap((m) => m.paginas.map((p) => p.id)),
        }
      })
      setPermissoesUsuario(defaultPerms)
    }
  }

  // Função para criar a tabela de usuários
  const handleCreateTable = async () => {
    try {
      setSubmitting(true)
      setError(null)

      // Usar o cliente admin para criar a tabela
      const { error } = await supabaseAdmin.rpc("create_usuarios_table")

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Tabela de usuários criada com sucesso!",
      })

      setTableExists(true)
      fetchUsuarios()
      setCreateTableDialogOpen(false)
    } catch (error: any) {
      console.error("Erro ao criar tabela:", error)
      setError(error.message || "Erro ao criar tabela de usuários")
      toast({
        title: "Erro",
        description: "Não foi possível criar a tabela de usuários.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

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

      setSubmitting(true)
      setError(null)

      // Verificar se o nome de usuário já existe
      const { data: existingUser, error: checkError } = await supabase
        .from("usuarios")
        .select("id")
        .eq("username", novoUsuario.username)
        .single()

      if (checkError && checkError.code !== "PGRST116") {
        throw checkError
      }

      if (existingUser) {
        toast({
          title: "Erro",
          description: "Este nome de usuário já está em uso.",
          variant: "destructive",
        })
        setSubmitting(false)
        return
      }

      // Inserir novo usuário no banco de dados
      const { data, error } = await supabase
        .from("usuarios")
        .insert([
          {
            username: novoUsuario.username,
            password: novoUsuario.password, // Em produção, isso deveria ser criptografado
            nome_completo: novoUsuario.nome_completo,
            cargo: novoUsuario.cargo,
            status: novoUsuario.status,
          },
        ])
        .select()

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Usuário cadastrado com sucesso!",
      })

      // Resetar formulário
      setNovoUsuario({
        username: "",
        password: "",
        nome_completo: "",
        cargo: "",
        status: "Ativo",
      })

      // Recarregar lista de usuários
      fetchUsuarios()
    } catch (error: any) {
      console.error("Erro ao adicionar usuário:", error)
      setError(error.message || "Erro ao adicionar usuário")
      toast({
        title: "Erro",
        description: "Não foi possível cadastrar o usuário.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Função para iniciar edição de usuário
  const handleStartEdit = (usuario: Usuario) => {
    setEditingUser(usuario.id)
    setEditForm({
      nome_completo: usuario.nome_completo,
      cargo: usuario.cargo,
      status: usuario.status || "Ativo",
    })
  }

  // Função para cancelar edição
  const handleCancelEdit = () => {
    setEditingUser(null)
  }

  // Função para salvar edição
  const handleSaveEdit = async (id: string) => {
    try {
      setSubmitting(true)
      setError(null)

      const { error } = await supabase
        .from("usuarios")
        .update({
          nome_completo: editForm.nome_completo,
          cargo: editForm.cargo,
          status: editForm.status,
        })
        .eq("id", id)

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso!",
      })

      setEditingUser(null)
      fetchUsuarios()
    } catch (error: any) {
      console.error("Erro ao atualizar usuário:", error)
      setError(error.message || "Erro ao atualizar usuário")
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o usuário.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleStartEditPermissions = (usuario: Usuario) => {
    setEditingPermissions(usuario.id)
    const userPermissions = permissoesUsuario[usuario.id] || {
      modulos: modulos.map((m) => m.id),
      paginas: modulos.flatMap((m) => m.paginas.map((p) => p.id)),
    }
    setSelectedPermissions(userPermissions)
    setPermissionsError(null)
  }

  const handleSavePermissions = async () => {
    if (!editingPermissions) return

    try {
      setSubmitting(true)
      setPermissionsError(null)

      // Verificar se a tabela existe
      const { data: tableExists, error: tableError } = await supabase.from("permissoes_acesso").select("*").limit(1)

      if (tableError && tableError.message.includes("does not exist")) {
        console.log("Tabela de permissões não existe")
        setCreatePermissionsTableDialogOpen(true)
        return
      }

      // Verificar se já existe um registro para este usuário
      const { data: existingData, error: checkError } = await supabase
        .from("permissoes_acesso")
        .select("*")
        .eq("usuario_id", editingPermissions)

      if (checkError) {
        console.error("Erro ao verificar permissões existentes:", checkError)
        throw checkError
      }

      let saveError
      if (existingData && existingData.length > 0) {
        console.log("Atualizando permissões existentes")
        // Atualizar registro existente
        const { error } = await supabase
          .from("permissoes_acesso")
          .update({
            modulos: selectedPermissions.modulos,
            paginas: selectedPermissions.paginas,
          })
          .eq("usuario_id", editingPermissions)
        saveError = error
      } else {
        console.log("Inserindo novas permissões")
        // Inserir novo registro
        const { error } = await supabase.from("permissoes_acesso").insert([
          {
            usuario_id: editingPermissions,
            modulos: selectedPermissions.modulos,
            paginas: selectedPermissions.paginas,
          },
        ])
        saveError = error
      }

      if (saveError) {
        console.error("Erro ao salvar permissões:", saveError)
        throw saveError
      }

      // Atualizar estado local
      setPermissoesUsuario((prev) => ({
        ...prev,
        [editingPermissions]: selectedPermissions,
      }))

      toast({
        title: "Sucesso",
        description: "Permissões atualizadas com sucesso!",
      })

      setEditingPermissions(null)
    } catch (error: any) {
      console.error("Erro ao salvar permissões:", error)
      setPermissionsError(error.message || "Erro desconhecido ao salvar permissões")
      toast({
        title: "Erro",
        description: `Não foi possível salvar as permissões: ${error.message || "Erro desconhecido"}`,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCreatePermissionsTable = async () => {
    try {
      setSubmitting(true)
      setPermissionsError(null)

      // Criar SQL para a tabela de permissões
      const createTableSQL = `
      CREATE TABLE IF NOT EXISTS permissoes_acesso (
        id SERIAL PRIMARY KEY,
        usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
        modulos TEXT[] NOT NULL DEFAULT '{}',
        paginas TEXT[] NOT NULL DEFAULT '{}',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(usuario_id)
      );
      
      -- Criar função para atualizar o timestamp
      CREATE OR REPLACE FUNCTION update_permissoes_acesso_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
      
      -- Criar trigger
      DROP TRIGGER IF EXISTS set_permissoes_acesso_updated_at ON permissoes_acesso;
      CREATE TRIGGER set_permissoes_acesso_updated_at
      BEFORE UPDATE ON permissoes_acesso
      FOR EACH ROW
      EXECUTE FUNCTION update_permissoes_acesso_updated_at_column();
      `

      toast({
        title: "Informação",
        description:
          "Para criar a tabela de permissões, execute o SQL fornecido no painel de administração do Supabase.",
      })

      // Copiar SQL para a área de transferência
      await navigator.clipboard.writeText(createTableSQL)

      toast({
        title: "Sucesso",
        description: "SQL copiado para a área de transferência!",
      })

      setCreatePermissionsTableDialogOpen(false)
    } catch (error: any) {
      console.error("Erro ao preparar SQL:", error)
      setPermissionsError(error.message || "Erro desconhecido")
      toast({
        title: "Erro",
        description: `Erro ao preparar SQL: ${error.message || "Erro desconhecido"}`,
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancelEditPermissions = () => {
    setEditingPermissions(null)
    setPermissionsError(null)
  }

  const toggleModulePermission = (moduleId: string) => {
    setSelectedPermissions((prev) => {
      const moduleIndex = prev.modulos.indexOf(moduleId)
      let newModulos = [...prev.modulos]
      let newPaginas = [...prev.paginas]

      // Encontrar todas as páginas deste módulo
      const modulePages = modulos.find((m) => m.id === moduleId)?.paginas.map((p) => p.id) || []

      if (moduleIndex === -1) {
        // Adicionar módulo
        newModulos.push(moduleId)
        // Adicionar todas as páginas do módulo
        modulePages.forEach((pageId) => {
          if (!newPaginas.includes(pageId)) {
            newPaginas.push(pageId)
          }
        })
      } else {
        // Remover módulo
        newModulos = newModulos.filter((id) => id !== moduleId)
        // Remover todas as páginas do módulo
        newPaginas = newPaginas.filter((id) => !modulePages.includes(id))
      }

      return {
        modulos: newModulos,
        paginas: newPaginas,
      }
    })
  }

  const togglePagePermission = (moduleId: string, pageId: string) => {
    setSelectedPermissions((prev) => {
      const pageIndex = prev.paginas.indexOf(pageId)
      let newPaginas = [...prev.paginas]
      let newModulos = [...prev.modulos]

      if (pageIndex === -1) {
        // Adicionar página
        newPaginas.push(pageId)
        // Se não tiver o módulo, adicionar também
        if (!newModulos.includes(moduleId)) {
          newModulos.push(moduleId)
        }
      } else {
        // Remover página
        newPaginas = newPaginas.filter((id) => id !== pageId)

        // Verificar se ainda há alguma página deste módulo
        const modulePages = modulos.find((m) => m.id === moduleId)?.paginas.map((p) => p.id) || []
        const hasAnyPageOfModule = modulePages.some((pageId) => newPaginas.includes(pageId))

        // Se não houver mais páginas deste módulo, remover o módulo também
        if (!hasAnyPageOfModule) {
          newModulos = newModulos.filter((id) => id !== moduleId)
        }
      }

      return {
        modulos: newModulos,
        paginas: newPaginas,
      }
    })
  }

  // Função para confirmar exclusão
  const handleConfirmDelete = (id: string) => {
    setUserToDelete(id)
    setDeleteDialogOpen(true)
  }

  // Função para excluir usuário
  const handleExcluirUsuario = async () => {
    if (!userToDelete) return

    try {
      setSubmitting(true)
      setError(null)

      const { error } = await supabase.from("usuarios").delete().eq("id", userToDelete)

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Usuário excluído com sucesso!",
      })

      fetchUsuarios()
    } catch (error: any) {
      console.error("Erro ao excluir usuário:", error)
      setError(error.message || "Erro ao excluir usuário")
      toast({
        title: "Erro",
        description: "Não foi possível excluir o usuário.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
      setDeleteDialogOpen(false)
      setUserToDelete(null)
    }
  }

  // Função para atualizar campo de edição
  const handleEditChange = (field: string, value: string) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  const getModuleIcon = (iconName: string) => {
    switch (iconName) {
      case "LayoutDashboard":
        return <LayoutDashboard className="h-4 w-4" />
      case "Users":
        return <Users className="h-4 w-4" />
      case "Car":
        return <Car className="h-4 w-4" />
      case "Package":
        return <Package className="h-4 w-4" />
      case "ArrowDownUp":
        return <ArrowDownUp className="h-4 w-4" />
      case "Tool":
        return <Tool className="h-4 w-4" />
      case "Settings":
        return <Settings className="h-4 w-4" />
      default:
        return <Info className="h-4 w-4" />
    }
  }

  return (
    <LayoutAutenticado>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Configurações</h2>
          <p className="text-muted-foreground">Gerencie os usuários do sistema.</p>
        </div>

        {!tableExists && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Tabela não encontrada</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <p>A tabela 'usuarios' não existe no banco de dados. Execute o script SQL para criar a tabela.</p>
              <Button variant="outline" className="w-fit" onClick={() => setCreateTableDialogOpen(true)}>
                <Database className="mr-2 h-4 w-4" />
                Criar tabela de usuários
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Gerenciar Usuários
            </CardTitle>
            <CardDescription>Adicione, edite ou remova usuários do sistema.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Adicionar Novo Usuário</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Nome de Usuário*</Label>
                  <Input id="username" name="username" value={novoUsuario.username} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha*</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      name="password"
                      type={showPassword ? "text" : "password"}
                      value={novoUsuario.password}
                      onChange={handleInputChange}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nome_completo">Nome Completo*</Label>
                  <Input
                    id="nome_completo"
                    name="nome_completo"
                    value={novoUsuario.nome_completo}
                    onChange={handleInputChange}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cargo">Cargo*</Label>
                  <Input id="cargo" name="cargo" value={novoUsuario.cargo} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select value={novoUsuario.status} onValueChange={(value) => handleSelectChange("status", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Ativo">Ativo</SelectItem>
                      <SelectItem value="Inativo">Inativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button
                onClick={handleAdicionarUsuario}
                disabled={submitting || !tableExists}
                className="flex items-center gap-2"
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                Adicionar Usuário
              </Button>
            </div>

            <Separator />

            <div className="space-y-4">
              <h3 className="text-lg font-medium">Usuários Cadastrados</h3>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                </div>
              ) : (
                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome de Usuário</TableHead>
                        <TableHead>Nome Completo</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usuarios.map((usuario) => (
                        <TableRow key={usuario.id}>
                          <TableCell className="font-medium">{usuario.username}</TableCell>
                          <TableCell>
                            {editingUser === usuario.id ? (
                              <Input
                                value={editForm.nome_completo}
                                onChange={(e) => handleEditChange("nome_completo", e.target.value)}
                                className="h-8 py-1"
                              />
                            ) : (
                              usuario.nome_completo
                            )}
                          </TableCell>
                          <TableCell>
                            {editingUser === usuario.id ? (
                              <Input
                                value={editForm.cargo}
                                onChange={(e) => handleEditChange("cargo", e.target.value)}
                                className="h-8 py-1"
                              />
                            ) : (
                              usuario.cargo
                            )}
                          </TableCell>
                          <TableCell>
                            {editingUser === usuario.id ? (
                              <Select value={editForm.status} onChange={(value) => handleEditChange("status", value)}>
                                <SelectTrigger className="h-8">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Ativo">Ativo</SelectItem>
                                  <SelectItem value="Inativo">Inativo</SelectItem>
                                </SelectContent>
                              </Select>
                            ) : (
                              <span
                                className={`px-2 py-1 rounded-full text-xs ${
                                  usuario.status === "Ativo"
                                    ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100"
                                }`}
                              >
                                {usuario.status || "Ativo"}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {editingUser === usuario.id ? (
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSaveEdit(usuario.id)}
                                  disabled={submitting}
                                  className="h-8 w-8 p-0"
                                >
                                  {submitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4 text-green-600" />
                                  )}
                                </Button>
                                <Button variant="ghost" size="sm" onClick={handleCancelEdit} className="h-8 w-8 p-0">
                                  <X className="h-4 w-4 text-red-600" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStartEdit(usuario)}
                                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStartEditPermissions(usuario)}
                                  className="h-8 w-8 p-0 text-purple-600 hover:text-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950"
                                  title="Gerenciar permissões"
                                >
                                  <Shield className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleConfirmDelete(usuario.id)}
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50 dark:hover:bg-red-950"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {usuarios.length === 0 && !error && (
                        <TableRow>
                          <TableCell colSpan={5} className="h-24 text-center">
                            Nenhum usuário encontrado.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Diálogo de confirmação para exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleExcluirUsuario}
              className="bg-red-600 hover:bg-red-700"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Excluindo...
                </>
              ) : (
                "Excluir"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo para criar tabela */}
      <AlertDialog open={createTableDialogOpen} onOpenChange={setCreateTableDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Criar tabela de usuários</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="mb-4">
                Você está prestes a criar a tabela 'usuarios' no banco de dados. Esta ação criará a estrutura necessária
                para o gerenciamento de usuários.
              </div>
              <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-60">
                {`-- Este script será executado:
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_ossp.uuid_generate_v4(),
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  nome_completo VARCHAR(255) NOT NULL,
  cargo VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'Ativo',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar função para atualizar o timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Inserir usuário admin
INSERT INTO usuarios (username, password, nome_completo, cargo, status)
VALUES ('admin', 'admin123', 'Administrador do Sistema', 'Administrador', 'Ativo')
ON CONFLICT (username) DO NOTHING;`}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateTable} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                "Criar Tabela"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo para criar tabela de permissões */}
      <AlertDialog open={createPermissionsTableDialogOpen} onOpenChange={setCreatePermissionsTableDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Criar tabela de permissões</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="mb-4">
                A tabela 'permissoes_acesso' não existe no banco de dados. Para criar esta tabela, você precisará
                executar o seguinte SQL no painel de administração do Supabase:
              </div>
              <div className="bg-muted p-3 rounded-md text-xs font-mono overflow-auto max-h-60">
                {`CREATE TABLE IF NOT EXISTS permissoes_acesso (
  id SERIAL PRIMARY KEY,
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  modulos TEXT[] NOT NULL DEFAULT '{}',
  paginas TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(usuario_id)
);

-- Criar função para atualizar o timestamp
CREATE OR REPLACE FUNCTION update_permissoes_acesso_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger
DROP TRIGGER IF EXISTS set_permissoes_acesso_updated_at ON permissoes_acesso;
CREATE TRIGGER set_permissoes_acesso_updated_at
BEFORE UPDATE ON permissoes_acesso
FOR EACH ROW
EXECUTE FUNCTION update_permissoes_acesso_updated_at_column();`}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreatePermissionsTable} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Copiando SQL...
                </>
              ) : (
                "Copiar SQL"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo para editar permissões */}
      <Dialog open={editingPermissions !== null} onOpenChange={(open) => !open && setEditingPermissions(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Gerenciar Permissões de Acesso
            </DialogTitle>
            <DialogDescription>
              Selecione quais módulos e páginas este usuário terá acesso. Marcar um módulo concede acesso a todas as
              suas páginas.
            </DialogDescription>
          </DialogHeader>

          {permissionsError && (
            <Alert variant="destructive" className="mt-2">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Erro</AlertTitle>
              <AlertDescription>{permissionsError}</AlertDescription>
            </Alert>
          )}

          <div className="py-4">
            <Accordion type="multiple" className="w-full">
              {modulos.map((modulo) => (
                <AccordionItem key={modulo.id} value={modulo.id}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-start space-x-3 space-y-0">
                      <Checkbox
                        id={`module-${modulo.id}`}
                        checked={selectedPermissions.modulos.includes(modulo.id)}
                        onCheckedChange={() => toggleModulePermission(modulo.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div className="grid gap-1.5 leading-none">
                        <label
                          htmlFor={`module-${modulo.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleModulePermission(modulo.id)
                          }}
                        >
                          {getModuleIcon(modulo.icone)}
                          {modulo.nome}
                        </label>
                        <p className="text-sm text-muted-foreground">{modulo.descricao}</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pl-10 space-y-3">
                      {modulo.paginas.map((pagina) => (
                        <div key={pagina.id} className="flex items-start space-x-3 space-y-0">
                          <Checkbox
                            id={`page-${pagina.id}`}
                            checked={selectedPermissions.paginas.includes(pagina.id)}
                            onCheckedChange={() => togglePagePermission(modulo.id, pagina.id)}
                          />
                          <div className="grid gap-1.5 leading-none">
                            <label
                              htmlFor={`page-${pagina.id}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                            >
                              {pagina.nome}
                            </label>
                            <p className="text-xs text-muted-foreground">{pagina.descricao}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelEditPermissions}>
              Cancelar
            </Button>
            <Button onClick={handleSavePermissions} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                "Salvar Permissões"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Toaster />
    </LayoutAutenticado>
  )
}

