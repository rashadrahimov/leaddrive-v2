"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle2, XCircle, ArrowRight, X, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ChecklistItem {
  field: string
  message: string
  passed: boolean
}

interface StageChecklistDialogProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  confirming: boolean
  targetStageLabel: string
  targetStageColor: string
  items: ChecklistItem[]
  loading: boolean
}

export function StageChecklistDialog({
  open,
  onClose,
  onConfirm,
  confirming,
  targetStageLabel,
  targetStageColor,
  items,
  loading,
}: StageChecklistDialogProps) {
  const allPassed = items.length === 0 || items.every(i => i.passed)

  if (!open) return null

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/40"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-full max-w-md rounded-xl border bg-card shadow-2xl overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2.5">
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-semibold">Move to stage</p>
                    <p className="text-xs text-muted-foreground">
                      Requirements for <span className="font-medium" style={{ color: targetStageColor }}>{targetStageLabel}</span>
                    </p>
                  </div>
                </div>
                <button onClick={onClose} className="h-7 w-7 rounded-lg hover:bg-muted flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Checklist */}
              <div className="p-4 space-y-2">
                {loading ? (
                  <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : items.length === 0 ? (
                  <div className="text-center py-4">
                    <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No requirements. Ready to move.</p>
                  </div>
                ) : (
                  items.map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${
                        item.passed
                          ? "bg-green-50 dark:bg-green-950/10 border-green-200/50 dark:border-green-800/30"
                          : "bg-red-50 dark:bg-red-950/10 border-red-200/50 dark:border-red-800/30"
                      }`}
                    >
                      {item.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                      )}
                      <p className={`text-sm font-medium ${item.passed ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
                        {item.message}
                      </p>
                    </motion.div>
                  ))
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t bg-muted/20 flex gap-2">
                <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
                <Button
                  onClick={onConfirm}
                  disabled={!allPassed || confirming}
                  className="flex-1 gap-1.5"
                  style={allPassed ? { backgroundColor: targetStageColor } : undefined}
                >
                  {confirming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowRight className="h-3.5 w-3.5" />}
                  {allPassed ? "Move" : "Fix issues first"}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
