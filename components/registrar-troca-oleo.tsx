"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { supabase } from "@/lib/supabase"
import { toast } from "@/components/ui/use-toast"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Check, ChevronsUpDown, Search, Plus, AlertTriangle, Copy, Info, Bug } from "lucide-react"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format } from "date-fns"
import { ptBR } from "date-fns/locale"

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
  valor_troca?: number
  medicao_atual?: number
}

interface Colaborador {
  id: number
  nome: string
  cargo: string
}

interface Produto {
  id: number
  nome: string
  categoria: string
  quantidade: number
  unidade: string
}

interface ProdutoSelecionado {
  id: number
  nome: string
  quantidade: number
}

interface TrocaOleo {
  id: number
  veiculo_id: number
  data_troca: string
  condutor_id?: number
  condutor_nome?: string
  medicao_atual: number
  medicao_troca: number
  proxima_troca: number
  tipo_oleo: string
  produto_oleo_id?: number
  quantidade_oleo: number
  filtro_oleo: boolean
  filtro_combustivel: boolean
  filtro_ar: boolean
  filtro_cabine: boolean
  filtro_separador_agua: boolean
  copo_filtro_separador: boolean
  produtos?: ProdutoSelecionado[]
  observacoes?: string
  responsavel: string
  created_at: string
}

interface RegistrarTrocaOleoProps {
  veiculo: Veiculo | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave?: () => void
  historicoTrocas?: TrocaOleo[]
}

