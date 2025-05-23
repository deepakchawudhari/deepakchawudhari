"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Trash2, AlertTriangle, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import Link from "next/link"
import { LineChart } from "@/components/line-chart"
import { ProtectedRoute } from "@/components/protected-route"
import { useAuth } from "@/components/auth-provider"
import { createClientComponentClient } from "@/lib/supabase"

interface FoodEntry {
  id: string
  name: string
  calories: number
  time: string
  date: string
}

interface DailyData {
  date: string
  totalCalories: number
  entries: FoodEntry[]
  formattedDate: string
}

export default function CalorieHistory() {
  const [dailyData, setDailyData] = useState<DailyData[]>([])
  const [dailyGoal, setDailyGoal] = useState(1500)
  const [chartData, setChartData] = useState<{ date: string; value: number }[]>([])
  const [loading, setLoading] = useState(true)

  const { user, signOut } = useAuth()
  const supabase = createClientComponentClient()

  const loadData = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Load user settings
      const { data: settings } = await supabase
        .from("user_settings")
        .select("daily_calorie_goal")
        .eq("user_id", user.id)
        .single()

      if (settings) {
        setDailyGoal(settings.daily_calorie_goal)
      }

      // Load all food entries for the user
      const { data: allEntries } = await supabase
        .from("food_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .order("time", { ascending: true })

      if (allEntries) {
        // Group entries by date
        const entriesByDate: Record<string, FoodEntry[]> = {}

        allEntries.forEach((entry) => {
          if (!entriesByDate[entry.date]) {
            entriesByDate[entry.date] = []
          }
          entriesByDate[entry.date].push({
            id: entry.id,
            name: entry.name,
            calories: entry.calories,
            time: entry.time,
            date: entry.date,
          })
        })

        // Create daily data objects
        const today = new Date().toISOString().split("T")[0]
        const dailyDataArray: DailyData[] = Object.keys(entriesByDate).map((date) => {
          const entries = entriesByDate[date]
          const totalCalories = entries.reduce((sum, entry) => sum + entry.calories, 0)

          // Format date for display
          const dateObj = new Date(date)
          const isToday = date === today
          const formattedDate = isToday
            ? "Today"
            : dateObj.toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
              })

          return {
            date,
            totalCalories,
            entries,
            formattedDate,
          }
        })

        // Sort by date (newest first)
        dailyDataArray.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        setDailyData(dailyDataArray)

        // Generate chart data for last 7 days
        const last7Days: { date: string; value: number }[] = []
        for (let i = 6; i >= 0; i--) {
          const date = new Date()
          date.setDate(date.getDate() - i)
          const dateString = date.toISOString().split("T")[0]

          const formattedDate =
            i === 0
              ? "Today"
              : date.toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })

          const dayData = dailyDataArray.find((d) => d.date === dateString)
          last7Days.push({
            date: formattedDate,
            value: dayData ? dayData.totalCalories : 0,
          })
        }

        setChartData(last7Days)
      }
    } catch (error) {
      console.error("Error loading history data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const handleDeleteDay = async (dateToDelete: string) => {
    if (!user) return

    try {
      const { error } = await supabase.from("food_entries").delete().eq("user_id", user.id).eq("date", dateToDelete)

      if (error) throw error

      loadData() // Reload data after deletion
    } catch (error) {
      console.error("Error deleting day:", error)
    }
  }

  const handleDeleteAllHistory = async () => {
    if (!user) return

    try {
      const { error } = await supabase.from("food_entries").delete().eq("user_id", user.id)

      if (error) throw error

      loadData() // Reload data after deletion
    } catch (error) {
      console.error("Error deleting all history:", error)
    }
  }

  return (
    <ProtectedRoute>
      <div className="max-w-md mx-auto bg-gray-50 min-h-screen pb-20">
        <div className="bg-white p-4 shadow-sm mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/">
                <Button variant="ghost" size="sm" className="mr-2">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <h1 className="text-xl font-bold">Calorie History</h1>
            </div>
            <div className="flex items-center gap-2">
              {dailyData.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete All History</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete all your calorie history? This action cannot be undone and will
                        remove all your food entries.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAllHistory} className="bg-red-500 hover:bg-red-600">
                        Delete All History
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
              <Button variant="ghost" size="sm" onClick={signOut} className="text-red-500">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="p-4">
            <Card className="mb-6">
              <CardContent className="p-4">
                <h2 className="font-medium mb-3">Last 7 Days</h2>
                <div className="h-[200px]">
                  {chartData.length > 0 ? (
                    <LineChart
                      data={chartData}
                      xKey="date"
                      yKey="value"
                      color="#3b82f6"
                      fillColor="rgba(59, 130, 246, 0.1)"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-gray-500">Loading chart...</div>
                  )}
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  Today: {chartData.find((d) => d.date === "Today")?.value || 0} calories
                </div>
              </CardContent>
            </Card>

            {dailyData.length > 0 ? (
              <div className="space-y-4">
                {dailyData.map((day) => {
                  const isOverLimit = day.totalCalories > dailyGoal
                  const progressPercentage = Math.min(Math.round((day.totalCalories / dailyGoal) * 100), 100)
                  const isToday = day.formattedDate === "Today"

                  return (
                    <Card
                      key={day.date}
                      className={`hover:shadow-md transition-shadow ${isToday ? "ring-2 ring-blue-200" : ""}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center mb-2">
                          <Link href={`/day/${day.date}`} className="flex-1">
                            <div>
                              <h3 className={`font-medium ${isToday ? "text-blue-600" : ""}`}>
                                {day.formattedDate}
                                {isToday && (
                                  <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">
                                    Current
                                  </span>
                                )}
                              </h3>
                              <p className="text-sm text-gray-500">
                                {day.entries.length} {day.entries.length === 1 ? "entry" : "entries"}
                              </p>
                            </div>
                          </Link>
                          <div className="flex items-center gap-2">
                            <div className="text-right">
                              <div
                                className={`text-xl font-bold ${isOverLimit ? "text-red-500 flex items-center" : ""}`}
                              >
                                {isOverLimit && <AlertTriangle className="h-4 w-4 mr-1" />}
                                {day.totalCalories}
                              </div>
                              <div className="text-xs text-gray-500">calories</div>
                            </div>
                            {day.entries.length > 0 && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Day</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Are you sure you want to delete all entries for {day.formattedDate}? This action
                                      cannot be undone.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteDay(day.date)}
                                      className="bg-red-500 hover:bg-red-600"
                                    >
                                      Delete Day
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${isOverLimit ? "bg-red-500" : isToday ? "bg-blue-500" : "bg-gray-400"}`}
                            style={{ width: `${progressPercentage}%` }}
                          ></div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px] text-center">
                <div className="text-xl font-medium mb-2">No history found</div>
                <p className="text-gray-500 mb-6">Start tracking your calories to see your history here.</p>
                <Link href="/">
                  <Button className="bg-blue-500 hover:bg-blue-600">Go to Calorie Counter</Button>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
