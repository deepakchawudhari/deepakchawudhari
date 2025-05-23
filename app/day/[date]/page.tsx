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
import { CircularProgressIndicator } from "@/components/circular-progress"
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

export default function DayDetail({ params }: { params: { date: string } }) {
  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [dailyGoal, setDailyGoal] = useState(1500)
  const [formattedDate, setFormattedDate] = useState("")
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

      // Load entries for the selected date
      const { data: dayEntries } = await supabase
        .from("food_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", params.date)
        .order("time", { ascending: true })

      if (dayEntries) {
        const formattedEntries = dayEntries.map((entry) => ({
          id: entry.id,
          name: entry.name,
          calories: entry.calories,
          time: entry.time,
          date: entry.date,
        }))
        setEntries(formattedEntries)
      }

      // Format date for display
      try {
        const dateObj = new Date(params.date)
        const today = new Date().toISOString().split("T")[0]
        const isToday = params.date === today

        const formatted = isToday
          ? "Today"
          : dateObj.toLocaleDateString(undefined, {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })
        setFormattedDate(formatted)
      } catch (e) {
        setFormattedDate(params.date)
      }
    } catch (error) {
      console.error("Error loading day data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [params.date, user])

  const handleDeleteEntry = async (id: string) => {
    if (!user) return

    try {
      const { error } = await supabase.from("food_entries").delete().eq("id", id).eq("user_id", user.id)

      if (error) throw error

      setEntries(entries.filter((entry) => entry.id !== id))
    } catch (error) {
      console.error("Error deleting entry:", error)
    }
  }

  const handleDeleteAllEntries = async () => {
    if (!user) return

    try {
      const { error } = await supabase.from("food_entries").delete().eq("user_id", user.id).eq("date", params.date)

      if (error) throw error

      setEntries([])
    } catch (error) {
      console.error("Error deleting all entries:", error)
    }
  }

  const totalCalories = entries.reduce((sum, entry) => sum + entry.calories, 0)
  const remainingCalories = dailyGoal - totalCalories
  const isNegativeCalories = remainingCalories < 0

  return (
    <ProtectedRoute>
      <div className="max-w-md mx-auto bg-gray-50 min-h-screen pb-20">
        <div className="bg-white p-4 shadow-sm mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Link href="/history">
                <Button variant="ghost" size="sm" className="mr-2">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <h1 className="text-xl font-bold">{formattedDate}</h1>
            </div>
            <div className="flex items-center gap-2">
              {entries.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete All Entries</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete all food entries for {formattedDate}? This action cannot be
                        undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteAllEntries} className="bg-red-500 hover:bg-red-600">
                        Delete All
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
            <div className="flex justify-center mb-6">
              <div className="relative flex flex-col items-center">
                <CircularProgressIndicator
                  value={remainingCalories}
                  maxValue={dailyGoal}
                  size={180}
                  strokeWidth={12}
                  color={isNegativeCalories ? "#ef4444" : "#3b82f6"}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className={`flex items-center ${isNegativeCalories ? "text-red-500" : ""}`}>
                    {isNegativeCalories && <AlertTriangle className="h-5 w-5 mr-1" />}
                    <span className="text-3xl font-bold">{remainingCalories}</span>
                  </div>
                  <span className="text-xs text-gray-500">Remaining</span>
                </div>
              </div>
            </div>

            <Card className="mb-4">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center">
                    <div className="w-5 h-5 bg-gray-200 flex items-center justify-center rounded-full mr-2">
                      <span className="text-xs">🏁</span>
                    </div>
                    <span className="text-sm">Base Goal</span>
                  </div>
                  <span className="font-medium">{dailyGoal}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-5 h-5 bg-gray-200 flex items-center justify-center rounded-full mr-2">
                      <span className="text-xs">🍽️</span>
                    </div>
                    <span className="text-sm">Food</span>
                  </div>
                  <span className={`font-medium ${isNegativeCalories ? "text-red-500" : ""}`}>{totalCalories}</span>
                </div>
                {isNegativeCalories && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md flex items-center text-red-600 text-sm">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    <span>You've exceeded your daily calorie goal by {Math.abs(remainingCalories)} calories</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="font-medium mb-3">Food Entries</h3>
                {entries.length > 0 ? (
                  <div className="space-y-3">
                    {entries.map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                        <div>
                          <div className="font-medium">{entry.name}</div>
                          <div className="text-xs text-gray-500">{entry.time}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{entry.calories} cal</div>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700 h-8 w-8 p-0">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Entry</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{entry.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteEntry(entry.id)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex h-[100px] items-center justify-center text-gray-500">
                    No entries for this day
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
