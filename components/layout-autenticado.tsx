"use client"

import type React from "react"

import { useEffect, useState, useRef } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { useTheme } from "next-themes"
import {
  LayoutDashboard,
  Users,
  LogOut,
  Car,
  Package,
  ArrowDownUp,
  ArrowDown,
  ArrowUp,
  Settings,
  ChevronLeft,
  PenToolIcon as Tool,
  FileText,
  ShoppingCart,
  Gauge,
  FuelIcon as Oil,
  History,
  Moon,
  Sun,
  Menu,
  X,
  WarehouseIcon,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase"
import { useMediaQuery } from "@/hooks/use-media-query"

interface UserData {
  id: string
  username: string
  nome: string
  cargo: string
}

interface Permissoes {
  modulos: string[]
  paginas: string[]
}

export default function LayoutAutenticado({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [movimentoOpen, setMovimentoOpen] = useState(false)
  const [manutencoesOpen, setManutencoesOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [permissoes, setPermissoes] = useState<Permissoes>({
    modulos: [],
    paginas: [],
  })
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [permissoesCarregadas, setPermissoesCarregadas] = useState(false)
  const [carregandoPermissoes, setCarregandoPermissoes] = useState(true)

  // Verificar se é um dispositivo móvel
  const isMobile = useMediaQuery("(max-width: 768px)")

  // Referência para o conteúdo principal
  const mainContentRef = useRef<HTMLDivElement>(null)

  // Marcar quando o componente estiver montado
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    // Load sidebar state from localStorage on component mount
    if (typeof window !== "undefined") {
      const savedState = localStorage.getItem("sidebar:collapsed")
      if (savedState !== null) {
        setSidebarCollapsed(savedState === "true")
      }

      // Em dispositivos móveis, sempre começar com a barra lateral recolhida
      if (isMobile) {
        setSidebarCollapsed(true)
      }
    }
  }, [isMobile])

  // Fechar o menu móvel quando o caminho mudar
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  // Rolar para o topo quando o caminho mudar
  useEffect(() => {
    if (mainContentRef.current) {
      mainContentRef.current.scrollTop = 0
    }
  }, [pathname])

  useEffect(() => {
    const carregarPermissoes = async () => {
      if (!userData) return

      try {
        setCarregandoPermissoes(true)
        console.log("Carregando permissões para o usuário:", userData.id)

        // Tentar carregar permissões do banco de dados
        const { data, error } = await supabase
          .from("permissoes_acesso")
          .select("modulos, paginas")
          .eq("usuario_id", userData.id)
          .single()

        if (error) {
          console.log("Erro ao carregar permissões:", error)
          // Se houver erro, definir todas as permissões como padrão
          setPermissoes({
            modulos: [
              "dashboard",
              "colaboradores",
              "veiculos",
              "produtos",
              "movimento",
              "manutencoes",
              "configuracoes",
            ],
            paginas: [
              "dashboard_principal",
              "lista_colaboradores",
              "lista_veiculos",
              "lista_produtos",
              "entradas",
              "saidas",
              "ordem_servico",
              "almoxarifado",
              "pedidos_compra",
              "atualizar_km",
              "troca_oleo",
              "historicos",
              "configuracoes_sistema",
            ],
          })
          console.log("Usando permissões padrão")
        } else if (data) {
          console.log("Permissões carregadas do banco:", data)
          setPermissoes({
            modulos: data.modulos || [],
            paginas: data.paginas || [],
          })
        } else {
          console.log("Nenhum dado de permissão encontrado, usando padrão")
          // Se não houver dados, definir todas as permissões como padrão
          setPermissoes({
            modulos: [
              "dashboard",
              "colaboradores",
              "veiculos",
              "produtos",
              "movimento",
              "manutencoes",
              "configuracoes",
            ],
            paginas: [
              "dashboard_principal",
              "lista_colaboradores",
              "lista_veiculos",
              "lista_produtos",
              "entradas",
              "saidas",
              "ordem_servico",
              "almoxarifado",
              "pedidos_compra",
              "atualizar_km",
              "troca_oleo",
              "historicos",
              "configuracoes_sistema",
            ],
          })
        }
      } catch (error) {
        console.error("Erro ao carregar permissões:", error)
        // Em caso de erro, definir todas as permissões como padrão
        setPermissoes({
          modulos: ["dashboard", "colaboradores", "veiculos", "produtos", "movimento", "manutencoes", "configuracoes"],
          paginas: [
            "dashboard_principal",
            "lista_colaboradores",
            "lista_veiculos",
            "lista_produtos",
            "entradas",
            "saidas",
            "ordem_servico",
            "almoxarifado",
            "pedidos_compra",
            "atualizar_km",
            "troca_oleo",
            "historicos",
            "configuracoes_sistema",
          ],
        })
        console.log("Erro ao carregar permissões, usando padrão")
      } finally {
        setPermissoesCarregadas(true)
        setCarregandoPermissoes(false)
      }
    }

    carregarPermissoes()
  }, [userData])

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed
    setSidebarCollapsed(newState)
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebar:collapsed", String(newState))
    }
  }

  useEffect(() => {
    // Verificar se o usuário está logado
    if (typeof window !== "undefined") {
      const storedData = localStorage.getItem("userData")
      if (!storedData) {
        router.push("/")
        return
      }

      try {
        const parsedData = JSON.parse(storedData)
        if (!parsedData.isLoggedIn) {
          router.push("/")
          return
        }
        setUserData(parsedData)
      } catch (err) {
        console.error("Erro ao processar dados do usuário:", err)
        router.push("/")
      }
    }
  }, [router])

  // Verificar se o caminho atual está relacionado a movimento para expandir automaticamente
  useEffect(() => {
    if (pathname?.includes("/movimento")) {
      setMovimentoOpen(true)
    }
    if (pathname?.includes("/manutencoes")) {
      setManutencoesOpen(true)
    }
  }, [pathname])

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("userData")
      router.push("/")
    }
  }

  // Verificar se o usuário tem permissão para acessar um módulo
  const hasModulePermission = (moduleId: string) => {
    return permissoes.modulos.includes(moduleId)
  }

  // Verificar se o usuário tem permissão para acessar uma página
  const hasPagePermission = (pageId: string) => {
    if (!pageId) return true // Se não tiver pageId, permitir acesso
    return permissoes.paginas.includes(pageId)
  }

  // Mapear rotas para IDs de páginas
  const getPageIdFromRoute = (route: string): string => {
    const routeMap: Record<string, string> = {
      "/dashboard": "dashboard_principal",
      "/colaboradores": "lista_colaboradores",
      "/veiculos": "lista_veiculos",
      "/produtos": "lista_produtos",
      "/movimento/entradas": "entradas",
      "/movimento/saidas": "saidas",
      "/manutencoes/ordem-servico": "ordem_servico",
      "/manutencoes/almoxarifado": "almoxarifado",
      "/manutencoes/pedidos-compra": "pedidos_compra",
      "/manutencoes/atualizar-km": "atualizar_km",
      "/manutencoes/troca-oleo": "troca_oleo",
      "/manutencoes/historicos": "historicos",
      "/configuracoes": "configuracoes_sistema",
    }
    return routeMap[route] || ""
  }

  // Verificar se o usuário tem permissão para acessar a rota atual
  useEffect(() => {
    if (!permissoesCarregadas || !pathname || !userData || carregandoPermissoes) return

    const pageId = getPageIdFromRoute(pathname)
    console.log("Verificando permissão para:", pathname, "pageId:", pageId, "permissões:", permissoes)

    // Se não tiver pageId, significa que é uma rota que não precisa de verificação específica
    if (!pageId) return

    // Se não tiver permissão para a página
    if (!hasPagePermission(pageId)) {
      console.log("Usuário não tem permissão para:", pageId)
      // Redirecionar para o dashboard ou primeira página permitida
      if (hasPagePermission("dashboard_principal")) {
        router.push("/dashboard")
      } else {
        // Encontrar a primeira página permitida
        const firstAllowedModule = permissoes.modulos[0]
        if (firstAllowedModule === "dashboard") router.push("/dashboard")
        else if (firstAllowedModule === "colaboradores") router.push("/colaboradores")
        else if (firstAllowedModule === "veiculos") router.push("/veiculos")
        else if (firstAllowedModule === "produtos") router.push("/produtos")
        else if (firstAllowedModule === "movimento") router.push("/movimento/entradas")
        else if (firstAllowedModule === "manutencoes") router.push("/manutencoes/ordem-servico")
        else if (firstAllowedModule === "configuracoes") router.push("/configuracoes")
        else router.push("/dashboard") // Fallback
      }
    }
  }, [pathname, userData, permissoes, permissoesCarregadas, carregandoPermissoes, router])

  if (!userData) {
    return (
      <div className="flex h-screen items-center justify-center dark:bg-gray-900">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p>Carregando...</p>
        </div>
      </div>
    )
  }

  // Renderizar o menu de navegação
  const renderNavigation = () => (
    <nav className="flex-1 p-3 overflow-y-auto">
      <ul className="space-y-1.5">
        <li>
          {hasModulePermission("dashboard") && (
            <Link
              href="/dashboard"
              className={cn(
                "flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs",
                pathname === "/dashboard" && "bg-gray-100 dark:bg-gray-800 font-medium",
              )}
            >
              <LayoutDashboard className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              {!sidebarCollapsed && <span className="dark:text-gray-200">Dashboard</span>}
            </Link>
          )}
        </li>
        <li>
          {hasModulePermission("colaboradores") && (
            <Link
              href="/colaboradores"
              className={cn(
                "flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs",
                pathname === "/colaboradores" && "bg-gray-100 dark:bg-gray-800 font-medium",
              )}
            >
              <Users className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              {!sidebarCollapsed && <span className="dark:text-gray-200">Colaboradores</span>}
            </Link>
          )}
        </li>
        <li>
          {hasModulePermission("veiculos") && (
            <Link
              href="/veiculos"
              className={cn(
                "flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs",
                pathname === "/veiculos" && "bg-gray-100 dark:bg-gray-800 font-medium",
              )}
            >
              <Car className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              {!sidebarCollapsed && <span className="dark:text-gray-200">Veículos</span>}
            </Link>
          )}
        </li>
        <li>
          {hasModulePermission("produtos") && (
            <Link
              href="/produtos"
              className={cn(
                "flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs",
                pathname === "/produtos" && "bg-gray-100 dark:bg-gray-800 font-medium",
              )}
            >
              <Package className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              {!sidebarCollapsed && <span className="dark:text-gray-200">Produtos</span>}
            </Link>
          )}
        </li>
        <li>
          {hasModulePermission("movimento") &&
            (sidebarCollapsed ? (
              <Link
                href="/movimento/entradas"
                className={cn(
                  "flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs",
                  (pathname === "/movimento/entradas" || pathname === "/movimento/saidas") &&
                    "bg-gray-100 dark:bg-gray-800 font-medium",
                )}
              >
                <ArrowDownUp className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </Link>
            ) : (
              <Collapsible open={movimentoOpen} onOpenChange={setMovimentoOpen} className="w-full">
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs">
                  <div className="flex items-center gap-2">
                    <ArrowDownUp className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="dark:text-gray-200">Movimento</span>
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">
                    {movimentoOpen ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-chevron-up"
                      >
                        <path d="m18 15-6-6-6 6" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-chevron-down"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-6">
                  <ul className="space-y-1 mt-1">
                    <li>
                      {hasPagePermission("entradas") && (
                        <Link
                          href="/movimento/entradas"
                          className={cn(
                            "flex items-center gap-2 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs",
                            pathname === "/movimento/entradas" && "bg-gray-100 dark:bg-gray-800 font-medium",
                          )}
                        >
                          <ArrowDown className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                          <span className="dark:text-gray-200">Entradas</span>
                        </Link>
                      )}
                    </li>
                    <li>
                      {hasPagePermission("saidas") && (
                        <Link
                          href="/movimento/saidas"
                          className={cn(
                            "flex items-center gap-2 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs",
                            pathname === "/movimento/saidas" && "bg-gray-100 dark:bg-gray-800 font-medium",
                          )}
                        >
                          <ArrowUp className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                          <span className="dark:text-gray-200">Saídas</span>
                        </Link>
                      )}
                    </li>
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            ))}
        </li>
        <li>
          {hasModulePermission("manutencoes") &&
            (sidebarCollapsed ? (
              <Link
                href="/manutencoes/ordem-servico"
                className={cn(
                  "flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs",
                  pathname?.includes("/manutencoes") && "bg-gray-100 dark:bg-gray-800 font-medium",
                )}
              >
                <Tool className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              </Link>
            ) : (
              <Collapsible open={manutencoesOpen} onOpenChange={setManutencoesOpen} className="w-full">
                <CollapsibleTrigger className="flex items-center justify-between w-full p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs">
                  <div className="flex items-center gap-2">
                    <Tool className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="dark:text-gray-200">Manutenções</span>
                  </div>
                  <div className="text-gray-500 dark:text-gray-400">
                    {manutencoesOpen ? (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-chevron-up"
                      >
                        <path d="m18 15-6-6-6 6" />
                      </svg>
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="lucide lucide-chevron-down"
                      >
                        <path d="m6 9 6 6 6-6" />
                      </svg>
                    )}
                  </div>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-6">
                  <ul className="space-y-1 mt-1">
                    <li>
                      {hasPagePermission("ordem_servico") && (
                        <Link
                          href="/manutencoes/ordem-servico"
                          className={cn(
                            "flex items-center gap-2 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs",
                            pathname === "/manutencoes/ordem-servico" && "bg-gray-100 dark:bg-gray-800 font-medium",
                          )}
                        >
                          <FileText className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                          <span className="dark:text-gray-200">Ordem de Serviço</span>
                        </Link>
                      )}
                    </li>
                    <li>
                      {hasPagePermission("almoxarifado") && (
                        <Link
                          href="/manutencoes/almoxarifado"
                          className={cn(
                            "flex items-center gap-2 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs",
                            pathname === "/manutencoes/almoxarifado" && "bg-gray-100 dark:bg-gray-800 font-medium",
                          )}
                        >
                          <WarehouseIcon className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                          <span className="dark:text-gray-200">Almoxarifado</span>
                        </Link>
                      )}
                    </li>
                    <li>
                      {hasPagePermission("pedidos_compra") && (
                        <Link
                          href="/manutencoes/pedidos-compra"
                          className={cn(
                            "flex items-center gap-2 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs",
                            pathname === "/manutencoes/pedidos-compra" && "bg-gray-100 dark:bg-gray-800 font-medium",
                          )}
                        >
                          <ShoppingCart className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                          <span className="dark:text-gray-200">Pedidos de Compra</span>
                        </Link>
                      )}
                    </li>
                    <li>
                      {hasPagePermission("atualizar_km") && (
                        <Link
                          href="/manutencoes/atualizar-km"
                          className={cn(
                            "flex items-center gap-2 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs",
                            pathname === "/manutencoes/atualizar-km" && "bg-gray-100 dark:bg-gray-800 font-medium",
                          )}
                        >
                          <Gauge className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                          <span className="dark:text-gray-200">Atualizar KM</span>
                        </Link>
                      )}
                    </li>
                    <li>
                      {hasPagePermission("troca_oleo") && (
                        <Link
                          href="/manutencoes/troca-oleo"
                          className={cn(
                            "flex items-center gap-2 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs",
                            pathname === "/manutencoes/troca-oleo" && "bg-gray-100 dark:bg-gray-800 font-medium",
                          )}
                        >
                          <Oil className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                          <span className="dark:text-gray-200">Troca de Óleo</span>
                        </Link>
                      )}
                    </li>
                    <li>
                      {hasPagePermission("historicos") && (
                        <Link
                          href="/manutencoes/historicos"
                          className={cn(
                            "flex items-center gap-2 p-1.5 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs",
                            pathname === "/manutencoes/historicos" && "bg-gray-100 dark:bg-gray-800 font-medium",
                          )}
                        >
                          <History className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                          <span className="dark:text-gray-200">Históricos</span>
                        </Link>
                      )}
                    </li>
                  </ul>
                </CollapsibleContent>
              </Collapsible>
            ))}
        </li>
        <li>
          {hasModulePermission("configuracoes") && (
            <Link
              href="/configuracoes"
              className={cn(
                "flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-xs",
                pathname === "/configuracoes" && "bg-gray-100 dark:bg-gray-800 font-medium",
              )}
            >
              <Settings className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              {!sidebarCollapsed && <span className="dark:text-gray-200">Configurações</span>}
            </Link>
          )}
        </li>
      </ul>
    </nav>
  )

  // Renderizar o rodapé do menu
  const renderFooter = () => (
    <div className={`p-3 border-t dark:border-gray-800 ${sidebarCollapsed ? "flex justify-center" : ""}`}>
      {sidebarCollapsed ? (
        <Button variant="ghost" size="icon" className="h-8 w-8 dark:text-gray-300" onClick={handleLogout}>
          <LogOut className="h-4 w-4" />
        </Button>
      ) : (
        <>
          <div className="mb-3 p-2.5 bg-gray-100 dark:bg-gray-800 rounded-md">
            <p className="font-medium text-xs dark:text-gray-300">{userData.nome}</p>
            <p className="text-xs text-gray-500 dark:text-gray-300">{userData.cargo}</p>
          </div>
          <Button
            variant="outline"
            className="w-full flex items-center gap-2 justify-start text-xs h-8 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800"
            onClick={handleLogout}
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sair</span>
          </Button>
        </>
      )}
    </div>
  )

  // Não renderizar nada durante a montagem do componente no servidor
  if (!mounted) {
    return (
      <div className="flex h-screen items-center justify-center dark:bg-gray-900">
        <div className="text-center">
          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
          <p>Carregando...</p>
        </div>
      </div>
    )
  }

  // Versão simplificada para dispositivos móveis
  if (isMobile) {
    return (
      <div className="flex h-screen flex-col text-sm">
        <header className="h-16 border-b dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between px-4">
          <div className="flex items-center">
            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(true)} className="mr-2">
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center">
              <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-[9px] mr-2">
                ST
              </div>
              <h1 className="text-base font-semibold dark:text-white">SEMTRANSP</h1>
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => (theme === "dark" ? setTheme("light") : setTheme("dark"))}
            className="h-8 w-8"
            aria-label="Alternar tema"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </header>

        {/* Menu móvel como drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
            <div
              className="fixed inset-y-0 left-0 w-[280px] bg-white dark:bg-gray-900 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="h-16 px-4 flex items-center justify-between border-b dark:border-gray-800">
                <div className="flex items-center">
                  <div className="h-9 w-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-[9px] mr-2">
                    ST
                  </div>
                  <div className="ml-1">
                    <h1 className="text-lg font-bold text-primary">SEMTRANSP</h1>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Sistema de Gestão</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setMobileMenuOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Navegação móvel */}
              <div className="flex flex-col h-[calc(100%-4rem)]">
                <div className="flex-1 overflow-y-auto">{renderNavigation()}</div>

                {/* Rodapé móvel */}
                <div className="p-3 border-t dark:border-gray-800">
                  <div className="mb-3 p-2.5 bg-gray-100 dark:bg-gray-800 rounded-md">
                    <p className="font-medium text-xs dark:text-gray-300">{userData.nome}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-300">{userData.cargo}</p>
                  </div>
                  <Button
                    variant="outline"
                    className="w-full flex items-center gap-2 justify-start text-xs h-8 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-800"
                    onClick={handleLogout}
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sair</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <main ref={mainContentRef} className="flex-1 overflow-auto p-4 bg-gray-50 dark:bg-gray-900">
          {children}
        </main>

        <footer className="py-2 px-4 border-t dark:border-gray-800 bg-white dark:bg-gray-900 text-center text-xs text-gray-500 dark:text-gray-300">
          © 2025 Christian Nunes Marvila ® - Todos os direitos reservados
        </footer>
      </div>
    )
  }

  // Versão para desktop
  return (
    <div className="flex h-screen text-sm">
      {/* Menu Lateral para Desktop */}
      <div
        className={`bg-white dark:bg-gray-900 border-r dark:border-gray-800 shadow-sm flex flex-col transition-all duration-300 relative ${
          sidebarCollapsed ? "w-20" : "w-64"
        }`}
      >
        <div className="h-16 px-4 flex items-center border-b dark:border-gray-800">
          <div className="flex items-center">
            <div className="flex items-center">
              <div className="h-9 w-9 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-[9px] mr-2">
                ST
              </div>
              {!sidebarCollapsed && (
                <div className="ml-1">
                  <h1 className="text-lg font-bold text-primary">SEMTRANSP</h1>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Sistema de Gestão</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Botão de toggle posicionado na borda direita */}
        <Button
          variant="ghost"
          size="sm"
          className={`h-5 w-5 p-0 absolute top-5 -right-2.5 z-10 dark:text-gray-300`}
          onClick={toggleSidebar}
          title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          <ChevronLeft className={`h-3 w-3 ${sidebarCollapsed ? "rotate-180" : ""}`} />
        </Button>

        {renderNavigation()}
        {renderFooter()}
      </div>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 border-b dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between px-6">
          <h1 className="text-base font-semibold dark:text-white">Sistema de Gestão SEMTRANSP</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => (theme === "dark" ? setTheme("light") : setTheme("dark"))}
            className="h-8 w-8"
            aria-label="Alternar tema"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </header>

        <main ref={mainContentRef} className="flex-1 overflow-auto p-6 bg-gray-50 dark:bg-gray-900">
          {children}
        </main>

        <footer className="py-2 px-6 border-t dark:border-gray-800 bg-white dark:bg-gray-900 text-center text-xs text-gray-500 dark:text-gray-300">
          © 2025 Christian Nunes Marvila ® - Todos os direitos reservados
        </footer>
      </div>
    </div>
  )
}

