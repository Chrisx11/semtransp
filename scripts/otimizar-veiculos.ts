import { createClient } from "@supabase/supabase-js"

// Configurar cliente Supabase com variáveis de ambiente
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""

// Verificar se as variáveis de ambiente estão configuradas
if (!supabaseUrl || !supabaseKey) {
  console.error("Erro: Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são necessárias")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function otimizarTabelaVeiculos() {
  console.log("Iniciando otimização da tabela de veículos...")

  try {
    // 1. Verificar se a coluna tipo_combustivel existe
    console.log("Verificando se a coluna tipo_combustivel existe...")
    const { data: colunas, error: erroColunas } = await supabase.rpc("get_table_columns", {
      table_name: "veiculos",
    })

    if (erroColunas) {
      throw new Error(`Erro ao verificar colunas: ${erroColunas.message}`)
    }

    const colunasExistentes = colunas || []
    const temColunaCombustivel = colunasExistentes.some((col) => col.column_name === "tipo_combustivel")

    // 2. Adicionar a coluna tipo_combustivel se não existir
    if (!temColunaCombustivel) {
      console.log("Adicionando coluna tipo_combustivel...")
      const { error: erroAddColuna } = await supabase.rpc("execute_sql", {
        sql: "ALTER TABLE veiculos ADD COLUMN tipo_combustivel TEXT;",
      })

      if (erroAddColuna) {
        throw new Error(`Erro ao adicionar coluna: ${erroAddColuna.message}`)
      }

      console.log("Coluna tipo_combustivel adicionada com sucesso!")
    } else {
      console.log("Coluna tipo_combustivel já existe.")
    }

    // 3. Adicionar índices para melhorar a performance
    console.log("Adicionando índices para otimização...")

    // Índice para placa (busca frequente)
    await supabase.rpc("execute_sql", {
      sql: "CREATE INDEX IF NOT EXISTS idx_veiculos_placa ON veiculos(placa);",
    })

    // Índice para secretaria (filtro frequente)
    await supabase.rpc("execute_sql", {
      sql: "CREATE INDEX IF NOT EXISTS idx_veiculos_secretaria ON veiculos(secretaria);",
    })

    // Índice para status (filtro frequente)
    await supabase.rpc("execute_sql", {
      sql: "CREATE INDEX IF NOT EXISTS idx_veiculos_status ON veiculos(status);",
    })

    // Índice para tipo_combustivel (novo campo)
    await supabase.rpc("execute_sql", {
      sql: "CREATE INDEX IF NOT EXISTS idx_veiculos_tipo_combustivel ON veiculos(tipo_combustivel);",
    })

    console.log("Índices criados com sucesso!")

    // 4. Analisar a tabela para atualizar estatísticas
    console.log("Analisando tabela para otimizar consultas...")
    await supabase.rpc("execute_sql", {
      sql: "ANALYZE veiculos;",
    })

    console.log("Otimização concluída com sucesso!")
  } catch (error) {
    console.error("Erro durante a otimização:", error)
  }
}

// Executar a função de otimização
otimizarTabelaVeiculos()

