"use client"

import { useEffect, useCallback } from "react"

interface ShortcutActions {
  onReply?: () => void
  onInternalNote?: () => void
  onAssignToMe?: () => void
  onEscalate?: () => void
  onClose?: () => void
  onNextTicket?: () => void
  onPrevTicket?: () => void
  onCopyNumber?: () => void
  macros?: Array<{ execute: () => void }>
}

export interface ShortcutDef {
  keys: string
  description: string
}

export const TICKET_SHORTCUTS: ShortcutDef[] = [
  { keys: "Alt+R", description: "Reply" },
  { keys: "Alt+N", description: "Internal Note" },
  { keys: "Alt+A", description: "Assign to Me" },
  { keys: "Alt+E", description: "Escalate" },
  { keys: "Alt+X", description: "Close Ticket" },
  { keys: "Alt+[", description: "Previous Ticket" },
  { keys: "Alt+]", description: "Next Ticket" },
  { keys: "Alt+C", description: "Copy Ticket #" },
  { keys: "Alt+1-9", description: "Apply Macro" },
  { keys: "?", description: "Toggle Shortcuts" },
]

export function useTicketShortcuts(actions: ShortcutActions) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't capture when typing in inputs
    const target = e.target as HTMLElement
    if (target.tagName === "TEXTAREA" || target.tagName === "INPUT" || target.isContentEditable) {
      if (e.key === "Escape") {
        target.blur()
        e.preventDefault()
      }
      return
    }

    if (!e.altKey) return

    switch (e.key) {
      case "r":
        e.preventDefault()
        actions.onReply?.()
        break
      case "n":
        e.preventDefault()
        actions.onInternalNote?.()
        break
      case "a":
        e.preventDefault()
        actions.onAssignToMe?.()
        break
      case "e":
        e.preventDefault()
        actions.onEscalate?.()
        break
      case "x":
        e.preventDefault()
        actions.onClose?.()
        break
      case "[":
        e.preventDefault()
        actions.onPrevTicket?.()
        break
      case "]":
        e.preventDefault()
        actions.onNextTicket?.()
        break
      case "c":
        e.preventDefault()
        actions.onCopyNumber?.()
        break
      default:
        // Alt+1 through Alt+9 for macros
        if (e.key >= "1" && e.key <= "9") {
          const idx = parseInt(e.key) - 1
          if (actions.macros?.[idx]) {
            e.preventDefault()
            actions.macros[idx].execute()
          }
        }
    }
  }, [actions])

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleKeyDown])
}
