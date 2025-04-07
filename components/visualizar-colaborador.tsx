import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

interface VisualizarColaboradorProps {
  colaborador: {
    id: number
    nome: string
    cargo: string
    secretaria: string
    contato: string
    status: string
  } | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VisualizarColaborador({ colaborador, open, onOpenChange }: VisualizarColaboradorProps) {
  if (!colaborador) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Detalhes do Colaborador</DialogTitle>
          <DialogDescription>Informações completas do colaborador.</DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Nome</h3>
              <p className="text-base">{colaborador.nome}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Cargo</h3>
              <p className="text-base">{colaborador.cargo}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Secretaria</h3>
              <p className="text-base">{colaborador.secretaria}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Contato</h3>
              <p className="text-base">{colaborador.contato}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground">Status</h3>
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  colaborador.status === "Ativo" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}
              >
                {colaborador.status}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

