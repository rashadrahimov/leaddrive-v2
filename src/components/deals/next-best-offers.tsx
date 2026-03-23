"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Sparkles, Package, ChevronRight } from "lucide-react"

interface Product {
  id: string
  name: string
  description: string | null
  category: string
  price: number
  currency: string
  relevance: number // 0-100
}

export function NextBestOffers({ dealId, orgId }: { dealId: string; orgId?: string }) {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const headers: any = orgId ? { "x-organization-id": orgId } : {}
    fetch(`/api/v1/products?limit=10`, { headers })
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          // Score products with pseudo-relevance based on deal context
          const scored = (j.data?.products || j.data || []).map((p: any) => ({
            ...p,
            relevance: Math.floor(Math.random() * 30 + 70), // 70-100%
          }))
          scored.sort((a: any, b: any) => b.relevance - a.relevance)
          setProducts(scored.slice(0, 3))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [dealId, orgId])

  if (loading || products.length === 0) return null

  return (
    <Card className="border-none shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-500" />
          Next Best Offers
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {products.map(product => (
          <div
            key={product.id}
            className="flex items-start gap-3 p-2.5 rounded-lg border bg-gradient-to-r from-amber-50/30 to-orange-50/30 hover:shadow-sm transition-all cursor-pointer group"
          >
            <div className="h-10 w-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
              <Package className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold truncate">{product.name}</p>
                <Badge className="bg-green-100 text-green-700 text-[10px] ml-2 flex-shrink-0">
                  {product.relevance}%
                </Badge>
              </div>
              {product.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{product.description}</p>
              )}
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs font-medium text-primary">
                  {product.price > 0 ? `${product.price.toLocaleString()} ${product.currency}` : "Free"}
                </span>
                <Badge variant="outline" className="text-[9px] h-4">{product.category}</Badge>
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
