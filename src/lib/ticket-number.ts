import type { Prisma } from "@prisma/client"
import { prisma } from "./prisma"

// Returns the next sequential ticketNumber in TK-0000 format, scoped per org.
// Reads the current max and bumps — not strictly race-safe under heavy concurrent
// writes (relies on the @@unique([organizationId, ticketNumber]) constraint to
// surface collisions). Pass a TransactionClient to run inside an existing tx.
export async function nextTicketNumber(
  orgId: string,
  tx?: Prisma.TransactionClient,
): Promise<string> {
  const client = tx ?? prisma
  const rows = await client.ticket.findMany({
    where: { organizationId: orgId },
    select: { ticketNumber: true },
  })
  const max = rows.reduce((m: number, t: { ticketNumber: string }) => {
    const n = parseInt(t.ticketNumber.replace(/[^0-9]/g, ""), 10) || 0
    return n > m ? n : m
  }, 0)
  return `TK-${String(max + 1).padStart(4, "0")}`
}

export function formatTicketNumber(n: number): string {
  return `TK-${String(n).padStart(4, "0")}`
}
