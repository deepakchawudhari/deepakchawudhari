"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Plus, ArrowRight, Trash2, AlertTriangle, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
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

interface UserSettings {
  daily_calorie_goal: number
  steps_goal: number
}

export default function CalorieCounter() {
  const [foodName, setFoodName] = useState("")
  const [calories, setCalories] = useState("")
  const [entries, setEntries] = useState<FoodEntry[]>([])
  const [dailyGoal, setDailyGoal] = useState(1500)
  const [currentDate, setCurrentDate] = useState("")
  const [steps, setSteps] = useState(0)
  const [stepsGoal, setStepsGoal] = useState(10000)
  const [loading, setLoading] = useState(true)

  const { user, signOut } = useAuth()
  const supabase = createClientComponentClient()

  // Initialize date and load user data
  useEffect(() => {
    const today = new Date().toISOString().split("T")[0]
    setCurrentDate(today)

    if (user) {
      loadUserData(today)
    }
  }, [user])

  const loadUserData = async (date: string) => {
    if (!user) return

    setLoading(true)
    try {
      // Load user settings
      const { data: settings } = await supabase.from("user_settings").select("*").eq("user_id", user.id).single()

      if (settings) {
        setDailyGoal(settings.daily_calorie_goal)
        setStepsGoal(settings.steps_goal)
      } else {
        // Create default settings for new user
        await supabase.from("user_settings").insert({
          user_id: user.id,
          daily_calorie_goal: 1500,
          steps_goal: 10000,
        })
      }

      // Load today's food entries
      const { data: foodEntries } = await supabase
        .from("food_entries")
        .select("*")
        .eq("user_id", user.id)
        .eq("date", date)
        .order("time", { ascending: true })

      if (foodEntries) {
        const formattedEntries = foodEntries.map((entry) => ({
          id: entry.id,
          name: entry.name,
          calories: entry.calories,
          time: entry.time,
          date: entry.date,
        }))
        setEntries(formattedEntries)
      }

      // Mock steps data
      setSteps(3550)
    } catch (error) {
      console.error("Error loading user data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddEntry = async () => {
    if (!user || foodName.trim() === "" || isNaN(Number(calories)) || Number(calories) <= 0) {
      return
    }

    try {
      const now = new Date()
      const timeString = now.toTimeString().slice(0, 8) // HH:MM:SS format

      const { data, error } = await supabase
        .from("food_entries")
        .insert({
          user_id: user.id,
          name: foodName,
          calories: Number(calories),
          date: currentDate,
          time: timeString,
        })
        .select()
        .single()

      if (error) throw error

      const newEntry: FoodEntry = {
        id: data.id,
        name: data.name,
        calories: data.calories,
        time: timeString,
        date: data.date,
      }

      setEntries([...entries, newEntry])
      setFoodName("")
      setCalories("")
    } catch (error) {
      console.error("Error adding entry:", error)
    }
  }

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
      const { error } = await supabase.from("food_entries").delete().eq("user_id", user.id).eq("date", currentDate)

      if (error) throw error

      setEntries([])
    } catch (error) {
      console.error("Error deleting all entries:", error)
    }
  }

  const handleGoalChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseInt(e.target.value)
    if (!user || isNaN(value) || value <= 0) return

    setDailyGoal(value)

    try {
      const { error } = await supabase.from("user_settings").upsert({
        user_id: user.id,
        daily_calorie_goal: value,
        steps_goal: stepsGoal,
        updated_at: new Date().toISOString(),
      })

      if (error) throw error
    } catch (error) {
      console.error("Error updating goal:", error)
    }
  }

  const totalCalories = entries.reduce((sum, entry) => sum + entry.calories, 0)
  const remainingCalories = dailyGoal - totalCalories
  const isNegativeCalories = remainingCalories < 0
  const stepsPercentage = Math.min(Math.round((steps / stepsGoal) * 100), 100)

  // Mock data for the weight chart
  const weightData = [
    { date: "May 17", value: 165 },
    { date: "May 18", value: 164.5 },
    { date: "May 19", value: 164.8 },
    { date: "May 20", value: 164.2 },
    { date: "May 21", value: 163.7 },
    { date: "May 22", value: 163.5 },
    { date: "May 23", value: 163.2 },
  ]

  return (
    <ProtectedRoute>
      <div className="max-w-md mx-auto bg-gray-50 min-h-screen pb-20">
        <div className="bg-white p-4 shadow-sm">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-xl font-bold">Calories</h1>
            <div className="flex items-center gap-2">
              <Link href="/history">
                <Button variant="ghost" size="sm" className="text-blue-500">
                  History
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={signOut} className="text-red-500">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-500">Remaining = Goal - Food</p>
          {user && <p className="text-xs text-gray-400 mt-1">Welcome, {user.email}</p>}
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

            <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <div className="w-5 h-5 bg-gray-200 flex items-center justify-center rounded-full mr-2">
                    <span className="text-xs">🏁</span>
                  </div>
                  <span className="text-sm">Base Goal</span>
                </div>
                <Input
                  type="number"
                  value={dailyGoal}
                  onChange={handleGoalChange}
                  className="w-20 h-8 text-right"
                  min="1"
                />
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
            </div>

            <div className="flex space-x-2 mb-4">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <div className="w-2 h-2 rounded-full bg-gray-300"></div>
              <div className="w-2 h-2 rounded-full bg-gray-300"></div>
              <div className="w-2 h-2 rounded-full bg-gray-300"></div>
            </div>

            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="foodName">Food Name</Label>
                    <Input
                      id="foodName"
                      placeholder="e.g., Chicken Salad"
                      value={foodName}
                      onChange={(e) => setFoodName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="calories">Calories</Label>
                    <Input
                      id="calories"
                      type="number"
                      placeholder="e.g., 350"
                      value={calories}
                      onChange={(e) => setCalories(e.target.value)}
                      min="1"
                    />
                  </div>
                  <Button
                    className="w-full bg-blue-500 hover:bg-blue-600"
                    onClick={handleAddEntry}
                    disabled={foodName.trim() === "" || isNaN(Number(calories)) || Number(calories) <= 0}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Add Food
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-medium">Today's Food Log</h3>
                  {entries.length > 0 && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="text-red-500 hover:text-red-700">
                          <Trash2 className="h-4 w-4 mr-1" />
                          Clear All
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete All Entries</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete all food entries for today? This action cannot be undone.
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
                </div>
                <ScrollArea className="h-[200px]">
                  {entries.length > 0 ? (
                    <div className="space-y-3">
                      {entries.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between border-b pb-2">
                          <div>
                            <div className="font-medium">{entry.name}</div>
                            <div className="text-xs text-gray-500">{entry.time}</div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="font-medium">{entry.calories} cal</div>
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
                    <div className="flex h-[100px] items-center justify-center text-gray-500">No entries yet</div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">Steps</h3>
                <Button size="sm" variant="outline" className="h-8">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  <span className="text-xl font-bold text-pink-500">{steps.toLocaleString()}</span>
                </div>
                <span className="text-sm text-gray-500">Goal: {stepsGoal.toLocaleString()} steps</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full bg-pink-500 rounded-full" style={{ width: `${stepsPercentage}%` }}></div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-medium">Progress</h3>
              </div>
              <div className="mb-2">
                <h4 className="text-sm font-medium">Weight</h4>
                <p className="text-xs text-gray-500">Last 90 days</p>
              </div>
              <div className="h-[120px]">
                <LineChart
                  data={weightData}
                  xKey="date"
                  yKey="value"
                  color="#3b82f6"
                  fillColor="rgba(59, 130, 246, 0.1)"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
