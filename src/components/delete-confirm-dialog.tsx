"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Loader2, AlertTriangle } from "lucide-react"

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  title?: string
  description?: string
  itemName?: string
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title = "Delete Item",
  description,
  itemName,
}: DeleteConfirmDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function handleConfirm() {
    setLoading(true)
    setError("")
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || "Failed to delete")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          {title}
        </DialogTitle>
      </DialogHeader>
      <DialogContent>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {description || (
              <>Are you sure you want to delete {itemName ? <strong>{itemName}</strong> : "this item"}? This action cannot be undone.</>
            )}
          </p>
          {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">{error}</p>}
        </div>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
        <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Deleting...</> : "Delete"}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
