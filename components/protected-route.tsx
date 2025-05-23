"use client"

import type React from "react"

import { useAuth } from "./auth-provider"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      // Check if user had remember me enabled
      const rememberMe = localStorage.getItem("rememberMe")
      if (!rememberMe) {
        router.push("/auth/login")
      } else {
        // Give a bit more time for session refresh if remember me was enabled
        const timeout = setTimeout(() => {
          if (!user) {
            localStorage.removeItem("rememberMe")
            router.push("/auth/login")
          }
        }, 2000)

        return () => clearTimeout(timeout)
      }
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">
            {localStorage.getItem("rememberMe") ? "Restoring your session..." : "Loading..."}
          </p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}
