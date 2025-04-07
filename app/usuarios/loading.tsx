import LayoutAutenticado from "@/components/layout-autenticado"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Loading() {
  return (
    <LayoutAutenticado>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Usuários do Sistema</h2>
          <p className="text-muted-foreground">Gerencie os usuários que têm acesso ao sistema.</p>
        </div>

        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-36" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Lista de Usuários</CardTitle>
            <CardDescription>Carregando usuários...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </LayoutAutenticado>
  )
}

