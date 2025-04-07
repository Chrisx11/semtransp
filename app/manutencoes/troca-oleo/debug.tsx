"use client"

import { useState } from "react"
import { DebugProdutos } from "@/components/debug-produtos"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { supabase } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"
import { AlertCircle, Check, RefreshCw } from "lucide-react"

export default function DebugPage() {
  const [activeTab, setActiveTab] = useState("produtos")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)

  const testarConsultaProdutos = async () => {
    try {
      setLoading(true)
      setResult(null)

      const { data, error } = await supabase.from("produtos").select("count()")

      if (error) {
        setResult({ success: false, message: `Erro: ${error.message}` })
        return
      }

      setResult({
        success: true,
        message: `Consulta bem-sucedida. Total de produtos: ${data[0]?.count || 0}`,
      })
    } catch (err: any) {
      setResult({ success: false, message: `Erro inesperado: ${err.message}` })
    } finally {
      setLoading(false)
    }
  }

  const corrigirPermissoes = async () => {
    try {
      setLoading(true)

      // Executar SQL para garantir que as permissões estão corretas
      const { error } = await supabase.rpc("exec_sql", {
        sql_query: `
          -- Garantir que a tabela produtos tem RLS habilitado
          ALTER TABLE IF EXISTS public.produtos ENABLE ROW LEVEL SECURITY;
          
          -- Criar política para permitir acesso anônimo se não existir
          DO $$
          BEGIN
            IF NOT EXISTS (
              SELECT 1 FROM pg_policy 
              WHERE schemaname = 'public' 
              AND tablename = 'produtos' 
              AND policyname = 'Permitir acesso anônimo a produtos'
            ) THEN
              CREATE POLICY "Permitir acesso anônimo a produtos" 
              ON public.produtos FOR ALL 
              TO anon
              USING (true);
            END IF;
          END
          $$;
        `,
      })

      if (error) {
        toast({
          title: "Erro",
          description: `Não foi possível corrigir as permissões: ${error.message}`,
          variant: "destructive",
        })
        return
      }

      toast({
        title: "Sucesso",
        description: "Permissões corrigidas com sucesso. Tente carregar os produtos novamente.",
      })
    } catch (err: any) {
      toast({
        title: "Erro",
        description: `Erro inesperado: ${err.message || "Erro desconhecido"}`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Diagnóstico do Sistema</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="produtos">Produtos</TabsTrigger>
          <TabsTrigger value="consultas">Consultas</TabsTrigger>
          <TabsTrigger value="permissoes">Permissões</TabsTrigger>
        </TabsList>

        <TabsContent value="produtos">
          <DebugProdutos />
        </TabsContent>

        <TabsContent value="consultas">
          <Card>
            <CardHeader>
              <CardTitle>Teste de Consultas</CardTitle>
              <CardDescription>
                Verifique se as consultas ao banco de dados estão funcionando corretamente.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Button onClick={testarConsultaProdutos} disabled={loading}>
                  {loading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Testando...
                    </>
                  ) : (
                    "Testar Consulta de Produtos"
                  )}
                </Button>

                {result && (
                  <div
                    className={`p-4 rounded-md ${result.success ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}
                  >
                    {result.success ? (
                      <div className="flex items-start">
                        <Check className="h-5 w-5 mr-2 text-green-600 mt-0.5" />
                        <div>{result.message}</div>
                      </div>
                    ) : (
                      <div className="flex items-start">
                        <AlertCircle className="h-5 w-5 mr-2 text-red-600 mt-0.5" />
                        <div>{result.message}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissoes">
          <Card>
            <CardHeader>
              <CardTitle>Correção de Permissões</CardTitle>
              <CardDescription>
                Se os produtos não estão sendo carregados, pode haver um problema de permissões no banco de dados.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  Este botão tentará corrigir as permissões da tabela de produtos, garantindo que o Row Level Security
                  (RLS) esteja configurado corretamente e que exista uma política para permitir acesso anônimo.
                </p>

                <Button onClick={corrigirPermissoes} disabled={loading}>
                  {loading ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Corrigindo...
                    </>
                  ) : (
                    "Corrigir Permissões"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

