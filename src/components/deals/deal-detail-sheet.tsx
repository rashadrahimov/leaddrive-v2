"use client"

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { DollarSign, Building, User, Calendar, ArrowRight, MessageSquare, Pencil } from "lucide-react"

interface DealDetail {
  id: string
  name: string
  company: string
  value: number
  stage: string
  stageColor: string
  probability: number
  assignee: string
  assigneeAvatar: string
  createdAt: string
  expectedClose: string
  description: string
  contact: string
  contactEmail: string
  stageHistory: Array<{ stage: string; date: string; by: string }>
  activities: Array<{ type: string; description: string; date: string; by: string }>
  team: Array<{ name: string; role: string; avatar: string }>
}

interface DealDetailSheetProps {
  deal: DealDetail | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

const STAGE_COLORS: Record<string, string> = {
  "Lead": "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  "Qualified": "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  "Proposal": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  "Negotiation": "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  "Won": "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  "Lost": "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
}

export function DealDetailSheet({ deal, open, onOpenChange }: DealDetailSheetProps) {
  if (!deal) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <div className="flex items-center justify-between pr-8">
            <Badge className={STAGE_COLORS[deal.stage] || ""}>{deal.stage}</Badge>
            <span className="text-sm text-muted-foreground">{deal.probability}% probability</span>
          </div>
          <SheetTitle className="text-xl">{deal.name}</SheetTitle>
          <SheetDescription className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1"><Building className="h-3.5 w-3.5" /> {deal.company}</span>
            <span className="flex items-center gap-1"><DollarSign className="h-3.5 w-3.5" /> {deal.value.toLocaleString()} ₼</span>
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="pt-3 pb-3">
                <p className="text-xs text-muted-foreground">Expected Close</p>
                <p className="text-sm font-medium flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {deal.expectedClose}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-3 pb-3">
                <p className="text-xs text-muted-foreground">Contact</p>
                <p className="text-sm font-medium flex items-center gap-1"><User className="h-3.5 w-3.5" /> {deal.contact}</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview">
            <TabsList className="w-full">
              <TabsTrigger value="overview" className="flex-1">Overview</TabsTrigger>
              <TabsTrigger value="history" className="flex-1">History</TabsTrigger>
              <TabsTrigger value="activities" className="flex-1">Activities</TabsTrigger>
              <TabsTrigger value="team" className="flex-1">Team</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-3 mt-3">
              <div>
                <h4 className="text-sm font-medium mb-1">Description</h4>
                <p className="text-sm text-muted-foreground">{deal.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="p-2 rounded bg-muted/50">
                  <span className="text-muted-foreground">Assignee</span>
                  <p className="font-medium">{deal.assignee}</p>
                </div>
                <div className="p-2 rounded bg-muted/50">
                  <span className="text-muted-foreground">Created</span>
                  <p className="font-medium">{deal.createdAt}</p>
                </div>
                <div className="p-2 rounded bg-muted/50">
                  <span className="text-muted-foreground">Contact Email</span>
                  <p className="font-medium">{deal.contactEmail}</p>
                </div>
                <div className="p-2 rounded bg-muted/50">
                  <span className="text-muted-foreground">Deal Value</span>
                  <p className="font-medium">{deal.value.toLocaleString()} ₼</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="w-full">
                <Pencil className="h-4 w-4 mr-1" /> Edit Deal
              </Button>
            </TabsContent>

            <TabsContent value="history" className="mt-3">
              <div className="space-y-3">
                {deal.stageHistory.map((entry, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="mt-1 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">{entry.stage}</Badge>
                        {i < deal.stageHistory.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{entry.date} by {entry.by}</p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="activities" className="mt-3">
              <div className="space-y-3">
                {deal.activities.map((activity, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm">
                    <MessageSquare className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                    <div>
                      <p className="font-medium">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">{activity.date} — {activity.by}</p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="team" className="mt-3">
              <div className="space-y-2">
                {deal.team.map((member, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded bg-muted/50">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      {member.avatar}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{member.name}</p>
                      <p className="text-xs text-muted-foreground">{member.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  )
}
