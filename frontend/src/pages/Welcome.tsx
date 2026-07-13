import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import styles from "./Welcome.module.css"

export function Welcome() {
  const { login, register, isAuthenticated, isLoading } = useAuth()
  const [phrase, setPhrase] = useState("")
  const [isSettingPhrase, setIsSettingPhrase] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/dashboard")
    }
  }, [isLoading, isAuthenticated, navigate])

  if (isLoading) return <div className={styles.center}><p>Cargando...</p></div>
  if (isAuthenticated) return null

  const handleStart = async () => {
    setBusy(true)
    setError("")
    try {
      await register(isSettingPhrase ? phrase : undefined)
      navigate("/dashboard")
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al crear identidad")
    }
    setBusy(false)
  }

  const handleContinue = async () => {
    const stored = localStorage.getItem("user_uid")
    if (stored) {
      setBusy(true)
      setError("")
      try {
        await login(stored)
        navigate("/dashboard")
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Error al iniciar sesión")
      }
      setBusy(false)
    }
  }

  const stored_uid = localStorage.getItem("user_uid")

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="22" stroke="var(--primary)" strokeWidth="3" />
            <path d="M24 12v12l8 8" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className={styles.title}>Timelapse</h1>
        <p className={styles.subtitle}>
          Tu diario de tiempo. Inspirado en el método de Lyubishchev.
        </p>

        {error && <p className={styles.error}>{error}</p>}

        {stored_uid ? (
          <button className={styles.btn} onClick={handleContinue} disabled={busy}>
            {busy ? "Conectando..." : "Continuar con mi identidad"}
          </button>
        ) : (
          <>
            <button className={styles.btn} onClick={handleStart} disabled={busy}>
              {busy ? "Creando..." : "Comenzar ahora"}
            </button>

            <div className={styles.toggle}>
              <label className={styles.switch}>
                <input
                  type="checkbox"
                  checked={isSettingPhrase}
                  onChange={() => setPhrase("")}
                  onClick={() => setIsSettingPhrase(!isSettingPhrase)}
                />
                <span>Configurar frase de recuperación</span>
              </label>
            </div>

            {isSettingPhrase && (
              <div className={styles.phraseBox}>
                <label htmlFor="phrase" className={styles.label}>Frase de recuperación</label>
                <input
                  id="phrase"
                  className={styles.input}
                  type="text"
                  placeholder="ej: mi color favorito es el azul"
                  value={phrase}
                  onChange={(e) => setPhrase(e.target.value)}
                  minLength={4}
                />
                <p className={styles.hint}>
                  Esta frase te permitirá recuperar tus datos en otro dispositivo.
                  Guárdala en un lugar seguro.
                </p>
              </div>
            )}
          </>
        )}

        <a href="/recover" className={styles.link}>¿Ya tienes una identidad? Recuperar datos</a>
      </div>
    </div>
  )
}
