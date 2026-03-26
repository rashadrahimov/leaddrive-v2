"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Badge } from "@/components/ui/badge"
import { Clock, RotateCcw, ChevronDown, ChevronUp, History } from "lucide-react"
import { formatTimePoint } from "@/lib/budgeting/time-machine-utils"
import type { TimePoint } from "@/lib/budgeting/time-machine-utils"

interface BudgetTimeMachineProps {
  timePoints: TimePoint[]
  isActive: boolean
  isLoading?: boolean
  currentIndex: number
  onActivate: () => void
  onDeactivate: () => void
  onIndexChange: (index: number) => void
}

export function BudgetTimeMachine({
  timePoints,
  isActive,
  isLoading,
  currentIndex,
  onActivate,
  onDeactivate,
  onIndexChange,
}: BudgetTimeMachineProps) {
  const [collapsed, setCollapsed] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleSliderChange = useCallback(
    (value: number[]) => {
      const idx = value[0]
      // Debounce API calls
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        onIndexChange(idx)
      }, 200)
    },
    [onIndexChange]
  )

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  if (timePoints.length === 0) {
    return null // No history yet
  }

  const currentPoint = timePoints[currentIndex]

  if (!isActive) {
    return (
      <Card className="border-dashed border-purple-300 dark:border-purple-700 bg-purple-50/50 dark:bg-purple-950/20">
        <CardContent className="py-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <History className="h-4 w-4 text-purple-500" />
              <span>
                Time Machine — {timePoints.length} checkpoint{timePoints.length !== 1 ? "s" : ""} available
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={onActivate} className="border-purple-300 text-purple-700 hover:bg-purple-100 dark:border-purple-700 dark:text-purple-300 dark:hover:bg-purple-900">
              <Clock className="h-3.5 w-3.5 mr-1.5" />
              Explore History
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-purple-400 dark:border-purple-600 bg-purple-50/70 dark:bg-purple-950/30 shadow-lg shadow-purple-100 dark:shadow-purple-900/20">
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-purple-600 dark:text-purple-400 animate-pulse" />
            <CardTitle className="text-base font-semibold text-purple-900 dark:text-purple-100">
              Time Machine
            </CardTitle>
            <Badge variant="secondary" className="bg-purple-200 text-purple-800 dark:bg-purple-800 dark:text-purple-200 text-xs">
              Viewing historical state
            </Badge>
            {isLoading && (
              <Badge variant="outline" className="text-xs animate-pulse">
                Loading...
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCollapsed(!collapsed)}
              className="h-7 w-7 p-0"
            >
              {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onDeactivate}
              className="border-purple-300 text-purple-700 hover:bg-purple-100 dark:border-purple-700 dark:text-purple-300"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
              Return to current
            </Button>
          </div>
        </div>
      </CardHeader>

      {!collapsed && (
        <CardContent className="pt-1 pb-3 px-4">
          <div className="space-y-2">
            <Slider
              min={0}
              max={timePoints.length - 1}
              step={1}
              value={[currentIndex]}
              onValueChange={handleSliderChange}
              className="[&_[role=slider]]:bg-purple-600 [&_[role=slider]]:border-purple-700 [&_[role=slider]]:shadow-purple-300 [&_.range]:bg-purple-500"
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{formatTimePoint(timePoints[0].timestamp)}</span>
              <span className="font-medium text-purple-700 dark:text-purple-300">
                {currentPoint ? (
                  <>
                    {formatTimePoint(currentPoint.timestamp)} — {currentPoint.summary}
                  </>
                ) : (
                  "Select a point"
                )}
              </span>
              <span>{formatTimePoint(timePoints[timePoints.length - 1].timestamp)}</span>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}