export function RegistrarTrocaOleo({
  veiculo,
  open,
  onOpenChange,
  onSave,
  historicoTrocas = [],
}: RegistrarTrocaOleoProps) {
  // Estados principais
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState("informacoes")
  const [userData, setUserData] = useState<any>(null)
  const [erroEstrutura, setErroEstrutura] = useState<string | null>(null)
  const [sqlDialogOpen, setSqlDialogOpen] = useState(false)
  const [tabelaExiste, setTabelaExiste] = useState(true)
  const [copiouScript, setCopiouScript] = useState(false)
  const [debugMode, setDebugMode] = useState(false)
  const [estruturaSaidas, setEstruturaSaidas] = useState<string[]>([])

  // Estados para informações básicas
  const [medicaoAtual, setMedicaoAtual] = useState<number>(0)
  const [proximaTroca, setProximaTroca] = useState<number>(0)
  const [dataAtual, setDataAtual] = useState<string>(format(new Date(), "dd/MM/yyyy", { locale: ptBR }))

  // Estados para colaboradores
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([])
  const [loadingColaboradores, setLoadingColaboradores] = useState(false)
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState<Colaborador | null>(null)

  // Estados para produtos
  const [todosProdutos, setTodosProdutos] = useState<Produto[]>([])
  const [loadingProdutos, setLoadingProdutos] = useState(false)
  const [produtosBuscados, setProdutosBuscados] = useState<Produto[]>([])
  const [termoBusca, setTermoBusca] = useState("")
  const [produtosSelecionados, setProdutosSelecionados] = useState<ProdutoSelecionado[]>([])
  const [produtosOleo, setProdutosOleo] = useState<Produto[]>([])
  const [buscaOleo, setBuscaOleo] = useState("")
  const [produtoOleoSelecionado, setProdutoOleoSelecionado] = useState<Produto | null>(null)
  const [quantidadeOleo, setQuantidadeOleo] = useState<number>(0)
  const [selecionarProdutoDialogOpen, setSelecionarProdutoDialogOpen] = useState(false)
  const [erroProdutos, setErroProdutos] = useState<string | null>(null)

  // Estados para filtros
  const [filtroOleo, setFiltroOleo] = useState(false)
  const [filtroCombustivel, setFiltroCombustivel] = useState(false)
  const [filtroAr, setFiltroAr] = useState(false)
  const [filtroCabine, setFiltroCabine] = useState(false)
  const [filtroSeparadorAgua, setFiltroSeparadorAgua] = useState(false)
  const [copoFiltroSeparador, setCopoFiltroSeparador] = useState(false)

  // Estados para observações
  const [observacoes, setObservacoes] = useState<string>("")

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

  // Efeito para resetar o formulário quando o diálogo é aberto
  useEffect(() => {
    if (open && veiculo) {
      // Resetar estados
      resetarFormulario()

      // Carregar dados
      verificarTabelaTrocasOleo()
      verificarEstruturaSaidas()
      fetchColaboradores()
      fetchProdutos()

      // Preencher dados iniciais
      setMedicaoAtual(veiculo.medicao_atual || 0)
      calcularProximaTroca(veiculo.medicao_atual || 0, veiculo.valor_troca)
    }
  }, [open, veiculo])

  // Função para resetar o formulário
  const resetarFormulario = () => {
    setActiveTab("informacoes")
    setMedicaoAtual(0)
    setProximaTroca(0)
    setDataAtual(format(new Date(), "dd/MM/yyyy", { locale: ptBR }))
    setColaboradorSelecionado(null)
    setProdutoOleoSelecionado(null)
    setQuantidadeOleo(0)
    setProdutosSelecionados([])
    setFiltroOleo(false)
    setFiltroCombustivel(false)
    setFiltroAr(false)
    setFiltroCabine(false)
    setFiltroSeparadorAgua(false)
    setCopoFiltroSeparador(false)
    setObservacoes("")
    setErroEstrutura(null)
    setCopiouScript(false)
    setErroProdutos(null)
  }

  // Verificar a estrutura da tabela saidas
  const verificarEstruturaSaidas = async () => {
    try {
      const { data, error } = await supabase.from("saidas").select("*").limit(1)

      if (error && !error.message.includes("Results contain 0 rows")) {
        console.error("Erro ao verificar estrutura da tabela saidas:", error)
        return
      }

      if (data && data.length > 0) {
        setEstruturaSaidas(Object.keys(data[0]))
        console.log("Estrutura da tabela saidas:", Object.keys(data[0]))
      }
    } catch (error) {
      console.error("Erro ao verificar estrutura da tabela saidas:", error)
    }
  }

  // Verificar se a tabela trocas_oleo existe
  const verificarTabelaTrocasOleo = async () => {
    try {
      const { data, error } = await supabase.from("trocas_oleo").select("id").limit(1)

      if (error) {
        if (error.message.includes("does not exist")) {
          setTabelaExiste(false)
          setErroEstrutura("A tabela trocas_oleo não existe no banco de dados.")
          setSqlDialogOpen(true)
        } else {
          console.error("Erro ao verificar tabela:", error)
          setErroEstrutura("Erro ao verificar a tabela trocas_oleo: " + error.message)
        }
      } else {
        setTabelaExiste(true)
        setErroEstrutura(null)
      }
    } catch (error: any) {
      console.error("Erro ao verificar tabela trocas_oleo:", error)
      setErroEstrutura("Erro ao verificar a tabela: " + error.message)
    }
  }

  // Função para buscar colaboradores
  const fetchColaboradores = async () => {
    try {
      setLoadingColaboradores(true)
      const { data, error } = await supabase
        .from("colaboradores")
        .select("id, nome, cargo")
        .eq("status", "Ativo") // Apenas colaboradores ativos
        .order("nome", { ascending: true })

      if (error) throw error

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
      setLoadingColaboradores(false)
    }
  }

  // Função para buscar produtos
  const fetchProdutos = async () => {
    try {
      setLoadingProdutos(true)
      setErroProdutos(null)
      console.log("Buscando produtos do estoque...")

      // Consulta modificada para remover preco_unitario que não existe na tabela
      const { data, error } = await supabase.from("produtos").select("id, nome, categoria, quantidade, unidade")

      if (error) {
        console.error("Erro na consulta de produtos:", error)
        setErroProdutos(`Erro ao buscar produtos: ${error.message}`)
        throw error
      }

      if (!data || data.length === 0) {
        console.log("Nenhum produto encontrado")
        setErroProdutos("Nenhum produto encontrado na tabela 'produtos'")
        setTodosProdutos([])
        setProdutosOleo([])
        return
      }

      console.log(`Produtos encontrados: ${data.length}`)

      // Armazenar todos os produtos
      setTodosProdutos(data)

      // Separar produtos de óleo para o seletor específico
      const oleos = data.filter(
        (produto) =>
          (produto.categoria &&
            (produto.categoria.toLowerCase().includes("óleo") || produto.categoria.toLowerCase().includes("oleo"))) ||
          (produto.nome &&
            (produto.nome.toLowerCase().includes("óleo") || produto.nome.toLowerCase().includes("oleo"))),
      )

      console.log(`Produtos de óleo encontrados: ${oleos.length}`)
      setProdutosOleo(oleos.length > 0 ? oleos : data.slice(0, 20)) // Se não encontrar óleos, usar todos os produtos

      // Pré-carregar produtos para busca
      setProdutosBuscados(data.slice(0, 20))
    } catch (error: any) {
      console.error("Erro ao buscar produtos:", error)
      setErroProdutos(`Erro ao buscar produtos: ${error.message || "Erro desconhecido"}`)
      toast({
        title: "Erro",
        description: "Não foi possível carregar os produtos.",
        variant: "destructive",
      })
    } finally {
      setLoadingProdutos(false)
    }
  }

  // Função para buscar produtos com base no termo de busca
  const buscarProdutos = (termo: string) => {
    setTermoBusca(termo)

    // Se o termo estiver vazio, mostrar os primeiros 20 produtos
    if (!termo || termo.trim() === "") {
      setProdutosBuscados(todosProdutos.slice(0, 20))
      return
    }

    // Buscar produtos que correspondam ao termo (nome ou categoria)
    const termoLower = termo.toLowerCase()
    const resultados = todosProdutos.filter(
      (produto) =>
        (produto.nome && produto.nome.toLowerCase().includes(termoLower)) ||
        (produto.categoria && produto.categoria.toLowerCase().includes(termoLower)),
    )

    console.log(`Produtos encontrados para "${termo}": ${resultados.length}`)
    setProdutosBuscados(resultados.slice(0, 20)) // Limitar a 20 resultados
  }

  // Função para adicionar produto à lista de selecionados
  const adicionarProduto = (produto: Produto) => {
    // Verificar se o produto já está na lista
    const existente = produtosSelecionados.find((p) => p.id === produto.id)
    if (existente) {
      // Atualizar quantidade
      setProdutosSelecionados(
        produtosSelecionados.map((p) => (p.id === produto.id ? { ...p, quantidade: p.quantidade + 1 } : p)),
      )
    } else {
      // Adicionar novo produto
      setProdutosSelecionados([...produtosSelecionados, { id: produto.id, nome: produto.nome, quantidade: 1 }])
    }

    // Limpar busca
    setTermoBusca("")
    setProdutosBuscados([])
    setSelecionarProdutoDialogOpen(false)
  }

  // Função para remover produto da lista de selecionados
  const removerProduto = (id: number) => {
    setProdutosSelecionados(produtosSelecionados.filter((p) => p.id !== id))
  }

  // Função para atualizar a quantidade de um produto selecionado
  const atualizarQuantidadeProduto = (id: number, quantidade: number) => {
    if (quantidade <= 0) {
      removerProduto(id)
      return
    }

    setProdutosSelecionados(produtosSelecionados.map((p) => (p.id === id ? { ...p, quantidade } : p)))
  }

  // Função para calcular a próxima troca
  const calcularProximaTroca = (medicao: number, valorTroca?: number) => {
    if (!valorTroca) {
      // Valor padrão com base no tipo de medição
      if (veiculo) {
        switch (veiculo.tipo_medicao) {
          case "Quilometragem":
            setProximaTroca(medicao + 5000) // 5.000 km
            break
          case "Horimetro":
            setProximaTroca(medicao + 250) // 250 horas
            break
          case "Meses":
            setProximaTroca(medicao + 6) // 6 meses
            break
          default:
            setProximaTroca(medicao + 5000) // Padrão: 5.000 unidades
        }
      } else {
        setProximaTroca(medicao + 5000) // Padrão se não houver veículo
      }
    } else {
      setProximaTroca(medicao + valorTroca)
    }
  }

  // Função para copiar o script SQL para a área de transferência
  const copiarScriptSQL = () => {
    navigator.clipboard.writeText(sqlScript).then(
      () => {
        setCopiouScript(true)
        toast({
          title: "Sucesso",
          description: "Script SQL copiado para a área de transferência!",
        })

        // Resetar o estado após 3 segundos
        setTimeout(() => {
          setCopiouScript(false)
        }, 3000)
      },
      (err) => {
        console.error("Erro ao copiar texto: ", err)
        toast({
          title: "Erro",
          description: "Não foi possível copiar o script.",
          variant: "destructive",
        })
      },
    )
  }

  // Função para converter data formatada (DD/MM/YYYY) para ISO
  const converterDataParaISO = (dataFormatada: string) => {
    try {
      if (!dataFormatada) return new Date().toISOString()

      // Verificar se o formato é válido (DD/MM/YYYY)
      const isValidFormat = /^\d{2}\/\d{2}\/\d{4}$/.test(dataFormatada)
      if (!isValidFormat) {
        console.log("Formato de data inválido:", dataFormatada)
        return new Date().toISOString()
      }

      // Converter a data
      const [day, month, year] = dataFormatada.split("/").map(Number)

      // Validar componentes da data
      if (
        isNaN(day) ||
        day < 1 ||
        day > 31 ||
        isNaN(month) ||
        month < 1 ||
        month > 12 ||
        isNaN(year) ||
        year < 1900 ||
        year > 2100
      ) {
        console.log("Componentes de data inválidos:", { day, month, year })
        return new Date().toISOString()
      }

      // Criar objeto de data e validar
      const data = new Date(year, month - 1, day)
      if (isNaN(data.getTime())) {
        console.log("Data inválida após criação do objeto Date")
        return new Date().toISOString()
      }

      return data.toISOString()
    } catch (error) {
      console.error("Erro ao converter data:", error)
      return new Date().toISOString()
    }
  }

  // Função para registrar a troca de óleo
  const handleRegistrarTroca = async () => {
    if (!veiculo) return

    try {
      setLoading(true)

      // Validações
      if (!colaboradorSelecionado) {
        toast({
          title: "Erro",
          description: "Por favor, selecione um condutor.",
          variant: "destructive",
        })
        setActiveTab("informacoes")
        return
      }

      if (medicaoAtual <= 0) {
        toast({
          title: "Erro",
          description: `Por favor, informe a ${veiculo.tipo_medicao === "Quilometragem" ? "quilometragem" : "hora"} atual.`,
          variant: "destructive",
        })
        setActiveTab("informacoes")
        return
      }

      if (!produtoOleoSelecionado) {
        toast({
          title: "Erro",
          description: "Por favor, selecione um óleo.",
          variant: "destructive",
        })
        setActiveTab("produtos")
        return
      }

      if (quantidadeOleo <= 0) {
        toast({
          title: "Erro",
          description: "Por favor, informe a quantidade de óleo utilizada.",
          variant: "destructive",
        })
        setActiveTab("produtos")
        return
      }

      // Verificar se a quantidade de óleo disponível é suficiente
      if (produtoOleoSelecionado.quantidade < quantidadeOleo) {
        toast({
          title: "Erro",
          description: `Quantidade insuficiente de ${produtoOleoSelecionado.nome} em estoque. Disponível: ${produtoOleoSelecionado.quantidade} ${produtoOleoSelecionado.unidade}`,
          variant: "destructive",
        })
        setActiveTab("produtos")
        return
      }

      // Verificar se as quantidades dos produtos adicionais são suficientes
      for (const produtoSelecionado of produtosSelecionados) {
        const produto = todosProdutos.find((p) => p.id === produtoSelecionado.id)
        if (produto && produto.quantidade < produtoSelecionado.quantidade) {
          toast({
            title: "Erro",
            description: `Quantidade insuficiente de ${produto.nome} em estoque. Disponível: ${produto.quantidade} ${produto.unidade}`,
            variant: "destructive",
          })
          setActiveTab("produtos")
          return
        }
      }

      // Verificar se a tabela existe
      if (!tabelaExiste) {
        toast({
          title: "Erro na estrutura da tabela",
          description: "A tabela trocas_oleo não existe. Por favor, execute o script SQL para criá-la.",
          variant: "destructive",
        })
        setSqlDialogOpen(true)
        return
      }

      // Preparar dados para inserção
      const dataIso = converterDataParaISO(dataAtual)

      // Construir o objeto de inserção
      const trocaOleo = {
        veiculo_id: veiculo.id,
        data_troca: dataIso,
        condutor_id: colaboradorSelecionado.id,
        condutor_nome: colaboradorSelecionado.nome,
        medicao_atual: medicaoAtual,
        medicao_troca: medicaoAtual,
        proxima_troca: proximaTroca,
        tipo_oleo: produtoOleoSelecionado.nome,
        produto_oleo_id: produtoOleoSelecionado.id,
        quantidade_oleo: quantidadeOleo,
        filtro_oleo: filtroOleo,
        filtro_combustivel: filtroCombustivel,
        filtro_ar: filtroAr,
        filtro_cabine: filtroCabine,
        filtro_separador_agua: filtroSeparadorAgua,
        copo_filtro_separador: copoFiltroSeparador,
        produtos: produtosSelecionados.length > 0 ? JSON.stringify(produtosSelecionados) : null,
        observacoes: observacoes || null,
        responsavel: userData?.nome || "Usuário do Sistema",
      }

      // Inserir no banco de dados
      const { data, error } = await supabase.from("trocas_oleo").insert(trocaOleo).select()

      if (error) {
        console.error("Erro ao inserir troca de óleo:", error)

        // Se o erro for relacionado à estrutura da tabela, mostrar o diálogo SQL
        if (error.message.includes("column") || error.message.includes("does not exist")) {
          setErroEstrutura("A estrutura da tabela trocas_oleo precisa ser atualizada.")
          setSqlDialogOpen(true)
          toast({
            title: "Erro na estrutura da tabela",
            description: "A tabela trocas_oleo precisa ser atualizada. Por favor, execute o script SQL.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Erro",
            description: "Não foi possível registrar a troca de óleo: " + error.message,
            variant: "destructive",
          })
        }

        return
      }

      // Atualizar a medição atual do veículo
      await supabase.from("atualizacoes_km").insert({
        veiculo_id: veiculo.id,
        medicao_anterior: veiculo.medicao_atual || 0,
        medicao_atual: medicaoAtual,
        data_atualizacao: dataIso,
        usuario: userData?.nome || "Usuário do Sistema",
        observacao: `Troca de óleo realizada por ${colaboradorSelecionado.nome}`,
      })

      // Atualizar o estoque do óleo
      await supabase
        .from("produtos")
        .update({ quantidade: produtoOleoSelecionado.quantidade - quantidadeOleo })
        .eq("id", produtoOleoSelecionado.id)

      // Registrar saída do óleo - LÓGICA SIMPLIFICADA
      const { error: saidaError } = await supabase.from("saidas").insert({
        produto_id: produtoOleoSelecionado.id,
        quantidade: quantidadeOleo,
        unidade: produtoOleoSelecionado.unidade,
        data_saida: dataIso,
        solicitante: colaboradorSelecionado.nome,
        destino: `${veiculo.marca} ${veiculo.modelo} - Placa: ${veiculo.placa}`,
        observacao: `Troca de óleo - ID: ${data[0].id}`,
        // Removido o campo usuario que não existe na tabela
      })

      if (saidaError) {
        console.error("Erro ao registrar saída do óleo:", saidaError)
        toast({
          title: "Aviso",
          description: "A troca foi registrada, mas houve um erro ao registrar a saída: " + saidaError.message,
          variant: "destructive",
        })
      }

      // Dar baixa nos produtos adicionais
      for (const produto of produtosSelecionados) {
        // Buscar produto atual
        const produtoAtual = todosProdutos.find((p) => p.id === produto.id)

        if (produtoAtual) {
          // Atualizar quantidade
          await supabase
            .from("produtos")
            .update({ quantidade: produtoAtual.quantidade - produto.quantidade })
            .eq("id", produto.id)

          // Registrar saída do produto adicional - LÓGICA SIMPLIFICADA
          const { error: saidaProdutoError } = await supabase.from("saidas").insert({
            produto_id: produto.id,
            quantidade: produto.quantidade,
            unidade: produtoAtual.unidade,
            data_saida: dataIso,
            solicitante: colaboradorSelecionado.nome,
            destino: `${veiculo.marca} ${veiculo.modelo} - Placa: ${veiculo.placa}`,
            observacao: `Filtro/Produto para troca de óleo - ID: ${data[0].id}`,
            // Removido o campo usuario que não existe na tabela
          })

          if (saidaProdutoError) {
            console.error(`Erro ao registrar saída do produto ${produto.id}:`, saidaProdutoError)
          }
        }
      }

      toast({
        title: "Sucesso",
        description: "Troca de óleo registrada com sucesso! Os dados foram salvos no histórico.",
      })

      // Fechar diálogo e atualizar dados
      onOpenChange(false)
      if (onSave) onSave()
    } catch (error: any) {
      console.error("Erro ao registrar troca de óleo:", error)
      toast({
        title: "Erro",
        description: "Não foi possível registrar a troca de óleo: " + (error.message || "Erro desconhecido"),
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Função para filtrar óleos com base na busca
  const filtrarOleos = () => {
    console.log(`Filtrando óleos. Total de produtos: ${todosProdutos.length}, Produtos de óleo: ${produtosOleo.length}`)

    // Se não houver termo de busca, mostrar todos os produtos
    if (!buscaOleo || buscaOleo.trim() === "") {
      // Se não houver produtos específicos de óleo, mostrar todos os produtos
      if (produtosOleo.length === 0) {
        console.log("Nenhum produto de óleo encontrado, mostrando todos os produtos")
        return todosProdutos.slice(0, 20) // Limitar a 20 resultados
      }
      return produtosOleo
    }

    // Buscar em todos os produtos, não apenas nos classificados como óleo
    const termoLower = buscaOleo.toLowerCase()
    const resultados = todosProdutos.filter(
      (produto) =>
        (produto.nome && produto.nome.toLowerCase().includes(termoLower)) ||
        (produto.categoria && produto.categoria.toLowerCase().includes(termoLower)),
    )

    console.log(`Produtos encontrados para "${buscaOleo}": ${resultados.length}`)
    return resultados.slice(0, 20) // Limitar a 20 resultados
  }

  // Obter label para o tipo de medição
  const getMedicaoLabel = (tipoMedicao?: string) => {
    if (!tipoMedicao) return "Medição"

    switch (tipoMedicao) {
      case "Quilometragem":
        return "Quilometragem"
      case "Horimetro":
        return "Horímetro"
      case "Meses":
        return "Meses de Uso"
      default:
        return "Medição"
    }
  }

  // Obter unidade para o tipo de medição
  const getMedicaoUnidade = (tipoMedicao?: string) => {
    if (!tipoMedicao) return ""

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

  -- Verificar e adicionar coluna filtro_separador_agua
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trocas_oleo' 
    AND column_name = 'filtro_separador_agua'
  ) THEN
    ALTER TABLE public.trocas_oleo ADD COLUMN filtro_separador_agua BOOLEAN DEFAULT FALSE;
  END IF;

  -- Verificar e adicionar coluna copo_filtro_separador
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'trocas_oleo' 
    AND column_name = 'copo_filtro_separador'
  ) THEN
    ALTER TABLE public.trocas_oleo ADD COLUMN copo_filtro_separador BOOLEAN DEFAULT FALSE;
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

-- Verificar a
    ON public.trocas_oleo FOR ALL
    TO anon
    USING (true);
  END IF;
END
$$;

-- Verificar a estrutura da tabela entradas
DO $$
BEGIN
  -- Verificar se a coluna fornecedor existe na tabela entradas
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'entradas'
    AND column_name = 'fornecedor'
  ) THEN
    -- Se existir, não precisamos fazer nada
    RAISE NOTICE 'Coluna fornecedor existe na tabela entradas';
  ELSE
    -- Se não existir, vamos criar uma função que não usa essa coluna
    RAISE NOTICE 'Coluna fornecedor não existe na tabela entradas, criando função alternativa';
  END IF;
END
$$;

-- Criar função para devolver produtos ao estoque quando uma troca de óleo for excluída
CREATE OR REPLACE FUNCTION devolver_produtos_troca_oleo()
RETURNS TRIGGER AS $$
DECLARE
  produto_record RECORD;
  produto_json JSONB;
  tem_coluna_fornecedor BOOLEAN;
BEGIN
  -- Verificar se a coluna fornecedor existe na tabela entradas
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'entradas'
    AND column_name = 'fornecedor'
  ) INTO tem_coluna_fornecedor;

  -- Devolver o óleo principal ao estoque
  IF OLD.produto_oleo_id IS NOT NULL THEN
    -- Verificar se o produto existe
    IF EXISTS (SELECT 1 FROM produtos WHERE id = OLD.produto_oleo_id) THEN
      -- Atualizar o estoque
      UPDATE produtos
      SET quantidade = quantidade + OLD.quantidade_oleo
      WHERE id = OLD.produto_oleo_id;

      -- Registrar a entrada no histórico
      IF tem_coluna_fornecedor THEN
        -- Se a coluna fornecedor existir, usamos ela
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
      ELSE
        -- Se a coluna fornecedor não existir, não a incluímos
        INSERT INTO entradas (
          produto_id,
          quantidade,
          data_entrada,
          observacao
        ) VALUES (
          OLD.produto_oleo_id,
          OLD.quantidade_oleo,
          NOW(),
          'Devolução automática por exclusão de troca de óleo - Veículo: ' || (SELECT placa FROM veiculos WHERE id = OLD.veiculo_id)
        );
      END IF;
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
        IF tem_coluna_fornecedor THEN
          -- Se a coluna fornecedor existir, usamos ela
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
        ELSE
          -- Se a coluna fornecedor não existir, não a incluímos
          INSERT INTO entradas (
            produto_id,
            quantidade,
            data_entrada,
            observacao
          ) VALUES (
            (produto_json->>'id')::integer,
            (produto_json->>'quantidade')::numeric,
            NOW(),
            'Devolução automática por exclusão de troca de óleo - Veículo: ' || (SELECT placa FROM veiculos WHERE id = OLD.veiculo_id)
          );
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Criar função para verificar a estrutura da trigger
CREATE OR REPLACE FUNCTION verificar_trigger_devolucao_produtos()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN TRUE;
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

  // Adicionar uma função para abrir o popover de seleção de óleo
  const abrirSeletorOleo = () => {
    console.log(`Total de produtos disponíveis: ${todosProdutos.length}`)
    console.log(`Total de produtos de óleo: ${produtosOleo.length}`)

    // Se não houver produtos de óleo, usar todos os produtos
    if (produtosOleo.length === 0) {
      setProdutosOleo(todosProdutos.slice(0, 20))
    }
  }

  // Adicionar um log ao abrir o diálogo de seleção de produtos
  const abrirDialogoSelecionarProduto = () => {
    console.log(`Total de produtos disponíveis: ${todosProdutos.length}`)
    setProdutosBuscados(todosProdutos.slice(0, 20)) // Mostrar os primeiros 20 produtos
    setSelecionarProdutoDialogOpen(true)
  }

  // Função para ativar o modo de depuração
  const toggleDebugMode = () => {
    setDebugMode(!debugMode)
    if (!debugMode) {
      fetchProdutos() // Recarregar produtos ao ativar o modo de depuração
    }
  }

  if (!veiculo) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Registrar Troca de Óleo</span>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={toggleDebugMode}>
              <Bug className={`h-4 w-4 ${debugMode ? "text-red-500" : "text-gray-400"}`} />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Registre uma troca de óleo para o veículo {veiculo.marca} {veiculo.modelo} ({veiculo.placa})
          </DialogDescription>
        </DialogHeader>

        {erroEstrutura && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Problema na estrutura da tabela</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <p>{erroEstrutura}</p>
              <Button variant="outline" size="sm" className="w-fit" onClick={() => setSqlDialogOpen(true)}>
                Ver Script SQL para Criar Tabela
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {debugMode && (
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Modo de Depuração Ativado</AlertTitle>
            <AlertDescription>
              <div className="space-y-2">
                <p>Total de produtos carregados: {todosProdutos.length}</p>
                <p>Produtos de óleo encontrados: {produtosOleo.length}</p>
                <p>Estrutura da tabela saidas: {estruturaSaidas.join(", ")}</p>
                {erroProdutos && <p className="text-red-600 font-medium">Erro: {erroProdutos}</p>}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={fetchProdutos} className="h-8">
                    Recarregar Produtos
                  </Button>
                  <Button size="sm" variant="outline" className="h-8" asChild>
                    <a href="/movimento/saidas/debug-saidas" target="_blank" rel="noreferrer">
                      Diagnóstico de Saídas
                    </a>
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="informacoes">Informações</TabsTrigger>
            <TabsTrigger value="produtos">Produtos</TabsTrigger>
            <TabsTrigger value="observacoes">Observações</TabsTrigger>
          </TabsList>

          <TabsContent value="informacoes" className="space-y-4">
            <div className="flex items-center justify-between bg-card border p-4 rounded-md">
              <div>
                <h3 className="text-lg font-medium">
                  {veiculo.marca} {veiculo.modelo}
                </h3>
                <p className="text-sm text-muted-foreground">Placa: {veiculo.placa}</p>
              </div>
              <Badge
                variant="outline"
                className={
                  veiculo.status === "Ativo"
                    ? "bg-green-100 text-green-800"
                    : veiculo.status === "Manutenção"
                      ? "bg-yellow-100 text-yellow-800"
                      : "bg-red-100 text-red-800"
                }
              >
                {veiculo.status}
              </Badge>
            </div>

            {/* Data da Troca */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="data_troca" className="text-right font-medium">
                Data da Troca
              </Label>
              <div className="col-span-3">
                <Input
                  id="data_troca"
                  type="text"
                  value={dataAtual}
                  onChange={(e) => setDataAtual(e.target.value)}
                  placeholder="DD/MM/AAAA"
                />
              </div>
            </div>

            {/* Seleção de Condutor */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="condutor" className="text-right font-medium">
                Condutor
              </Label>
              <div className="col-span-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between"
                      disabled={loadingColaboradores}
                    >
                      {loadingColaboradores ? (
                        <span className="flex items-center">
                          <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                          Carregando colaboradores...
                        </span>
                      ) : colaboradorSelecionado ? (
                        colaboradorSelecionado.nome
                      ) : (
                        "Selecione um condutor"
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar colaborador..." />
                      <CommandList className="max-h-[300px]">
                        <CommandEmpty>Nenhum colaborador encontrado.</CommandEmpty>
                        <CommandGroup>
                          {colaboradores.map((colaborador) => (
                            <CommandItem
                              key={colaborador.id}
                              value={colaborador.nome}
                              onSelect={() => {
                                setColaboradorSelecionado(colaborador)
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  colaboradorSelecionado?.id === colaborador.id ? "opacity-100" : "opacity-0",
                                )}
                              />
                              <div className="flex flex-col">
                                <span>{colaborador.nome}</span>
                                <span className="text-xs text-muted-foreground">{colaborador.cargo}</span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Medição Atual */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="medicao_atual" className="text-right font-medium">
                {getMedicaoLabel(veiculo.tipo_medicao)} Atual
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="medicao_atual"
                  type="number"
                  value={medicaoAtual}
                  onChange={(e) => {
                    const valor = Number(e.target.value)
                    setMedicaoAtual(valor)
                    calcularProximaTroca(valor, veiculo.valor_troca)
                  }}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">{getMedicaoUnidade(veiculo.tipo_medicao)}</span>
              </div>
            </div>

            {/* Próxima Troca */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="proxima_troca" className="text-right font-medium">
                Próxima Troca
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="proxima_troca"
                  type="number"
                  value={proximaTroca}
                  onChange={(e) => setProximaTroca(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground">{getMedicaoUnidade(veiculo.tipo_medicao)}</span>
              </div>
            </div>

            {/* Histórico de trocas */}
            {historicoTrocas && historicoTrocas.length > 0 && (
              <div className="mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="h-4 w-4 text-blue-500" />
                  <h4 className="text-sm font-medium text-blue-700">Última troca de óleo</h4>
                </div>
                <div className="bg-card border p-3 rounded-md text-sm">
                  <p>
                    <span className="font-medium">Data:</span>{" "}
                    {format(new Date(historicoTrocas[0].data_troca), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                  <p>
                    <span className="font-medium">{getMedicaoLabel(veiculo.tipo_medicao)}:</span>{" "}
                    {historicoTrocas[0].medicao_troca} {getMedicaoUnidade(veiculo.tipo_medicao)}
                  </p>
                  <p>
                    <span className="font-medium">Próxima troca:</span> {historicoTrocas[0].proxima_troca}{" "}
                    {getMedicaoUnidade(veiculo.tipo_medicao)}
                  </p>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="produtos" className="space-y-4">
            {/* Tipo de Óleo */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="tipo_oleo" className="text-right font-medium">
                Selecionar Óleo
              </Label>
              <div className="col-span-3">
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between"
                        disabled={loadingProdutos}
                        onClick={abrirSeletorOleo}
                      >
                        {loadingProdutos ? (
                          <span className="flex items-center">
                            <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                            Carregando produtos...
                          </span>
                        ) : produtoOleoSelecionado ? (
                          produtoOleoSelecionado.nome
                        ) : (
                          "Selecione um produto"
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                      <Command>
                        <CommandInput placeholder="Buscar produto..." value={buscaOleo} onValueChange={setBuscaOleo} />
                        <CommandList className="max-h-[300px]">
                          <CommandEmpty>Nenhum produto encontrado.</CommandEmpty>
                          <CommandGroup>
                            {filtrarOleos().map((produto) => (
                              <CommandItem
                                key={produto.id}
                                value={produto.nome || `Produto ${produto.id}`}
                                onSelect={() => {
                                  setProdutoOleoSelecionado(produto)
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    produtoOleoSelecionado?.id === produto.id ? "opacity-100" : "opacity-0",
                                  )}
                                />
                                <div className="flex flex-col">
                                  <span>{produto.nome || `Produto ${produto.id}`}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {produto.categoria || "Sem categoria"} - Estoque: {produto.quantidade || 0}{" "}
                                    {produto.unidade || "un"}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            </div>

            {/* Quantidade de Óleo */}
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="quantidade_oleo" className="text-right font-medium">
                Quantidade de Óleo
              </Label>
              <div className="col-span-3 flex items-center gap-2">
                <Input
                  id="quantidade_oleo"
                  type="number"
                  value={quantidadeOleo}
                  onChange={(e) => setQuantidadeOleo(Number(e.target.value))}
                  className="flex-1"
                  step="0.1"
                  min="0"
                />
                <span className="text-sm text-muted-foreground">litros</span>
              </div>
            </div>

            {/* Filtros */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right font-medium pt-2">Filtros Trocados</Label>
              <div className="col-span-3 grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="filtro_oleo"
                    checked={filtroOleo}
                    onCheckedChange={(checked) => setFiltroOleo(checked === true)}
                  />
                  <Label htmlFor="filtro_oleo" className="font-normal">
                    Filtro de Óleo
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="filtro_combustivel"
                    checked={filtroCombustivel}
                    onCheckedChange={(checked) => setFiltroCombustivel(checked === true)}
                  />
                  <Label htmlFor="filtro_combustivel" className="font-normal">
                    Filtro de Combustível
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="filtro_ar"
                    checked={filtroAr}
                    onCheckedChange={(checked) => setFiltroAr(checked === true)}
                  />
                  <Label htmlFor="filtro_ar" className="font-normal">
                    Filtro de Ar
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="filtro_cabine"
                    checked={filtroCabine}
                    onCheckedChange={(checked) => setFiltroCabine(checked === true)}
                  />
                  <Label htmlFor="filtro_cabine" className="font-normal">
                    Filtro de Cabine
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="filtro_separador_agua"
                    checked={filtroSeparadorAgua}
                    onCheckedChange={(checked) => setFiltroSeparadorAgua(checked === true)}
                  />
                  <Label htmlFor="filtro_separador_agua" className="font-normal">
                    Filtro Separador de Água
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="copo_filtro_separador"
                    checked={copoFiltroSeparador}
                    onCheckedChange={(checked) => setCopoFiltroSeparador(checked === true)}
                  />
                  <Label htmlFor="copo_filtro_separador" className="font-normal">
                    Copo do Filtro Separador
                  </Label>
                </div>
              </div>
            </div>

            {/* Produtos Utilizados */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right font-medium pt-2">Produtos Utilizados</Label>
              <div className="col-span-3 spacee-y-4">
                <Button variant="outline" onClick={abrirDialogoSelecionarProduto} className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar Produto
                </Button>

                {produtosSelecionados.length > 0 ? (
                  <div className="space-y-2">
                    {produtosSelecionados.map((produto) => (
                      <div key={produto.id} className="flex items-center justify-between bg-gray-50 p-2 rounded-md">
                        <div className="flex-1">
                          <p className="text-sm font-medium">{produto.nome}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number"
                            value={produto.quantidade}
                            onChange={(e) => atualizarQuantidadeProduto(produto.id, Number(e.target.value))}
                            className="w-20 h-8"
                            min="1"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removerProduto(produto.id)}
                            className="h-8 w-8 p-0 text-red-500"
                          >
                            &times;
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    Nenhum produto selecionado. Clique em "Adicionar Produto" para selecionar produtos utilizados na
                    troca.
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="observacoes" className="space-y-4">
            {/* Observações */}
            <div className="grid grid-cols-1 items-start gap-4">
              <Label htmlFor="observacoes" className="font-medium">
                Observações
              </Label>
              <Textarea
                id="observacoes"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Observações adicionais sobre a troca de óleo"
                className="min-h-[150px]"
              />
            </div>

            <Alert variant="warning">
              <Info className="h-4 w-4" />
              <AlertTitle>Informações importantes</AlertTitle>
              <AlertDescription>
                <ul className="list-disc pl-5 space-y-1 mt-2">
                  <li>Registre qualquer anomalia observada durante a troca de óleo</li>
                  <li>Anote a marca e especificação do óleo utilizado, se diferente do selecionado</li>
                  <li>Informe se houve algum problema com os filtros</li>
                  <li>Registre recomendações para a próxima manutenção</li>
                </ul>
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleRegistrarTroca} disabled={loading}>
            {loading ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent"></div>
                Registrando...
              </>
            ) : (
              "Registrar Troca"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>

      {/* Diálogo para selecionar produtos */}
      <Dialog open={selecionarProdutoDialogOpen} onOpenChange={setSelecionarProdutoDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Selecionar Produto</DialogTitle>
            <DialogDescription>Busque e selecione produtos utilizados na troca de óleo</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos..."
                className="pl-8"
                value={termoBusca}
                onChange={(e) => buscarProdutos(e.target.value)}
              />
            </div>

            {loadingProdutos ? (
              <div className="flex justify-center py-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
              </div>
            ) : todosProdutos.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">Nenhum produto encontrado no estoque.</div>
            ) : termoBusca.length < 2 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {todosProdutos.slice(0, 20).map((produto) => (
                  <div
                    key={produto.id}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md cursor-pointer"
                    onClick={() => adicionarProduto(produto)}
                  >
                    <div>
                      <p className="font-medium">{produto.nome || "Produto sem nome"}</p>
                      <p className="text-xs text-muted-foreground">
                        {produto.categoria || "Sem categoria"} - Estoque: {produto.quantidade || 0}{" "}
                        {produto.unidade || "un"}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : produtosBuscados.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {produtosBuscados.map((produto) => (
                  <div
                    key={produto.id}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-md cursor-pointer"
                    onClick={() => adicionarProduto(produto)}
                  >
                    <div>
                      <p className="font-medium">{produto.nome || "Produto sem nome"}</p>
                      <p className="text-xs text-muted-foreground">
                        {produto.categoria || "Sem categoria"} - Estoque: {produto.quantidade || 0}{" "}
                        {produto.unidade || "un"}
                      </p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                Nenhum produto encontrado para "{termoBusca}".
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelecionarProdutoDialogOpen(false)}>
              Fechar
            </Button>
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

          <div className="bg-gray-50 p-4 rounded-md overflow-x-auto relative">
            <pre className="text-sm">{sqlScript}</pre>
            <Button variant="outline" size="sm" className="absolute top-2 right-2" onClick={copiarScriptSQL}>
              {copiouScript ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </>
              )}
            </Button>
          </div>

          <div className="mt-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Instruções</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>1. Acesse o painel do Supabase</p>
                <p>2. Vá para a seção "SQL Editor"</p>
                <p>3. Cole o script acima (use o botão "Copiar")</p>
                <p>4. Execute o script</p>
                <p>5. Após a execução, atualize esta página</p>
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button onClick={() => setSqlDialogOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}

