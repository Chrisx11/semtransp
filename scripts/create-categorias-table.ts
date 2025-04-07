import { supabase } from "@/lib/supabase"

// Esta função cria a tabela categorias_produtos se ela não existir
export async function createCategoriasTable() {
  try {
    // Criar a stored procedure que cria a tabela se não existir
    const { error: procedureError } = await supabase.rpc("exec_sql", {
      sql_query: `
        CREATE OR REPLACE FUNCTION create_categorias_table()
        RETURNS void AS $$
        BEGIN
          -- Verificar se a tabela já existe
          IF NOT EXISTS (
            SELECT FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = 'categorias_produtos'
          ) THEN
            -- Criar a tabela
            CREATE TABLE public.categorias_produtos (
              id SERIAL PRIMARY KEY,
              nome TEXT UNIQUE NOT NULL,
              created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
          END IF;
        END;
        $$ LANGUAGE plpgsql;
      `,
    })

    if (procedureError) {
      console.error("Erro ao criar stored procedure:", procedureError)
      return false
    }

    // Criar a stored procedure para verificar se outra stored procedure existe
    const { error: checkProcedureError } = await supabase.rpc("exec_sql", {
      sql_query: `
        CREATE OR REPLACE FUNCTION create_stored_procedure_if_not_exists()
        RETURNS void AS $$
        BEGIN
          -- Verificar se a função já existe
          IF NOT EXISTS (
            SELECT FROM pg_proc 
            WHERE proname = 'create_categorias_table'
          ) THEN
            -- Criar a função
            CREATE OR REPLACE FUNCTION create_categorias_table()
            RETURNS void AS $func$
            BEGIN
              -- Verificar se a tabela já existe
              IF NOT EXISTS (
                SELECT FROM pg_tables 
                WHERE schemaname = 'public' 
                AND tablename = 'categorias_produtos'
              ) THEN
                -- Criar a tabela
                CREATE TABLE public.categorias_produtos (
                  id SERIAL PRIMARY KEY,
                  nome TEXT UNIQUE NOT NULL,
                  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
                );
              END IF;
            END;
            $func$ LANGUAGE plpgsql;
          END IF;
        END;
        $$ LANGUAGE plpgsql;
      `,
    })

    if (checkProcedureError) {
      console.error("Erro ao criar stored procedure de verificação:", checkProcedureError)
      return false
    }

    // Executar a stored procedure para criar a tabela
    const { error: execError } = await supabase.rpc("create_categorias_table")

    if (execError) {
      console.error("Erro ao executar stored procedure:", execError)
      return false
    }

    console.log("Tabela categorias_produtos criada com sucesso!")
    return true
  } catch (error) {
    console.error("Erro ao criar tabela categorias_produtos:", error)
    return false
  }
}

// Executar a função se este arquivo for executado diretamente
if (require.main === module) {
  createCategoriasTable()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

