"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { supabase } from "@/lib/supabase"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Info, AlertTriangle } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"

export default function DebugSaidas() {
  const [estruturaTabela, setEstruturaTabela] = useState<any[]>([])
  const [ultimasSaidas, setUltimasSaidas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [testando, setTestando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    verificarEstrutura()
    carregarUltimasSaidas()
  }, [])

  const verificarEstrutura = async () => {
    try {
      setLoading(true)

      // Buscar informações sobre a estrutura da tabela saidas
      const { data, error } = await supabase.from("saidas").select("*").limit(1)

      if (error && !error.message.includes("Results contain 0 rows")) {
        throw error
      }

      // Verificar as colunas da tabela
      if (data && data.length > 0) {
        const colunas = Object.keys(data[0]).map((coluna) => ({
          nome: coluna,
          valor: data[0][coluna],
          tipo: typeof data[0][coluna],
        }))
        setEstruturaTabela(colunas)
      } else {
        // Se não houver dados, tentar obter a estrutura de outra forma
        const { data: definitions, error: defError } = await supabase.rpc("get_table_definition", {
          table_name: "saidas",
        })

        if (defError) {
          console.log("Erro ao buscar definição da tabela:", defError)
          setEstruturaTabela([{ nome: "Não foi possível determinar a estrutura da tabela", tipo: "desconhecido" }])
        } else if (definitions) {
          setEstruturaTabela(definitions)
        }
      }
    } catch (error: any) {
      console.error("Erro ao verificar estrutura da tabela:", error)
      setErro(`Erro ao verificar estrutura: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  const carregarUltimasSaidas = async () => {
    try {
      const { data, error } = await supabase
        .from("saidas")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10)

      if (error) throw error

      setUltimasSaidas(data || [])
    } catch (error: any) {
      console.error("Erro ao carregar últimas saídas:", error)
      setErro(`Erro ao carregar saídas: ${error.message}`)
    }
  }

  const testarInsercao = async () => {
    try {
      setTestando(true)

      // Criar um registro de teste
      const dadosTeste = {
        produto_id: 1, // Assumindo que existe um produto com ID 1
        quantidade: 1,
        data_saida: new Date().toISOString(),
        solicitante: "Teste de Diagnóstico",
        destino: "Teste de Sistema",
        observacao: "Registro de teste para diagnóstico - Pode ser excluído",
      }

      // Tentar inserir na tabela
      const { data, error } = await supabase.from("saidas").insert(dadosTeste).select()

      if (error) throw error

      toast({
        title: "Sucesso",
        description: "Registro de teste inserido com sucesso!",
      })

      // Recarregar as últimas saídas
      carregarUltimasSaidas()
    } catch (error: any) {
      console.error("Erro ao inserir registro de teste:", error)
      toast({
        title: "Erro",
        description: `Não foi possível inserir o registro de teste: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setTestando(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Diagnóstico da Tabela de Saídas</h1>

      {erro && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{erro}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Estrutura da Tabela</CardTitle>
            <CardDescription>Colunas e tipos de dados da tabela 'saidas'</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-4">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              </div>
            ) : estruturaTabela.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left">Coluna</th>
                      <th className="border p-2 text-left">Tipo</th>
                      <th className="border p-2 text-left">Exemplo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {estruturaTabela.map((coluna, index) => (
                      <tr key={index} className="border-b">
                        <td className="border p-2 font-medium">{coluna.nome}</td>
                        <td className="border p-2">{coluna.tipo}</td>
                        <td className="border p-2 truncate max-w-[200px]">
                          {coluna.valor !== null && coluna.valor !== undefined ? (
                            String(coluna.valor)
                          ) : (
                            <span className="text-gray-400">null</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                Nenhuma informação disponível sobre a estrutura da tabela.
              </div>
            )}

            <div className="mt-4">
              <Button onClick={verificarEstrutura} disabled={loading}>
                Atualizar Estrutura
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Últimos Registros</CardTitle>
            <CardDescription>10 registros mais recentes da tabela 'saidas'</CardDescription>
          </CardHeader>
          <CardContent>
            {ultimasSaidas.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left">ID</th>
                      <th className="border p-2 text-left">Produto</th>
                      <th className="border p-2 text-left">Quantidade</th>
                      <th className="border p-2 text-left">Solicitante</th>
                      <th className="border p-2 text-left">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ultimasSaidas.map((saida) => (
                      <tr key={saida.id} className="border-b">
                        <td className="border p-2">{saida.id}</td>
                        <td className="border p-2">{saida.produto_id}</td>
                        <td className="border p-2">{saida.quantidade}</td>
                        <td className="border p-2">{saida.solicitante || "N/A"}</td>
                        <td className="border p-2">
                          {saida.data_saida ? new Date(saida.data_saida).toLocaleString() : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                Nenhum registro encontrado na tabela 'saidas'.
              </div>
            )}

            <div className="mt-4 flex gap-2">
              <Button onClick={carregarUltimasSaidas}>Atualizar Registros</Button>
              <Button variant="outline" onClick={testarInsercao} disabled={testando}>
                {testando ? (
                  <>
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                    Testando...
                  </>
                ) : (
                  "Inserir Registro de Teste"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Alert className="mt-6 bg-blue-50 border-blue-200">
        <Info className="h-4 w-4 text-blue-500" />
        <AlertTitle className="text-blue-700">Como usar esta ferramenta</AlertTitle>
        <AlertDescription className="text-blue-600">
          <ol className="list-decimal pl-5 space-y-1">
            <li>Verifique a estrutura da tabela para entender quais campos são necessários</li>
            <li>Observe os últimos registros para ver o formato dos dados</li>
            <li>
              Use o botão "Inserir Registro de Teste" para verificar se é possível adicionar registros manualmente
            </li>
            <li>Compare os resultados com o comportamento da página de saídas</li>
          </ol>
        </AlertDescription>
      </Alert>

      <Toaster />
    </div>
  )
}

