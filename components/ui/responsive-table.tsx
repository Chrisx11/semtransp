"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent } from "@/components/ui/card"
import { useMediaQuery } from "@/hooks/use-media-query"

interface Column {
  header: string
  accessorKey: string
  cell?: (value: any, row: any) => React.ReactNode
}

interface ResponsiveTableProps {
  data: any[]
  columns: Column[]
  emptyMessage?: React.ReactNode | string
  isLoading?: boolean
}

export function ResponsiveTable({
  data,
  columns,
  emptyMessage = "Nenhum dado encontrado",
  isLoading = false,
}: ResponsiveTableProps) {
  const isMobile = useMediaQuery("(max-width: 768px)")
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">{emptyMessage}</div>
  }

  // Não renderizar nada durante a montagem do componente no servidor
  if (!mounted) {
    return (
      <div className="flex justify-center py-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  // Versão para desktop - tabela normal
  if (!isMobile) {
    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column, index) => (
                <TableHead key={index}>{column.header}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((column, colIndex) => (
                  <TableCell key={colIndex}>
                    {column.cell ? column.cell(row[column.accessorKey], row) : row[column.accessorKey]}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  // Versão para mobile - cards
  return (
    <div className="space-y-4">
      {data.map((row, rowIndex) => (
        <Card key={rowIndex} className="overflow-hidden">
          <CardContent className="p-0">
            <div className="divide-y">
              {columns.map((column, colIndex) => (
                <div key={colIndex} className="flex items-start p-3">
                  <div className="w-1/3 font-medium text-sm">{column.header}</div>
                  <div className="w-2/3 text-sm">
                    {column.cell ? column.cell(row[column.accessorKey], row) : row[column.accessorKey]}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

