"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"

export default function LoginAlternativo() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    // Verificar credenciais fixas
    if (username === "Semtransp" && password === "@Semtransp2025") {
      // Armazenar informações do usuário no localStorage
      localStorage.setItem(
        "userData",
        JSON.stringify({
          id: "temp-id",
          username: "Semtransp",
          nome: "Administrador SEMTRANSP",
          cargo: "Administrador",
          isLoggedIn: true,
        }),
      )

      // Redirecionar para o dashboard
      router.push("/dashboard")
    } else {
      setError("Usuário ou senha incorretos. Por favor, tente novamente.")
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-24 w-24 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
              SEMTRANSP
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-primary">Sistema de Gestão SEMTRANSP</CardTitle>
          <CardDescription>Entre com suas credenciais para acessar o sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="default" className="mb-4 bg-blue-50 text-blue-800 border-blue-200">
            <AlertDescription>
              Esta é uma versão alternativa da página de login que não depende do banco de dados.
              <br />
              Use as credenciais: Semtransp / @Semtransp2025
            </AlertDescription>
          </Alert>

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
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full">
              Entrar
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-muted-foreground">
          © 2025 Christian Nunes Marvila ® - Todos os direitos reservados
        </CardFooter>
      </Card>
    </div>
  )
}

