"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { createClientComponentClient } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialLoad, setInitialLoad] = useState(true)
  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession()

        setUser(session?.user ?? null)

        // If no session but remember me is set, try to refresh
        if (!session && localStorage.getItem("rememberMe") === "true") {
          const { data: refreshData } = await supabase.auth.refreshSession()
          if (refreshData.session) {
            setUser(refreshData.session.user)
          }
        }
      } catch (error) {
        console.error("Error getting session:", error)
      } finally {
        setLoading(false)
        setInitialLoad(false)
      }
    }

    getInitialSession()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null)

      if (!initialLoad) {
        setLoading(false)
      }

      // Handle sign out
      if (event === "SIGNED_OUT") {
        localStorage.removeItem("rememberMe")
        router.push("/auth/login")
      }

      // Handle sign in
      if (event === "SIGNED_IN" && session) {
        // Redirect to main app if on auth pages
        if (window.location.pathname.startsWith("/auth/")) {
          router.push("/")
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth, router, initialLoad])

  const signOut = async () => {
    localStorage.removeItem("rememberMe")
    await supabase.auth.signOut()
  }

  return <AuthContext.Provider value={{ user, loading, signOut }}>{children}</AuthContext.Provider>
}
