"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle, Check, RefreshCw } from "lucide-react"

interface Produto {
  id: number
  nome: string
  categoria: string
  quantidade: number
  unidade: string
}

export function DebugProdutos() {
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const fetchProdutos = async () => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(false)

      console.log("Iniciando consulta de produtos...")

      // Consulta simples para testar a conexão
      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome, categoria, quantidade, unidade")
        .order("nome", { ascending: true })

      if (error) {
        console.error("Erro na consulta:", error)
        setError(`Erro ao buscar produtos: ${error.message}`)
        return
      }

      if (!data || data.length === 0) {
        console.log("Nenhum produto encontrado")
        setError("Nenhum produto encontrado na tabela 'produtos'")
        setProdutos([])
        return
      }

      console.log(`Encontrados ${data.length} produtos`)
      setProdutos(data)
      setSuccess(true)
    } catch (err: any) {
      console.error("Erro inesperado:", err)
      setError(`Erro inesperado: ${err.message || "Erro desconhecido"}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProdutos()
  }, [])

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Diagnóstico de Produtos</CardTitle>
        <CardDescription>
          Esta ferramenta verifica se os produtos estão sendo carregados corretamente do banco de dados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center p-6">
            <RefreshCw className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-2">Carregando produtos...</span>
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : success ? (
          <>
            <Alert className="mb-4 bg-green-50 border-green-200 text-green-800">
              <Check className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-700">Sucesso</AlertTitle>
              <AlertDescription>
                {produtos.length} produtos foram carregados com sucesso do banco de dados.
              </AlertDescription>
            </Alert>

            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left font-medium">ID</th>
                    <th className="p-2 text-left font-medium">Nome</th>
                    <th className="p-2 text-left font-medium">Categoria</th>
                    <th className="p-2 text-left font-medium">Quantidade</th>
                    <th className="p-2 text-left font-medium">Unidade</th>
                  </tr>
                </thead>
                <tbody>
                  {produtos.slice(0, 5).map((produto) => (
                    <tr key={produto.id} className="border-t">
                      <td className="p-2">{produto.id}</td>
                      <td className="p-2">{produto.nome || "—"}</td>
                      <td className="p-2">{produto.categoria || "—"}</td>
                      <td className="p-2">{produto.quantidade}</td>
                      <td className="p-2">{produto.unidade || "—"}</td>
                    </tr>
                  ))}
                  {produtos.length > 5 && (
                    <tr className="border-t">
                      <td colSpan={5} className="p-2 text-center text-muted-foreground">
                        ... e mais {produtos.length - 5} produtos
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="text-center p-6 text-muted-foreground">
            Nenhum dado disponível. Clique em "Testar Conexão" para verificar os produtos.
          </div>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={fetchProdutos} disabled={loading}>
          {loading ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              Testando...
            </>
          ) : (
            "Testar Conexão"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}

