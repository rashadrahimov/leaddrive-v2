import { google } from "googleapis"
import { prisma } from "@/lib/prisma"

function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  )
}

export async function getGoogleCalendarClient(userId: string) {
  // Get tokens from NextAuth Account model
  const account = await prisma.account.findFirst({
    where: { userId, provider: "google" },
  })

  if (!account?.access_token) {
    throw new Error("Google account not connected or missing access token")
  }

  const oauth2Client = createOAuth2Client()
  oauth2Client.setCredentials({
    access_token: account.access_token,
    refresh_token: account.refresh_token,
  })

  // Handle token refresh
  oauth2Client.on("tokens", async (tokens) => {
    if (tokens.access_token) {
      await prisma.account.updateMany({
        where: { userId, provider: "google" },
        data: {
          access_token: tokens.access_token,
          ...(tokens.refresh_token ? { refresh_token: tokens.refresh_token } : {}),
          ...(tokens.expiry_date ? { expires_at: Math.floor(tokens.expiry_date / 1000) } : {}),
        },
      })
    }
  })

  return google.calendar({ version: "v3", auth: oauth2Client })
}

export async function createCalendarEvent(userId: string, event: {
  summary: string
  description?: string
  startTime: string
  endTime?: string
  attendees?: string[]
}) {
  const calendar = await getGoogleCalendarClient(userId)

  const endTime = event.endTime || new Date(new Date(event.startTime).getTime() + 3600000).toISOString()

  const result = await calendar.events.insert({
    calendarId: "primary",
    requestBody: {
      summary: event.summary,
      description: event.description,
      start: { dateTime: event.startTime },
      end: { dateTime: endTime },
      attendees: event.attendees?.map(email => ({ email })),
    },
  })

  return result.data
}

export async function listCalendarEvents(userId: string, timeMin: string, timeMax: string) {
  const calendar = await getGoogleCalendarClient(userId)

  const result = await calendar.events.list({
    calendarId: "primary",
    timeMin,
    timeMax,
    singleEvents: true,
    orderBy: "startTime",
    maxResults: 50,
  })

  return result.data.items ?? []
}
