import { createClient } from "@supabase/supabase-js"

// Substitua com suas credenciais do Supabase
const supabaseUrl = "https://mhejfdtkglnrwjbxbzqe.supabase.co"
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZWpmZHRrZ2xucndqYnhienFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1MDA1MTgsImV4cCI6MjA1OTA3NjUxOH0.sxL7t74O9IdJ21LbS0c752dyG-ZzuxoYmD2N2RyUqhk"

// Criar cliente Supabase
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Garantir que a tabela trocas_oleo tenha todos os campos necessários
export async function createTrocasOleoTable() {
  const { data, error } = await supabase.rpc("create_trocas_oleo_table")

  if (error) {
    console.error("Erro ao criar tabela de trocas de óleo:", error)

    // Tentar criar manualmente se a função RPC falhar
    const { error: createError } = await supabase.query(`
      CREATE TABLE IF NOT EXISTS trocas_oleo (
        id SERIAL PRIMARY KEY,
        veiculo_id INTEGER NOT NULL,
        data_troca TIMESTAMP WITH TIME ZONE NOT NULL,
        medicao_troca NUMERIC NOT NULL,
        tipo_oleo TEXT NOT NULL,
        quantidade_oleo NUMERIC NOT NULL,
        filtro_oleo BOOLEAN DEFAULT FALSE,
        filtro_combustivel BOOLEAN DEFAULT FALSE,
        filtro_ar BOOLEAN DEFAULT FALSE,
        filtro_cabine BOOLEAN DEFAULT FALSE,
        proxima_troca NUMERIC NOT NULL,
        observacoes TEXT,
        responsavel TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        condutor_id INTEGER,
        condutor_nome TEXT,
        produto_oleo_id INTEGER,
        produtos JSONB,
        medicao_atual NUMERIC
      );
    `)

    if (createError) {
      console.error("Erro ao criar tabela manualmente:", createError)
      return false
    }
  }

  return true
}

// Executar a função
createTrocasOleoTable()

