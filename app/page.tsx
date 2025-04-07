"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { supabase } from "@/lib/supabase"

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "connected" | "error">("checking")
  const [showAbout, setShowAbout] = useState(false)

  // Verificar se o usuário já está logado
  useEffect(() => {
    const userData = localStorage.getItem("userData")
    if (userData) {
      try {
        const parsedData = JSON.parse(userData)
        if (parsedData.isLoggedIn) {
          router.push("/dashboard")
        }
      } catch (err) {
        console.error("Erro ao processar dados do usuário:", err)
      }
    }
  }, [router])

  // Verificar conexão com o Supabase quando o componente montar
  useEffect(() => {
    const checkConnection = async () => {
      try {
        // Teste simples para verificar a conexão
        const { error } = await supabase.from("usuarios").select("count", { count: "exact", head: true })

        if (error) {
          console.error("Erro ao conectar com Supabase:", error)
          setConnectionStatus("error")
        } else {
          setConnectionStatus("connected")
        }
      } catch (err) {
        console.error("Erro ao verificar conexão:", err)
        setConnectionStatus("error")
      }
    }

    checkConnection()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      // Verificar credenciais no banco de dados
      const { data, error: queryError } = await supabase
        .from("usuarios")
        .select("*")
        .eq("username", username)
        .eq("password", password)
        .limit(1)

      if (queryError) {
        console.error("Erro na consulta:", queryError)
        throw new Error(`Erro na consulta: ${queryError.message}`)
      }

      if (!data || data.length === 0) {
        throw new Error("Usuário ou senha incorretos. Por favor, tente novamente.")
      }

      const userData = data[0]

      // Atualizar o último login (não bloquear o fluxo se falhar)
      supabase
        .from("usuarios")
        .update({ ultimo_login: new Date().toISOString() })
        .eq("id", userData.id)
        .then(({ error }) => {
          if (error) console.warn("Erro ao atualizar último login:", error)
        })

      // Armazenar informações do usuário no localStorage
      localStorage.setItem(
        "userData",
        JSON.stringify({
          id: userData.id,
          username: userData.username,
          nome: userData.nome_completo,
          cargo: userData.cargo,
          isLoggedIn: true,
        }),
      )

      console.log("Login bem-sucedido, redirecionando para /dashboard")

      // Redirecionar para o dashboard
      window.location.href = "/dashboard"
    } catch (err) {
      console.error("Erro ao fazer login:", err)
      setError(err instanceof Error ? err.message : "Ocorreu um erro ao fazer login.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-100">
      {/* Barra de navegação */}
      <nav className="bg-blue-700 text-white shadow-md">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 120 120"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-white"
            >
              {/* Versão mini do ícone para a navbar */}
              <rect x="5" y="20" width="50" height="55" rx="3" ry="3" />
              <circle cx="15" cy="75" r="6" />
              <circle cx="45" cy="75" r="6" />
              <path d="M65,45 L65,75 Q65,80 70,80 L100,80 Q105,80 105,75 L105,45 Q105,40 100,40 L70,40 Q65,40 65,45 Z" />
              <circle cx="75" cy="80" r="6" />
              <circle cx="95" cy="80" r="6" />
            </svg>
            <span className="font-bold text-lg">SEMTRANSP</span>
          </div>
          <div className="flex space-x-6">
            <button onClick={() => setShowAbout(true)} className="hover:text-blue-200 transition-colors font-medium">
              Sobre
            </button>
            <button
              onClick={() => setShowAbout(false)}
              className={`transition-colors font-medium ${!showAbout ? "text-white underline" : "hover:text-blue-200"}`}
            >
              Login
            </button>
          </div>
        </div>
      </nav>

      {/* Conteúdo principal */}
      {showAbout ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-3xl shadow-lg">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="h-24 w-24 bg-blue-600 rounded-full flex items-center justify-center p-1">
                  <img src="/logo.png" alt="Logo SEMTRANSP" className="w-full h-full object-cover" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold text-primary">Sobre o SEMTRANSP</CardTitle>
              <CardDescription>Sistema de Gestão da Secretaria Municipal de Transportes de Italva</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Nossa Missão</h3>
                <p className="text-gray-700">
                  A Secretaria Municipal de Transportes de Italva (SEMTRANSP) tem como missão garantir a mobilidade
                  urbana eficiente e segura para todos os cidadãos, através da gestão responsável dos recursos e da
                  frota municipal.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Sobre o Sistema</h3>
                <p className="text-gray-700">
                  O Sistema de Gestão SEMTRANSP foi desenvolvido para otimizar o controle da frota municipal, gerenciar
                  manutenções preventivas e corretivas, controlar o estoque de peças e insumos, além de facilitar a
                  gestão de colaboradores e motoristas.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Principais Funcionalidades</h3>
                <ul className="list-disc pl-5 text-gray-700 space-y-1">
                  <li>Cadastro e controle de veículos</li>
                  <li>Agendamento e registro de manutenções</li>
                  <li>Controle de estoque de peças e produtos</li>
                  <li>Gestão de colaboradores e motoristas</li>
                  <li>Registro de entradas e saídas de produtos</li>
                  <li>Relatórios gerenciais</li>
                  <li>Controle de trocas de óleo e revisões</li>
                </ul>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Contato</h3>
                <p className="text-gray-700">
                  Para mais informações, entre em contato com a Secretaria Municipal de Transportes de Italva.
                </p>
                <p className="text-gray-700 mt-1">
                  Email: contato@semtransp.italva.rj.gov.br
                  <br />
                  Telefone: (22) 1234-5678
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex justify-center text-sm text-muted-foreground">
              © 2025 Christian Nunes Marvila ® - Todos os direitos reservados
            </CardFooter>
          </Card>
        </div>
      ) : (
        <div className="flex-1 flex min-h-0">
          {/* Logo e informações à esquerda */}
          <div className="hidden md:flex md:w-1/2 bg-blue-600 flex-col items-center justify-center p-8">
            <div className="flex flex-col items-center mb-8">
              <div className="w-48 h-48 bg-blue-700 rounded-full flex items-center justify-center mb-4 p-2 shadow-lg">
                <img src="/logo.png" alt="Logo SEMTRANSP" className="w-full h-full object-cover" />
              </div>
              <h1 className="text-3xl font-bold text-white text-center">SEMTRANSP</h1>
              <p className="text-white text-center text-sm mt-2">SECRETARIA MUNICIPAL DE TRANSPORTES DE ITALVA</p>
            </div>
            <div className="text-white text-center max-w-md">
              <p className="mb-4">
                Sistema integrado de gestão para a Secretaria Municipal de Transportes, oferecendo controle completo de
                veículos, manutenções, estoque e colaboradores.
              </p>
              <p className="text-sm opacity-80">© 2025 Christian Nunes Marvila ® - Todos os direitos reservados</p>
            </div>
          </div>

          {/* Formulário de login à direita */}
          <div className="w-full md:w-1/2 flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-lg">
              <CardHeader className="text-center">
                {/* Logo para dispositivos móveis (visível apenas em telas pequenas) */}
                <div className="flex justify-center mb-4 md:hidden">
                  <div className="h-28 w-28 bg-blue-600 rounded-full flex items-center justify-center p-2 shadow-md">
                    <img src="/logo.png" alt="Logo SEMTRANSP" className="w-full h-full object-cover" />
                  </div>
                </div>
                <CardTitle className="text-2xl font-bold text-primary">Acesso ao Sistema</CardTitle>
                <CardDescription>Entre com suas credenciais para acessar o sistema</CardDescription>
              </CardHeader>
              <CardContent>
                {connectionStatus === "error" && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>
                      Não foi possível conectar ao banco de dados. Por favor, tente novamente mais tarde ou use o botão
                      "Entrar Diretamente" para testes.
                    </AlertDescription>
                  </Alert>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Usuário</Label>
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Digite seu usuário"
                      required
                      className="border-blue-200 focus:border-blue-400"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Senha</Label>
                    <Input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Digite sua senha"
                      required
                      className="border-blue-200 focus:border-blue-400"
                    />
                  </div>

                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    disabled={loading || connectionStatus === "error"}
                  >
                    {loading ? "Entrando..." : "Entrar"}
                  </Button>
                </form>
              </CardContent>
              <CardFooter className="flex justify-center text-sm text-muted-foreground md:hidden">
                © 2025 Christian Nunes Marvila ® - Todos os direitos reservados
              </CardFooter>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

