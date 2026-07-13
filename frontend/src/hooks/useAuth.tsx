import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { api, type UserMe } from "../services/api"

interface AuthState {
  user: UserMe | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (userUid: string) => Promise<void>
  register: (phrase?: string) => Promise<string>
  recover: (userUid: string, phrase: string) => Promise<void>
  setPhrase: (phrase: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserMe | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()

  const restore = useCallback(async () => {
    const token = localStorage.getItem("token")
    const uid = localStorage.getItem("user_uid")
    if (!token || !uid) {
      setIsLoading(false)
      return
    }

    try {
      const me = await api.getMe()
      setUser(me)
    } catch {
      localStorage.removeItem("token")
      localStorage.removeItem("user_uid")
    }
    setIsLoading(false)
  }, [])

  useEffect(() => {
    restore()
  }, [restore])

  const login = useCallback(async (userUid: string) => {
    const res = await api.login(userUid)
    localStorage.setItem("token", res.token)
    localStorage.setItem("user_uid", userUid)
    const me = await api.getMe()
    setUser(me)
  }, [])

  const register = useCallback(async (phrase?: string) => {
    const res = await api.register(phrase)
    localStorage.setItem("token", res.token)
    localStorage.setItem("user_uid", res.user_uid)
    const me = { user_uid: res.user_uid, has_phrase: res.has_phrase, created_at: new Date().toISOString() }
    setUser(me)
    return res.user_uid
  }, [])

  const recover = useCallback(async (userUid: string, phrase: string) => {
    const res = await api.recover(userUid, phrase)
    localStorage.setItem("token", res.token)
    localStorage.setItem("user_uid", userUid)
    const me = await api.getMe()
    setUser(me)
    navigate("/dashboard")
  }, [navigate])

  const setPhrase = useCallback(async (phrase: string) => {
    await api.setPhrase(phrase)
    setUser((prev) => (prev ? { ...prev, has_phrase: true } : prev))
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem("token")
    localStorage.removeItem("user_uid")
    setUser(null)
    navigate("/")
  }, [navigate])

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        recover,
        setPhrase,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
