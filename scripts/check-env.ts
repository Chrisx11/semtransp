// Script para verificar variáveis de ambiente
console.log("Verificando variáveis de ambiente...")

console.log("NEXT_PUBLIC_SUPABASE_URL:", process.env.NEXT_PUBLIC_SUPABASE_URL || "não definido")
console.log(
  "SUPABASE_SERVICE_ROLE_KEY:",
  process.env.SUPABASE_SERVICE_ROLE_KEY
    ? process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10) + "..."
    : "não definido",
)

// Verificar todas as variáveis de ambiente disponíveis
console.log("\nTodas as variáveis de ambiente:")
Object.keys(process.env)
  .filter((key) => key.includes("SUPABASE"))
  .forEach((key) => {
    const value = process.env[key]
    console.log(`${key}: ${value ? value.substring(0, 10) + "..." : "não definido"}`)
  })

console.log("\nVerificação concluída!")

