"use client"

import { useState, useEffect } from "react"
import LayoutAutenticado from "@/components/layout-autenticado"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, MoreHorizontal, Eye, Check, Trash2, AlertTriangle, Calendar, FileText } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { supabase } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { RegistrarTrocaOleo } from "@/components/registrar-troca-oleo"
import { ExcluirTrocaOleo } from "./excluir-troca"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface Veiculo {
  id: number
  placa: string
  modelo: string
  marca: string
  ano: string
  tipo: string
  secretaria: string
  status: string
  tipo_medicao: string
  cor?: string
  medicao_atual?: number
  ultima_atualizacao?: string
  valor_troca?: number
}

interface TrocaOleo {
  id: number
  veiculo_id: number
  data_troca: string
  condutor_id?: number
  condutor_nome?: string
  medicao_atual: number
  medicao_troca: number
  tipo_oleo: string
  quantidade_oleo: number
  filtro_oleo: boolean
  filtro_combustivel: boolean
  filtro_ar: boolean
  filtro_cabine: boolean
  proxima_troca: number
  observacoes?: string
  responsavel: string
  created_at: string
  produtos?: any
  produto_oleo_id?: number
}

export default function TrocaOleoPage() {
  const [busca, setBusca] = useState("")
  const [filtroStatus, setFiltroStatus] = useState("todos")
  const [veiculos, setVeiculos] = useState<Veiculo[]>([])
  const [trocasOleo, setTrocasOleo] = useState<Record<number, TrocaOleo>>({})
  const [loading, setLoading] = useState(true)
  const [userData, setUserData] = useState<any>(null)
  const [tabelaExiste, setTabelaExiste] = useState(true)
  const [sqlDialogOpen, setSqlDialogOpen] = useState(false)

  // Estados para os diálogos
  const [registrarTrocaDialogOpen, setRegistrarTrocaDialogOpen] = useState(false)
  const [visualizarDialogOpen, setVisualizarDialogOpen] = useState(false)
  const [historicoDialogOpen, setHistoricoDialogOpen] = useState(false)
  const [excluirTrocaDialogOpen, setExcluirTrocaDialogOpen] = useState(false)
  const [veiculoSelecionado, setVeiculoSelecionado] = useState<Veiculo | null>(null)
  const [trocaSelecionada, setTrocaSelecionada] = useState<TrocaOleo | null>(null)

  // Estado para o histórico
  const [historico, setHistorico] = useState<TrocaOleo[]>([])
  const [carregandoHistorico, setCarregandoHistorico] = useState(false)

  // Carregar dados do usuário logado
  useEffect(() => {
    const storedData = localStorage.getItem("userData")
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData)
        setUserData(parsedData)
      } catch (err) {
        console.error("Erro ao processar dados do usuário:", err)
      }
    }
  }, [])

  // Carregar veículos e trocas de óleo ao iniciar
  useEffect(() => {
    fetchVeiculos()
    verificarTabelaTrocasOleo()
  }, [])

  // Função para verificar se a tabela trocas_oleo existe
  const verificarTabelaTrocasOleo = async () => {
    try {
      // Tentar fazer uma consulta simples para verificar se a tabela existe
      const { data, error } = await supabase.from("trocas_oleo").select("id").limit(1)

      if (error) {
        if (error.message.includes("does not exist")) {
          console.error("A tabela trocas_oleo não existe:", error)
          setTabelaExiste(false)
        } else {
          console.error("Erro ao verificar tabela trocas_oleo:", error)
        }
      } else {
        setTabelaExiste(true)
      }
    } catch (error) {
      console.error("Erro ao verificar tabela trocas_oleo:", error)
      setTabelaExiste(false)
    }
  }

  // Função para buscar veículos
  const fetchVeiculos = async () => {
    try {
      setLoading(true)

      // Buscar veículos do Supabase
      const { data: veiculosData, error: veiculosError } = await supabase
        .from("veiculos")
        .select("*")
        .order("placa", { ascending: true })

      if (veiculosError) {
        throw veiculosError
      }

      if (!veiculosData) {
        setVeiculos([])
        return
      }

      // Buscar as últimas atualizações de quilometragem para cada veículo
      const veiculosComMedicao = await Promise.all(
        veiculosData.map(async (veiculo) => {
          // Buscar a última atualização de quilometragem
          const { data: atualizacoes, error: atualizacoesError } = await supabase
            .from("atualizacoes_km")
            .select("medicao_atual, data_atualizacao")
            .eq("veiculo_id", veiculo.id)
            .order("data_atualizacao", { ascending: false })
            .limit(1)

          if (atualizacoesError) {
            console.error("Erro ao buscar atualizações:", atualizacoesError)
            return {
              ...veiculo,
              medicao_atual: 0,
              ultima_atualizacao: null,
            }
          }

          return {
            ...veiculo,
            medicao_atual: atualizacoes && atualizacoes.length > 0 ? atualizacoes[0].medicao_atual : 0,
            ultima_atualizacao: atualizacoes && atualizacoes.length > 0 ? atualizacoes[0].data_atualizacao : null,
          }
        }),
      )

      setVeiculos(veiculosComMedicao)

      if (tabelaExiste) {
        try {
          // Tentar buscar as últimas trocas de óleo para cada veículo
          const { data: trocasData, error: trocasError } = await supabase
            .from("trocas_oleo")
            .select("*")
            .order("data_troca", { ascending: false })

          if (!trocasError && trocasData) {
            // Criar um mapa de veículo_id para a última troca de óleo
            const ultimasTrocas: Record<number, TrocaOleo> = {}

            trocasData.forEach((troca) => {
              if (
                !ultimasTrocas[troca.veiculo_id] ||
                new Date(troca.data_troca) > new Date(ultimasTrocas[troca.veiculo_id].data_troca)
              ) {
                ultimasTrocas[troca.veiculo_id] = troca
              }
            })

            setTrocasOleo(ultimasTrocas)
          }
        } catch (trocasError) {
          console.error("Erro ao buscar trocas de óleo:", trocasError)
          // Não interrompe o fluxo, apenas registra o erro
          toast({
            title: "Aviso",
            description: "Ocorreu um erro ao buscar as trocas de óleo.",
            variant: "warning",
          })
        }
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

  // Função para buscar histórico de trocas de óleo
  const fetchHistoricoTrocas = async (veiculoId: number) => {
    if (!tabelaExiste) {
      setHistorico([])
      return
    }

    try {
      setCarregandoHistorico(true)

      try {
        const { data, error } = await supabase
          .from("trocas_oleo")
          .select("*")
          .eq("veiculo_id", veiculoId)
          .order("data_troca", { ascending: false })

        if (!error) {
          setHistorico(data || [])
        } else {
          throw error
        }
      } catch (error) {
        console.error("Erro ao buscar histórico de trocas:", error)
        toast({
          title: "Aviso",
          description: "Não foi possível carregar o histórico de trocas de óleo.",
          variant: "warning",
        })
        setHistorico([])
      }
    } finally {
      setCarregandoHistorico(false)
    }
  }

  // Formatar data
  const formatarData = (dataString?: string) => {
    if (!dataString) return "Nunca realizado"

    try {
      const data = new Date(dataString)
      return format(data, "dd/MM/yyyy", { locale: ptBR })
    } catch (error) {
      return dataString
    }
  }

  // Obter label para o tipo de medição
  const getMedicaoLabel = (tipoMedicao: string, plural = true) => {
    switch (tipoMedicao) {
      case "Quilometragem":
        return plural ? "Quilômetros" : "Quilometragem"
      case "Horimetro":
        return plural ? "Horas" : "Leitura do Horímetro"
      case "Meses":
        return plural ? "Meses" : "Meses de Uso"
      default:
        return plural ? "Medições" : "Medição"
    }
  }

  // Obter unidade para o tipo de medição
  const getMedicaoUnidade = (tipoMedicao: string) => {
    switch (tipoMedicao) {
      case "Quilometragem":
        return "km"
      case "Horimetro":
        return "h"
      case "Meses":
        return "meses"
      default:
        return ""
    }
  }

  // Calcular status da troca de óleo
  const calcularStatusTroca = (veiculo: Veiculo, troca?: TrocaOleo) => {
    if (!troca) return { status: "pendente", texto: "Nunca realizada", porcentagem: 0 }

    const medicaoAtual = veiculo.medicao_atual || 0
    const medicaoTroca = troca.medicao_troca
    const proximaTroca = troca.proxima_troca

    // Calcular a diferença entre a medição atual e a medição da troca
    const diferencaMedicao = medicaoAtual - medicaoTroca

    // Calcular a porcentagem de uso
    const porcentagemUso = Math.min(100, Math.round((diferencaMedicao / (proximaTroca - medicaoTroca)) * 100))

    if (medicaoAtual >= proximaTroca) {
      return { status: "atrasada", texto: "Troca necessária", porcentagem: 100 }
    } else if (porcentagemUso >= 90) {
      return { status: "alerta", texto: "Próxima da troca", porcentagem: porcentagemUso }
    } else if (porcentagemUso >= 75) {
      return { status: "atencao", texto: "Em breve", porcentagem: porcentagemUso }
    } else {
      return { status: "ok", texto: "Regular", porcentagem: porcentagemUso }
    }
  }

  // Filtrar veículos com base na busca e status
  const veiculosFiltrados = veiculos.filter((veiculo) => {
    // Primeiro aplicar o filtro de busca
    const passaBusca =
      veiculo.placa.toLowerCase().includes(busca.toLowerCase()) ||
      veiculo.modelo.toLowerCase().includes(busca.toLowerCase()) ||
      veiculo.marca.toLowerCase().includes(busca.toLowerCase()) ||
      veiculo.secretaria.toLowerCase().includes(busca.toLowerCase())

    // Se não passar na busca, já retorna falso
    if (!passaBusca) return false

    // Depois aplicar o filtro de status
    if (filtroStatus === "todos") return true

    const troca = trocasOleo[veiculo.id]
    const status = calcularStatusTroca(veiculo, troca).status

    if (filtroStatus === "pendentes" && status === "pendente") return true
    if (filtroStatus === "atrasados" && status === "atrasada") return true
    if (filtroStatus === "proximos" && (status === "alerta" || status === "atencao")) return true
    if (filtroStatus === "regulares" && status === "ok") return true

    return false
  })

  // Função para abrir o diálogo de registro de troca de óleo
  const handleAbrirRegistrarTroca = (veiculo: Veiculo) => {
    if (!tabelaExiste) {
      setSqlDialogOpen(true)
      return
    }

    setVeiculoSelecionado(veiculo)
    // Pré-carregar o histórico para este veículo
    fetchHistoricoTrocas(veiculo.id)
    setRegistrarTrocaDialogOpen(true)
  }

  // Função para abrir o diálogo de exclusão de troca de óleo
  const handleAbrirExcluirTroca = (veiculo: Veiculo, troca: TrocaOleo) => {
    setVeiculoSelecionado(veiculo)
    setTrocaSelecionada(troca)
    setExcluirTrocaDialogOpen(true)
  }

  // Função para atualizar após registrar uma troca
  const handleAposRegistrarTroca = () => {
    fetchVeiculos()

    // Se houver um veículo selecionado, atualizar o histórico desse veículo
    if (veiculoSelecionado) {
      fetchHistoricoTrocas(veiculoSelecionado.id)
    }

    toast({
      title: "Atualizado",
      description: "Os dados da troca de óleo foram atualizados no sistema.",
    })
  }

  // Função para atualizar após excluir uma troca
  const handleAposExcluirTroca = () => {
    fetchVeiculos()

    // Se houver um veículo selecionado, atualizar o histórico desse veículo
    if (veiculoSelecionado) {
      fetchHistoricoTrocas(veiculoSelecionado.id)
    }
  }

  // Script SQL para criar a tabela
  const sqlScript = `-- Script modificado para atualizar a tabela trocas_oleo existente
-- Este script verifica se as colunas existem antes de adicioná-las

-- Verificar se as colunas necessárias existem e adicioná-las se não existirem
DO $$
BEGIN
  -- Verificar e adicionar coluna condutor_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trocas_oleo' 
    AND column_name = 'condutor_id'
  ) THEN
    ALTER TABLE public.trocas_oleo ADD COLUMN condutor_id INTEGER REFERENCES colaboradores(id);
  END IF;

  -- Verificar e adicionar coluna condutor_nome
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trocas_oleo' 
    AND column_name = 'condutor_nome'
  ) THEN
    ALTER TABLE public.trocas_oleo ADD COLUMN condutor_nome TEXT;
  END IF;

  -- Verificar e adicionar coluna medicao_atual
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trocas_oleo' 
    AND column_name = 'medicao_atual'
  ) THEN
    ALTER TABLE public.trocas_oleo ADD COLUMN medicao_atual INTEGER;
  END IF;

  -- Verificar e adicionar coluna produto_oleo_id
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trocas_oleo' 
    AND column_name = 'produto_oleo_id'
  ) THEN
    ALTER TABLE public.trocas_oleo ADD COLUMN produto_oleo_id INTEGER REFERENCES produtos(id);
  END IF;

  -- Verificar e adicionar coluna produtos (JSONB)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trocas_oleo' 
    AND column_name = 'produtos'
  ) THEN
    ALTER TABLE public.trocas_oleo ADD COLUMN produtos JSONB;
  END IF;
END
$$;

-- Criar índices para melhorar a performance (não causa erro se já existirem)
CREATE INDEX IF NOT EXISTS idx_trocas_oleo_veiculo_id ON trocas_oleo(veiculo_id);
CREATE INDEX IF NOT EXISTS idx_trocas_oleo_data_troca ON trocas_oleo(data_troca);
CREATE INDEX IF NOT EXISTS idx_trocas_oleo_condutor_id ON trocas_oleo(condutor_id);
CREATE INDEX IF NOT EXISTS idx_trocas_oleo_produto_oleo_id ON trocas_oleo(produto_oleo_id);

-- Habilitar Row Level Security (RLS) se ainda não estiver habilitado
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE schemaname = 'public' 
    AND tablename = 'trocas_oleo' 
    AND rowsecurity = true
  ) THEN
    ALTER TABLE public.trocas_oleo ENABLE ROW LEVEL SECURITY;
  END IF;
END
$$;

-- Criar política para permitir acesso anônimo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy 
    WHERE schemaname = 'public' 
    AND tablename = 'trocas_oleo' 
    AND policyname = 'Permitir acesso anônimo a trocas_oleo'
  ) THEN
    CREATE POLICY "Permitir acesso anônimo a trocas_oleo" 
    ON public.trocas_oleo FOR ALL 
    TO anon
    USING (true);
  END IF;
END
$$;

-- Criar função para devolver produtos ao estoque quando uma troca de óleo for excluída
CREATE OR REPLACE FUNCTION devolver_produtos_troca_oleo()
RETURNS TRIGGER AS $$
DECLARE
  produto_record RECORD;
  produto_json JSONB;
BEGIN
  -- Devolver o óleo principal ao estoque
  IF OLD.produto_oleo_id IS NOT NULL THEN
    -- Verificar se o produto existe
    IF EXISTS (SELECT 1 FROM produtos WHERE id = OLD.produto_oleo_id) THEN
      -- Atualizar o estoque
      UPDATE produtos
      SET quantidade = quantidade + OLD.quantidade_oleo
      WHERE id = OLD.produto_oleo_id;
      
      -- Registrar a entrada no histórico
      INSERT INTO entradas (
        produto_id, 
        quantidade, 
        data_entrada, 
        fornecedor, 
        observacao
      ) VALUES (
        OLD.produto_oleo_id,
        OLD.quantidade_oleo,
        NOW(),
        'Sistema',
        'Devolução automática por exclusão de troca de óleo - Veículo: ' || (SELECT placa FROM veiculos WHERE id = OLD.veiculo_id)
      );
    END IF;
  END IF;
  
  -- Devolver os produtos adicionais ao estoque
  IF OLD.produtos IS NOT NULL AND jsonb_array_length(OLD.produtos) > 0 THEN
    FOR produto_json IN SELECT jsonb_array_elements(OLD.produtos)
    LOOP
      -- Verificar se o produto existe
      IF EXISTS (SELECT 1 FROM produtos WHERE id = (produto_json->>'id')::integer) THEN
        -- Atualizar o estoque
        UPDATE produtos
        SET quantidade = quantidade + (produto_json->>'quantidade')::numeric
        WHERE id = (produto_json->>'id')::integer;
        
        -- Registrar a entrada no histórico
        INSERT INTO entradas (
          produto_id, 
          quantidade, 
          data_entrada, 
          fornecedor, 
          observacao
        ) VALUES (
          (produto_json->>'id')::integer,
          (produto_json->>'quantidade')::numeric,
          NOW(),
          'Sistema',
          'Devolução automática por exclusão de troca de óleo - Veículo: ' || (SELECT placa FROM veiculos WHERE id = OLD.veiculo_id)
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para devolver produtos ao estoque quando uma troca de óleo for excluída
DROP TRIGGER IF EXISTS trigger_devolver_produtos_troca_oleo ON trocas_oleo;
CREATE TRIGGER trigger_devolver_produtos_troca_oleo
BEFORE DELETE ON trocas_oleo
FOR EACH ROW
EXECUTE FUNCTION devolver_produtos_troca_oleo();

-- Criar view para facilitar a consulta de trocas de óleo com informações do veículo
CREATE OR REPLACE VIEW vw_trocas_oleo AS
SELECT 
  t.*,
  v.placa AS veiculo_placa,
  v.marca AS veiculo_marca,
  v.modelo AS veiculo_modelo,
  v.tipo_medicao AS veiculo_tipo_medicao,
  c.nome AS condutor_nome_completo,
  p.nome AS produto_oleo_nome
FROM 
  trocas_oleo t
LEFT JOIN 
  veiculos v ON t.veiculo_id = v.id
LEFT JOIN 
  colaboradores c ON t.condutor_id = c.id
LEFT JOIN 
  produtos p ON t.produto_oleo_id = p.id;`

  return (
    <LayoutAutenticado>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Troca de Óleo</h2>
          <p className="text-muted-foreground">Gerencie as trocas de óleo dos veículos da frota.</p>
        </div>

        {!tabelaExiste && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Tabela não encontrada</AlertTitle>
            <AlertDescription>
              A tabela de trocas de óleo não existe no banco de dados. É necessário criar a tabela para utilizar esta
              funcionalidade. Clique no botão abaixo para ver o script SQL necessário.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
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
            <Tabs defaultValue="todos" value={filtroStatus} onValueChange={setFiltroStatus} className="w-full">
              <TabsList className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <TabsTrigger value="todos" className="px-3">
                  Todos
                </TabsTrigger>
                <TabsTrigger value="atrasados" className="px-3">
                  Atrasados
                </TabsTrigger>
                <TabsTrigger value="proximos" className="px-3">
                  Próximos
                </TabsTrigger>
                <TabsTrigger value="regulares" className="px-3">
                  Regulares
                </TabsTrigger>
                <TabsTrigger value="pendentes" className="px-3">
                  Pendentes
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>

        {!tabelaExiste && (
          <div className="flex justify-center my-4">
            <Button
              variant="outline"
              onClick={() => setSqlDialogOpen(true)}
              className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100"
            >
              <AlertTriangle className="mr-2 h-4 w-4" />
              Ver Script SQL para Criar Tabela
            </Button>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Veículos da Frota</CardTitle>
            <CardDescription>Acompanhe o status das trocas de óleo e registre novas trocas.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Placa</TableHead>
                  <TableHead>Veículo</TableHead>
                  <TableHead>Medição Atual</TableHead>
                  <TableHead>Última Troca</TableHead>
                  <TableHead>Próxima Troca</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : veiculosFiltrados.length > 0 ? (
                  veiculosFiltrados.map((veiculo) => {
                    const troca = trocasOleo[veiculo.id]
                    const statusTroca = calcularStatusTroca(veiculo, troca)

                    return (
                      <TableRow key={veiculo.id}>
                        <TableCell className="font-medium">{veiculo.placa}</TableCell>
                        <TableCell>
                          {veiculo.marca} {veiculo.modelo}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                          >
                            {veiculo.medicao_atual || 0} {getMedicaoUnidade(veiculo.tipo_medicao)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {troca ? (
                            <div className="flex flex-col">
                              <span>{formatarData(troca.data_troca)}</span>
                              <span className="text-xs text-slate-400 dark:text-slate-500">
                                {troca.medicao_troca} {getMedicaoUnidade(veiculo.tipo_medicao)}
                              </span>
                            </div>
                          ) : (
                            "Nunca realizada"
                          )}
                        </TableCell>
                        <TableCell>
                          {troca ? (
                            <Badge
                              variant="outline"
                              className="bg-purple-50 text-purple-700 dark:bg-purple-900 dark:text-purple-200"
                            >
                              {troca.proxima_troca} {getMedicaoUnidade(veiculo.tipo_medicao)}
                            </Badge>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant="outline"
                              className={
                                statusTroca.status === "pendente"
                                  ? "bg-gray-50 dark:bg-gray-800 text-gray-700"
                                  : statusTroca.status === "atrasada"
                                    ? "bg-red-50 text-red-700 dark:bg-red-900 dark:text-red-200"
                                    : statusTroca.status === "alerta"
                                      ? "bg-amber-50 text-amber-700 dark:bg-amber-900 dark:text-amber-200"
                                      : statusTroca.status === "atencao"
                                        ? "bg-yellow-50 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200"
                                        : "bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-200"
                              }
                            >
                              {statusTroca.texto}
                            </Badge>
                            {statusTroca.status !== "pendente" && (
                              <Progress
                                value={statusTroca.porcentagem}
                                className={
                                  statusTroca.status === "atrasada"
                                    ? "h-2 bg-red-100"
                                    : statusTroca.status === "alerta"
                                      ? "h-2 bg-amber-100"
                                      : statusTroca.status === "atencao"
                                        ? "h-2 bg-yellow-100"
                                        : "h-2 bg-green-100"
                                }
                              />
                            )}
                          </div>
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
                                onClick={() => handleAbrirRegistrarTroca(veiculo)}
                              >
                                <Calendar className="mr-2 h-4 w-4" />
                                <span>Registrar Troca</span>
                              </DropdownMenuItem>
                              {troca && (
                                <>
                                  <DropdownMenuItem
                                    className="flex items-center cursor-pointer"
                                    onClick={() => {
                                      setVeiculoSelecionado(veiculo)
                                      setTrocaSelecionada(troca)
                                      setVisualizarDialogOpen(true)
                                    }}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    <span>Visualizar Última Troca</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="flex items-center cursor-pointer text-red-600"
                                    onClick={() => handleAbrirExcluirTroca(veiculo, troca)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    <span>Excluir Última Troca</span>
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuItem
                                className="flex items-center cursor-pointer"
                                onClick={() => {
                                  if (!tabelaExiste) {
                                    setSqlDialogOpen(true)
                                    return
                                  }
                                  setVeiculoSelecionado(veiculo)
                                  fetchHistoricoTrocas(veiculo.id)
                                  setHistoricoDialogOpen(true)
                                }}
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                <span>Histórico de Trocas</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      Nenhum veículo encontrado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Diálogo para Visualizar Troca de Óleo */}
      <Dialog open={visualizarDialogOpen} onOpenChange={setVisualizarDialogOpen}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>Detalhes da Troca de Óleo</DialogTitle>
            <DialogDescription>Informações completas sobre a troca de óleo realizada.</DialogDescription>
          </DialogHeader>
          {trocaSelecionada && veiculoSelecionado && (
            <div className="space-y-6 py-4">
              <div className="bg-blue-50 p-4 rounded-md">
                <h3 className="font-medium text-blue-800 mb-1">Veículo</h3>
                <p className="text-sm text-blue-700">
                  {veiculoSelecionado.marca} {veiculoSelecionado.modelo} - Placa: {veiculoSelecionado.placa}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Informações Gerais</h3>
                  <div className="space-y-2">
                    <div className="bg-slate-50 dark:bg-slate-800 dark:text-slate-200 p-2 rounded-md">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Data da Troca</p>
                      <p className="text-sm font-medium">{formatarData(trocaSelecionada.data_troca)}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 dark:text-slate-200 p-2 rounded-md">
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {getMedicaoLabel(veiculoSelecionado.tipo_medicao, false)}
                      </p>
                      <p className="text-sm font-medium">
                        {trocaSelecionada.medicao_troca} {getMedicaoUnidade(veiculoSelecionado.tipo_medicao)}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 dark:text-slate-200 p-2 rounded-md">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Próxima Troca</p>
                      <p className="text-sm font-medium">
                        {trocaSelecionada.proxima_troca} {getMedicaoUnidade(veiculoSelecionado.tipo_medicao)}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Óleo Utilizado</h3>
                  <div className="space-y-2">
                    <div className="bg-amber-50 text-amber-700 dark:bg-amber-900 dark:text-amber-200 p-2 rounded-md">
                      <p className="text-xs text-amber-700 dark:text-amber-200">Tipo de Óleo</p>
                      <p className="text-sm font-medium">{trocaSelecionada.tipo_oleo}</p>
                    </div>
                    <div className="bg-amber-50 text-amber-700 dark:bg-amber-900 dark:text-amber-200 p-2 rounded-md">
                      <p className="text-xs text-amber-700 dark:text-amber-200">Quantidade</p>
                      <p className="text-sm font-medium">{trocaSelecionada.quantidade_oleo} litros</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 dark:text-slate-200 p-2 rounded-md">
                      <p className="text-xs text-slate-500 dark:text-slate-400">Responsável</p>
                      <p className="text-sm font-medium">{trocaSelecionada.responsavel}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2">Filtros Trocados</h3>
                <div className="bg-slate-50 dark:bg-slate-800 dark:text-slate-200 p-3 rounded-md">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-5 w-5 rounded-sm ${trocaSelecionada.filtro_oleo ? "bg-green-500" : "bg-gray-200"} flex items-center justify-center`}
                      >
                        {trocaSelecionada.filtro_oleo && <Check className="h-3.5 w-3.5 text-white" />}
                      </div>
                      <span className="text-sm">Filtro de Óleo</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-5 w-5 rounded-sm ${trocaSelecionada.filtro_combustivel ? "bg-green-500" : "bg-gray-200"} flex items-center justify-center`}
                      >
                        {trocaSelecionada.filtro_combustivel && <Check className="h-3.5 w-3.5 text-white" />}
                      </div>
                      <span className="text-sm">Filtro de Combustível</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-5 w-5 rounded-sm ${trocaSelecionada.filtro_ar ? "bg-green-500" : "bg-gray-200"} flex items-center justify-center`}
                      >
                        {trocaSelecionada.filtro_ar && <Check className="h-3.5 w-3.5 text-white" />}
                      </div>
                      <span className="text-sm">Filtro de Ar</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`h-5 w-5 rounded-sm ${trocaSelecionada.filtro_cabine ? "bg-green-500" : "bg-gray-200"} flex items-center justify-center`}
                      >
                        {trocaSelecionada.filtro_cabine && <Check className="h-3.5 w-3.5 text-white" />}
                      </div>
                      <span className="text-sm">Filtro de Cabine</span>
                    </div>
                    {/* Verificar se os novos campos existem antes de renderizar */}
                    {trocaSelecionada.hasOwnProperty("filtro_separador_agua") && (
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-5 w-5 rounded-sm ${trocaSelecionada.filtro_separador_agua ? "bg-green-500" : "bg-gray-200"} flex items-center justify-center`}
                        >
                          {trocaSelecionada.filtro_separador_agua && <Check className="h-3.5 w-3.5 text-white" />}
                        </div>
                        <span className="text-sm">Filtro Separador de Água</span>
                      </div>
                    )}
                    {trocaSelecionada.hasOwnProperty("copo_filtro_separador") && (
                      <div className="flex items-center gap-2">
                        <div
                          className={`h-5 w-5 rounded-sm ${trocaSelecionada.copo_filtro_separador ? "bg-green-500" : "bg-gray-200"} flex items-center justify-center`}
                        >
                          {trocaSelecionada.copo_filtro_separador && <Check className="h-3.5 w-3.5 text-white" />}
                        </div>
                        <span className="text-sm">Copo do Filtro Separador</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Produtos utilizados */}
              {trocaSelecionada.produtos && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Produtos Utilizados</h3>
                  <div className="bg-green-50 dark:bg-green-900 dark:text-green-100 rounded-md p-3">
                    {(() => {
                      try {
                        const produtosArray =
                          typeof trocaSelecionada.produtos === "string"
                            ? JSON.parse(trocaSelecionada.produtos)
                            : trocaSelecionada.produtos

                        if (Array.isArray(produtosArray) && produtosArray.length > 0) {
                          return (
                            <div className="space-y-2">
                              {produtosArray.map((produto, idx) => (
                                <div
                                  key={idx}
                                  className="flex justify-between items-center border-b border-green-100 dark:border-green-800 pb-2 last:border-0 last:pb-0"
                                >
                                  <span className="text-sm font-medium text-green-800 dark:text-green-100">
                                    {produto.nome}
                                  </span>
                                  <span className="text-sm text-green-700 dark:text-green-200">
                                    {produto.quantidade} un.
                                  </span>
                                </div>
                              ))}
                            </div>
                          )
                        } else {
                          return (
                            <p className="text-sm text-slate-500 dark:text-slate-300">
                              Nenhum produto adicional utilizado
                            </p>
                          )
                        }
                      } catch (e) {
                        console.error("Erro ao processar produtos:", e)
                        return <p className="text-sm text-slate-500 dark:text-slate-300">Erro ao processar produtos</p>
                      }
                    })()}
                  </div>
                </div>
              )}

              {trocaSelecionada.observacoes && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-2">Observações</h3>
                  <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-md min-h-[80px] text-sm">
                    {trocaSelecionada.observacoes}
                  </div>
                </div>
              )}

              {/* Rodapé com data de registro */}
              <div className="pt-2 border-t text-xs text-slate-400 dark:text-slate-500 flex justify-between">
                <span>ID: {trocaSelecionada.id}</span>
                <span>
                  Registrado em:{" "}
                  {trocaSelecionada.created_at
                    ? format(new Date(trocaSelecionada.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                    : "Data desconhecida"}
                </span>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setVisualizarDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para Histórico de Trocas */}
      <Dialog open={historicoDialogOpen} onOpenChange={setHistoricoDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Histórico de Trocas de Óleo</DialogTitle>
            <DialogDescription>
              {veiculoSelecionado &&
                `Histórico completo de trocas de óleo do veículo ${veiculoSelecionado.marca} ${veiculoSelecionado.modelo} (${veiculoSelecionado.placa})`}
            </DialogDescription>
          </DialogHeader>

          {carregandoHistorico ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
            </div>
          ) : historico.length > 0 ? (
            <div className="space-y-6 py-4">
              {historico.map((troca, index) => (
                <div key={index} className="border rounded-md overflow-hidden">
                  {/* Cabeçalho da troca */}
                  <div className="bg-slate-50 dark:bg-slate-800 dark:text-slate-200 p-4 border-b">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Calendar className="h-4 w-4 text-slate-600" />
                          <span className="font-medium">{formatarData(troca.data_troca)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200"
                          >
                            {troca.medicao_troca}{" "}
                            {veiculoSelecionado && getMedicaoUnidade(veiculoSelecionado.tipo_medicao)}
                          </Badge>
                          <span className="text-sm text-slate-500 dark:text-slate-400">→</span>
                          <Badge
                            variant="outline"
                            className="bg-purple-50 text-purple-700 dark:bg-purple-900 dark:text-purple-200"
                          >
                            Próxima: {troca.proxima_troca}{" "}
                            {veiculoSelecionado && getMedicaoUnidade(veiculoSelecionado.tipo_medicao)}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => {
                          setTrocaSelecionada(troca)
                          setHistoricoDialogOpen(false)
                          setExcluirTrocaDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                        Excluir
                      </Button>
                    </div>
                  </div>

                  {/* Conteúdo da troca */}
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
                          Informações do Óleo
                        </h4>
                        <div className="bg-amber-50 text-amber-700 dark:bg-amber-900 dark:text-amber-200 rounded-md p-3">
                          <p className="text-sm mb-1">
                            <span className="font-medium">Tipo:</span> {troca.tipo_oleo}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Quantidade:</span> {troca.quantidade_oleo} litros
                          </p>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Responsáveis</h4>
                        <div className="bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-100 rounded-md p-3">
                          <p className="text-sm mb-1">
                            <span className="font-medium">Condutor:</span> {troca.condutor_nome || "Não informado"}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Responsável:</span> {troca.responsavel}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Filtros trocados */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Filtros</h4>
                      <div className="bg-slate-50 dark:bg-slate-800 dark:text-slate-200 rounded-md p-3">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-4 w-4 rounded-sm ${
                                troca.filtro_oleo ? "bg-green-500" : "bg-gray-200"
                              } flex items-center justify-center`}
                            >
                              {troca.filtro_oleo && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <span className="text-sm">Filtro de Óleo</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-4 w-4 rounded-sm ${
                                troca.filtro_combustivel ? "bg-green-500" : "bg-gray-200"
                              } flex items-center justify-center`}
                            >
                              {troca.filtro_combustivel && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <span className="text-sm">Filtro de Combustível</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-4 w-4 rounded-sm ${
                                troca.filtro_ar ? "bg-green-500" : "bg-gray-200"
                              } flex items-center justify-center`}
                            >
                              {troca.filtro_ar && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <span className="text-sm">Filtro de Ar</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-4 w-4 rounded-sm ${
                                troca.filtro_cabine ? "bg-green-500" : "bg-gray-200"
                              } flex items-center justify-center`}
                            >
                              {troca.filtro_cabine && <Check className="h-3 w-3 text-white" />}
                            </div>
                            <span className="text-sm">Filtro de Cabine</span>
                          </div>
                          {/* Verificar se os novos campos existem antes de renderizar */}
                          {troca.hasOwnProperty("filtro_separador_agua") && (
                            <div className="flex items-center gap-2">
                              <div
                                className={`h-4 w-4 rounded-sm ${
                                  troca.filtro_separador_agua ? "bg-green-500" : "bg-gray-200"
                                } flex items-center justify-center`}
                              >
                                {troca.filtro_separador_agua && <Check className="h-3 w-3 text-white" />}
                              </div>
                              <span className="text-sm">Filtro Separador de Água</span>
                            </div>
                          )}
                          {troca.hasOwnProperty("copo_filtro_separador") && (
                            <div className="flex items-center gap-2">
                              <div
                                className={`h-4 w-4 rounded-sm ${
                                  troca.copo_filtro_separador ? "bg-green-500" : "bg-gray-200"
                                } flex items-center justify-center`}
                              >
                                {troca.copo_filtro_separador && <Check className="h-3 w-3 text-white" />}
                              </div>
                              <span className="text-sm">Copo do Filtro Separador</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Produtos utilizados */}
                    {troca.produtos && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
                          Produtos Utilizados
                        </h4>
                        <div className="bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-100 rounded-md p-3">
                          {(() => {
                            try {
                              const produtosArray =
                                typeof troca.produtos === "string" ? JSON.parse(troca.produtos) : troca.produtos

                              if (Array.isArray(produtosArray) && produtosArray.length > 0) {
                                return (
                                  <div className="space-y-2">
                                    {produtosArray.map((produto, idx) => (
                                      <div
                                        key={idx}
                                        className="flex justify-between items-center border-b border-green-100 dark:border-green-800 pb-2 last:border-0 last:pb-0"
                                      >
                                        <span className="text-sm font-medium text-green-800 dark:text-green-100">
                                          {produto.nome}
                                        </span>
                                        <span className="text-sm text-green-700 dark:text-green-200">
                                          {produto.quantidade} un.
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )
                              } else {
                                return (
                                  <p className="text-sm text-slate-500 dark:text-slate-300">
                                    Nenhum produto adicional utilizado
                                  </p>
                                )
                              }
                            } catch (e) {
                              console.error("Erro ao processar produtos:", e)
                              return (
                                <p className="text-sm text-slate-500 dark:text-slate-300">Erro ao processar produtos</p>
                              )
                            }
                          })()}
                        </div>
                      </div>
                    )}

                    {/* Observações */}
                    {troca.observacoes && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">Observações</h4>
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-md p-3 text-sm">{troca.observacoes}</div>
                      </div>
                    )}

                    {/* Rodapé com data de registro */}
                    <div className="mt-4 pt-2 border-t text-xs text-slate-400 dark:text-slate-500 flex justify-between">
                      <span>ID: {troca.id}</span>
                      <span>
                        Registrado em:{" "}
                        {troca.created_at
                          ? format(new Date(troca.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : "Data desconhecida"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum histórico de troca de óleo encontrado para este veículo.
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setHistoricoDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Diálogo para mostrar o script SQL */}
      <Dialog open={sqlDialogOpen} onOpenChange={setSqlDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Script SQL para Criar Tabela de Trocas de Óleo</DialogTitle>
            <DialogDescription>
              Execute este script no console SQL do Supabase para criar a tabela necessária.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md overflow-x-auto">
            <pre className="text-sm">{sqlScript}</pre>
          </div>

          <div className="mt-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Instruções</AlertTitle>
              <AlertDescription>
                1. Acesse o painel do Supabase
                <br />
                2. Vá para a seção "SQL Editor"
                <br />
                3. Cole o script acima
                <br />
                4. Execute o script
                <br />
                5. Após a execução, atualize esta página
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button onClick={() => setSqlDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Componente de Registro de Troca de Óleo */}
      <RegistrarTrocaOleo
        veiculo={veiculoSelecionado}
        open={registrarTrocaDialogOpen}
        onOpenChange={setRegistrarTrocaDialogOpen}
        onSave={handleAposRegistrarTroca}
        historicoTrocas={historico}
      />

      {/* Componente de Exclusão de Troca de Óleo */}
      <ExcluirTrocaOleo
        trocaId={trocaSelecionada?.id || null}
        veiculoPlaca={veiculoSelecionado?.placa || ""}
        open={excluirTrocaDialogOpen}
        onOpenChange={setExcluirTrocaDialogOpen}
        onDelete={handleAposExcluirTroca}
      />

      <Toaster />
    </LayoutAutenticado>
  )
}

