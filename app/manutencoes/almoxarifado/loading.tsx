import { Skeleton } from "@/components/ui/skeleton"
import LayoutAutenticado from "@/components/layout-autenticado"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function AlmoxarifadoLoading() {
  return (
    <LayoutAutenticado>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Almoxarifado</h2>
          <p className="text-muted-foreground">Gerencie as solicitações de peças e materiais.</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center w-full max-w-xl">
            <Skeleton className="h-10 w-full max-w-md" />
            <Skeleton className="h-10 w-40" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Solicitações do Almoxarifado</CardTitle>
            <Skeleton className="h-4 w-full max-w-md mt-2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    </LayoutAutenticado>
  )
}

