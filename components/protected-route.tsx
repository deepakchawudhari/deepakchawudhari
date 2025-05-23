"use client"

import type React from "react"

import { useAuth } from "./auth-provider"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, isRememberMeEnabled } = useAuth()
  const router = useRouter()
  const [isClient, setIsClient] = useState(false)

  // Set isClient to true when component mounts (client-side only)
  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (!loading && !user && isClient) {
      // Check if user had remember me enabled
      const hasRememberMe = isRememberMeEnabled()
      if (!hasRememberMe) {
        router.push("/auth/login")
      } else {
        // Give a bit more time for session refresh if remember me was enabled
        const timeout = setTimeout(() => {
          if (!user) {
            router.push("/auth/login")
          }
        }, 2000)

        return () => clearTimeout(timeout)
      }
    }
  }, [user, loading, router, isClient, isRememberMeEnabled])

  if (loading || !isClient) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <>{children}</>
}
