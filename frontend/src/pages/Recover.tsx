import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import styles from "./Welcome.module.css"

export function Recover() {
  const { recover } = useAuth()
  const [userUid, setUserUid] = useState("")
  const [phrase, setPhrase] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const navigate = useNavigate()

  const handleRecover = async () => {
    if (!userUid.trim() || !phrase.trim()) {
      setError("Completa ambos campos")
      return
    }
    setBusy(true)
    setError("")
    try {
      await recover(userUid.trim(), phrase)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Frase o ID incorrecto")
    }
    setBusy(false)
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="22" stroke="var(--primary)" strokeWidth="3" />
            <path d="M24 12v12l8 8" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
          </svg>
        </div>
        <h1 className={styles.title}>Recuperar identidad</h1>
        <p className={styles.subtitle}>
          Ingresa tu ID de usuario y tu frase de recuperación para restaurar tus datos.
        </p>

        {error && <p className={styles.error}>{error}</p>}

        <div style={{ textAlign: "left", marginBottom: "1.25rem" }}>
          <label className={styles.label}>ID de usuario</label>
          <input
            className={styles.input}
            type="text"
            placeholder="8f3a...b1c2"
            value={userUid}
            onChange={(e) => setUserUid(e.target.value)}
          />
        </div>

        <div style={{ textAlign: "left", marginBottom: "1.5rem" }}>
          <label className={styles.label}>Frase de recuperación</label>
          <input
            className={styles.input}
            type="text"
            placeholder="mi fruta favorita"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
          />
        </div>

        <button className={styles.btn} onClick={handleRecover} disabled={busy}>
          {busy ? "Recuperando..." : "Recuperar"}
        </button>

        <a href="/" className={styles.link} style={{ marginTop: "1.25rem" }}>
          Volver al inicio
        </a>
      </div>
    </div>
  )
}
