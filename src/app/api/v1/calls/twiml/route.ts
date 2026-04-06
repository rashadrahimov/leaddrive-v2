// TwiML endpoint — Twilio asks "what to do when call connects"
export async function POST() {
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Number>{{To}}</Number>
  </Dial>
</Response>`
  return new Response(twiml, { headers: { "Content-Type": "text/xml" } })
}

export async function GET() {
  return POST()
}
