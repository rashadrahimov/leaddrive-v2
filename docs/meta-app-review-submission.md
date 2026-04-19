# Meta App Review submission — LeadDrive CRM

App ID: **1276226757359622**
Reviewer-facing name: **LeadDrive CRM**
Business Verification: pending

---

## Permissions to request

| Permission | Used for | Justification |
|---|---|---|
| `pages_show_list` | Auto-granted | List Pages a connecting tenant admins so they can pick which to monitor |
| `pages_read_engagement` | Auto-granted | Read post + comment metadata on the tenant's own Pages for the unified inbox |
| `pages_read_user_content` | **Review needed** | Pull user comments and tagged posts so a CRM operator can reply, escalate to a ticket, or convert into a lead |
| `business_management` | Auto-granted | Resolve which Business Portfolio a Page belongs to during OAuth |
| `instagram_basic` | Auto-granted | Identify the Instagram Business account linked to each connected Page |
| `instagram_manage_comments` | **Review needed** | Read comments on tenant's Instagram media + replies so the same inbox covers IG, and let operators reply directly |

(Optional, request later: `pages_messaging`, `instagram_business_manage_messages` for the inbox-DM extension.)

---

## Use case description (paste into App Review form)

LeadDrive CRM is a SaaS CRM for B2B service companies. Our customers (tenants)
connect their own Facebook Pages and linked Instagram Business accounts so they
can manage social interactions in one inbox alongside email, web chat, and
support tickets.

After a tenant signs in with Facebook through our app, they pick which Pages
they admin. We then:

1. Periodically poll comments on each connected Page's recent posts and pull
   posts/media that tag the Page or the linked Instagram account.
2. Show every comment + tagged post in the tenant's Social Monitoring inbox.
3. Run AI sentiment classification (positive / neutral / negative) so the
   operator can prioritize negative reactions.
4. Let the operator (a) reply to a comment from the inbox, (b) one-click
   convert it into a CRM Lead, Ticket, or Task, or (c) ignore it.
5. When negative comments spike, send a push notification to admins.

We do **not** scrape pages the tenant doesn't admin, do **not** post on the
tenant's behalf without explicit operator action, and do **not** use the data
for advertising lookalikes.

---

## How permissions are exercised (for the screencast)

Recording must be 60-120 seconds, no audio required. Show:

1. **Tenant onboarding** (~10s)
   - `https://app.leaddrivecrm.org/social-monitoring`
   - Empty checklist visible. Click *Connect Facebook Page*.
2. **OAuth flow** (~15s)
   - Facebook prompt appears. Tester approves the listed permissions.
   - Browser returns to `/social-monitoring?connected=facebook&pages=N&ig=M`.
3. **Polling fetches comments** (~15s)
   - Click *Refresh all*. Inbox populates with comments and tagged posts.
4. **Reply** (~15s) — exercises `pages_read_user_content` /
   `instagram_manage_comments`
   - Open a comment, click *Reply*, type a short reply, hit *Send reply*.
   - Mention status flips to *replied*.
5. **Convert to Lead** (~10s)
   - Click *→ Lead*. Confirmation. Click the *Lead ↗* link to show the new
     Lead in `/leads/<id>`.
6. **Sentiment + spike** (~10s) — optional bonus
   - Show the Analytics panel with the negative-mention chart.

Tester account:
- Use the developer's own Facebook (already added in App Roles → Testers)
- Or any Facebook user added under App Roles → Testers before submission

---

## Required fields elsewhere in App Settings

- **Privacy Policy URL** → `https://leaddrivecrm.org/legal/privacy`
- **Terms of Service URL** → `https://leaddrivecrm.org/legal/terms`
- **Data Deletion Instructions URL** → `https://leaddrivecrm.org/legal/data-deletion`
- **App Icon** → 1024×1024 LeadDrive logo PNG
- **App Category** → Business and Pages
- **Business Use** → Yes (managing tenant social accounts as a B2B SaaS)

---

## Pre-submission checklist

- [ ] Business Portfolio verified (legal docs uploaded in Meta Business Suite)
- [ ] Domain `leaddrivecrm.org` verified in Business Settings → Brand Safety
- [ ] Privacy + Terms + Data Deletion pages live and reachable
- [ ] App Icon uploaded
- [ ] Tester(s) added under App Roles → Testers
- [ ] Screencast recorded for each requested permission and uploaded
- [ ] Use case text pasted into each permission's request form

---

## Reviewer notes — anti-rejection tips

- Keep the screencast under 2 minutes; reviewers skip long ones.
- Show one explicit operator action per permission (reply = read+manage_comments).
- Don't show the developer dashboard — only `app.leaddrivecrm.org` end-user UI.
- If asked about user data flow: data stays per-tenant (`organizationId` filter
  on every query); tokens are AES-256-GCM encrypted at rest.
- Spelling: keep "Facebook Page" capitalized; reviewers reject sloppy copy.
