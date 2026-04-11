"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from "@/components/ui/dialog"
import { Loader2, AlertTriangle } from "lucide-react"
import { useTranslations } from "next-intl"

interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
  title?: string
  description?: string
  itemName?: string
  confirmLabel?: string
  confirmVariant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  loadingLabel?: string
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  itemName,
  confirmLabel,
  confirmVariant = "destructive",
  loadingLabel,
}: DeleteConfirmDialogProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const t = useTranslations("common")

  async function handleConfirm() {
    setLoading(true)
    setError("")
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (err: any) {
      setError(err.message || t("errorDeleteFailed"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          {title || t("deleteConfirmTitle")}
        </DialogTitle>
      </DialogHeader>
      <DialogContent>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {description || (
              itemName
                ? <>{t("deleteConfirmDesc", { name: itemName })}</>
                : <>{t("deleteConfirmDescGeneric")}</>
            )}
          </p>
          {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">{error}</p>}
        </div>
      </DialogContent>
      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>{t("cancel")}</Button>
        <Button variant={confirmVariant} onClick={handleConfirm} disabled={loading}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />{loadingLabel || t("deleting")}</> : (confirmLabel || t("delete"))}
        </Button>
      </DialogFooter>
    </Dialog>
  )
}
