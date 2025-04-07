import { createClient } from "@supabase/supabase-js"

// Usar as credenciais fornecidas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mhejfdtkglnrwjbxbzqe.supabase.co"
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZWpmZHRrZ2xucndqYnhienFlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM1MDA1MTgsImV4cCI6MjA1OTA3NjUxOH0.sxL7t74O9IdJ21LbS0c752dyG-ZzuxoYmD2N2RyUqhk"
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZWpmZHRrZ2xucndqYnhienFlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0MzUwMDUxOCwiZXhwIjoyMDU5MDc2NTE4fQ.Ln2e-oJBcpm4P5fz8PDemdKqpa77G__t3tDO_b3CwNs"

// Cliente padrão com chave anônima (para operações do cliente)
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Cliente com chave de serviço (para operações administrativas)
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

console.log("Supabase configurado com sucesso!")

// Função auxiliar para verificar se a tabela de permissões existe
export async function checkPermissoesTable() {
  try {
    console.log("Verificando se a tabela de permissões existe...")

    // Verificar se a tabela já existe tentando fazer uma consulta
    const { error: checkError } = await supabaseAdmin.from("permissoes_usuarios").select("id").limit(1)

    if (!checkError) {
      console.log("Tabela de permissões existe!")
      return { exists: true, success: true }
    }

    // Se o erro for relacionado à tabela não existente
    if (checkError.message.includes("does not exist")) {
      console.log("Tabela de permissões não existe!")
      return { exists: false, success: true }
    }

    // Outro tipo de erro
    throw new Error(`Erro ao verificar tabela: ${checkError.message}`)
  } catch (error: any) {
    console.error("Erro ao verificar tabela de permissões:", error)
    return {
      exists: false,
      success: false,
      error: error.message || "Erro desconhecido ao verificar tabela de permissões",
    }
  }
}

