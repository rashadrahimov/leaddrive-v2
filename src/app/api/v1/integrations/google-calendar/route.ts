import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { getOrgId } from "@/lib/api-auth"
import { auth } from "@/lib/auth"
import { createCalendarEvent, listCalendarEvents } from "@/lib/google-calendar"

const createEventSchema = z.object({
  summary: z.string().min(1),
  description: z.string().optional(),
  startTime: z.string(),
  endTime: z.string().optional(),
  attendees: z.array(z.string().email()).optional(),
})

export async function GET(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const days = parseInt(searchParams.get("days") || "7")

  try {
    const timeMin = new Date().toISOString()
    const timeMax = new Date(Date.now() + days * 86400000).toISOString()
    const events = await listCalendarEvents(session.user.id, timeMin, timeMax)

    return NextResponse.json({ success: true, data: events })
  } catch (error: any) {
    if (error.message?.includes("not connected")) {
      return NextResponse.json({ error: "Google Calendar not connected. Please re-authenticate with Google." }, { status: 403 })
    }
    console.error("[Google Calendar] Error:", error)
    return NextResponse.json({ error: "Failed to fetch calendar events" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const orgId = await getOrgId(req)
  if (!orgId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createEventSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 })
  }

  try {
    const event = await createCalendarEvent(session.user.id, parsed.data)
    return NextResponse.json({ success: true, data: event }, { status: 201 })
  } catch (error: any) {
    if (error.message?.includes("not connected")) {
      return NextResponse.json({ error: "Google Calendar not connected" }, { status: 403 })
    }
    console.error("[Google Calendar] Error:", error)
    return NextResponse.json({ error: "Failed to create calendar event" }, { status: 500 })
  }
}
