import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { api, type EventCategory, type EventResponse, type TimelineDayResponse } from "../services/api"
import { ManualEntryModal } from "../components/ManualEntryModal"
import { Timeline } from "../components/Timeline"
import styles from "./Dashboard.module.css"

const CATEGORIES: { key: EventCategory; label: string; icon: string }[] = [
  { key: "work", label: "Trabajo", icon: "💼" },
  { key: "sleep", label: "Dormir", icon: "🌙" },
  { key: "eat", label: "Comer", icon: "🍽️" },
  { key: "leisure", label: "Ocio", icon: "🎮" },
  { key: "fitness", label: "Ejercicio", icon: "🏃" },
  { key: "transport", label: "Transporte", icon: "🚌" },
  { key: "personal", label: "Personal", icon: "🧘" },
]

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  work: ["trabajo", "trabajando", "oficina", "reunión", "codigo", "programar", "diseñar", "estudiar", "estudio"],
  sleep: ["dormir", "durmiendo", "siesta", "cama", "acostar"],
  eat: ["comer", "comiendo", "cenar", "cenando", "desayunar", "desayuno", "almuerzo", "cena", "cocinar", "cocinando"],
  fitness: ["ejercicio", "gym", "correr", "running", "yoga", "entrenar", "entreno", "pesas"],
  transport: ["transporte", "bus", "metro", "caminando", "caminar", "conduciendo", "manejar", "viaje", "viajando"],
  leisure: ["ocio", "leer", "leyendo", "netflix", "juego", "jugando", "serie", "música", "pelicula", "descansar"],
}

function detectCategory(text: string): { category: EventCategory; rest: string } {
  const lower = text.toLowerCase().trim()
  const firstWord = lower.split(/\s+/)[0]

  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (firstWord === kw || lower.startsWith(kw)) {
        const rest = text.slice(kw.length).trim()
        return { category: cat as EventCategory, rest }
      }
    }
  }

  for (const cat of CATEGORIES) {
    if (firstWord === cat.label.toLowerCase()) {
      const rest = text.slice(cat.label.length).trim()
      return { category: cat.key, rest }
    }
  }

  return { category: "personal", rest: text }
}

function formatDuration(start: string, end: string | null): string {
  const s = new Date(start).getTime()
  const e = end ? new Date(end).getTime() : Date.now()
  const min = Math.round((e - s) / 60000)
  if (min < 60) return `${min}m`
  const h = Math.floor(min / 60)
  return `${h}h ${min % 60}m`
}

const ACTIVITY_HISTORY_KEY = "timelapse_recent_activities"

function getRecentActivities(): string[] {
  try {
    return JSON.parse(localStorage.getItem(ACTIVITY_HISTORY_KEY) || "[]")
  } catch {
    return []
  }
}

function saveRecentActivity(name: string) {
  const recent = getRecentActivities().filter((a) => a !== name)
  recent.unshift(name)
  localStorage.setItem(ACTIVITY_HISTORY_KEY, JSON.stringify(recent.slice(0, 20)))
}

export function Dashboard() {
  const { user, logout, setPhrase } = useAuth()
  const navigate = useNavigate()
  const [currentEvent, setCurrentEvent] = useState<EventResponse | null>(null)
  const [dayData, setDayData] = useState<TimelineDayResponse | null>(null)
  const [busyCategory, setBusyCategory] = useState<string | null>(null)
  const [showManual, setShowManual] = useState(false)
  const [showPhraseModal, setShowPhraseModal] = useState(false)
  const [newPhrase, setNewPhrase] = useState("")
  const [phraseSaved, setPhraseSaved] = useState(false)
  const [error, setError] = useState("")
  const [input, setInput] = useState("")
  const [showSuggestions, setShowSuggestions] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const recentActivities = getRecentActivities()
  const suggestions = input
    ? recentActivities.filter((a) => a.toLowerCase().includes(input.toLowerCase())).slice(0, 5)
    : recentActivities.slice(0, 5)

  const detected = input ? detectCategory(input) : null

  const today = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const refresh = useCallback(async () => {
    try {
      const [curr, day] = await Promise.all([
        api.events.current(),
        api.events.day(),
      ])
      setCurrentEvent(curr.event)
      setDayData(day)
      setError("")
    } catch {
      setError("Error al cargar datos")
    }
  }, [])

  useEffect(() => {
    refresh()
    const interval = setInterval(refresh, 15000)
    return () => clearInterval(interval)
  }, [refresh])

  const handleStart = useCallback(async (category: EventCategory, activityName?: string) => {
    setBusyCategory(category)
    setError("")
    try {
      const res = await api.events.start(category)
      if (activityName) {
        await api.activities.start(activityName)
        saveRecentActivity(activityName)
      }
      setCurrentEvent(res.event)
      const day = await api.events.day()
      setDayData(day)
      setInput("")
      setShowSuggestions(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al iniciar evento")
    }
    setBusyCategory(null)
  }, [])

  const handleInputSubmit = () => {
    const text = input.trim()
    if (!text) return
    const { category, rest } = detectCategory(text)
    handleStart(category, rest || undefined)
  }

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleInputSubmit()
    }
  }

  const handleStop = async () => {
    setBusyCategory("stop")
    setError("")
    try {
      await api.events.stop()
      setCurrentEvent(null)
      const day = await api.events.day()
      setDayData(day)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al detener evento")
    }
    setBusyCategory(null)
  }

  const handleManualSaved = () => {
    setShowManual(false)
    refresh()
  }

  const handleSavePhrase = async () => {
    if (newPhrase.length < 4) return
    await setPhrase(newPhrase)
    setPhraseSaved(true)
    setTimeout(() => {
      setShowPhraseModal(false)
      setPhraseSaved(false)
      setNewPhrase("")
    }, 1500)
  }

  const selectSuggestion = (activity: string) => {
    setInput(activity)
    setShowSuggestions(false)
    inputRef.current?.focus()
  }

  return (
    <div className={`${styles.page} ${currentEvent?.category === "sleep" ? styles.dark : ""}`}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <svg width="32" height="32" viewBox="0 0 48 48" fill="none">
            <circle cx="24" cy="24" r="22" stroke="var(--primary)" strokeWidth="3" />
            <path d="M24 12v12l8 8" stroke="var(--primary)" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <h1 className={styles.title}>Timelapse</h1>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.userBadge} title={user?.user_uid}>
            ID: {user?.user_uid.slice(0, 8)}...
          </span>
          <button className={styles.ghostBtn} onClick={() => navigate("/insights")}>
            Insights
          </button>
          {!user?.has_phrase && (
            <button className={styles.ghostBtn} onClick={() => setShowPhraseModal(true)}>
              + Frase
            </button>
          )}
          <button className={styles.ghostBtn} onClick={logout}>
            Salir
          </button>
        </div>
      </header>

      <main className={styles.main}>
        <section className={styles.greeting}>
          <h2 className={styles.greetingTitle}>
            {currentEvent?.category === "sleep" ? "Buenas noches" : "Buenos días"}
          </h2>
          <p className={styles.greetingDate}>{today}</p>
        </section>

        {error && <p className={styles.errorBanner}>{error}</p>}

        <section className={styles.currentEventSection}>
          {currentEvent ? (
            <div className={`${styles.currentEventCard} ${styles[`cat_${currentEvent.category}`]}`}>
              <div className={styles.currentEventInfo}>
                <span className={styles.currentEventIcon}>
                  {CATEGORIES.find((c) => c.key === currentEvent.category)?.icon}
                </span>
                <div>
                  <div className={styles.currentEventName}>
                    {CATEGORIES.find((c) => c.key === currentEvent.category)?.label}
                    {currentEvent.activities.length > 0 && (
                      <span className={styles.currentActivityName}>
                        — {currentEvent.activities[currentEvent.activities.length - 1].name}
                      </span>
                    )}
                  </div>
                  <div className={styles.currentEventDuration}>
                    {formatDuration(currentEvent.start_time, null)}
                  </div>
                </div>
              </div>
              <button
                className={styles.stopBtn}
                onClick={handleStop}
                disabled={busyCategory === "stop"}
              >
                {busyCategory === "stop" ? "..." : "Detener"}
              </button>
            </div>
          ) : (
            <div className={styles.eventSelector}>
              <div className={styles.inputSection}>
                <label className={styles.inputLabel}>¿Qué estás haciendo?</label>
                <div className={styles.inputRow}>
                  <div className={styles.inputWrapper}>
                    <input
                      ref={inputRef}
                      className={styles.textInput}
                      type="text"
                      placeholder="Trabajo en el diseño, Leyendo un libro, ..."
                      value={input}
                      onChange={(e) => {
                        setInput(e.target.value)
                        setShowSuggestions(true)
                      }}
                      onFocus={() => setShowSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                      onKeyDown={handleInputKeyDown}
                      autoFocus
                    />
                    {showSuggestions && suggestions.length > 0 && (
                      <div className={styles.suggestions}>
                        {suggestions.map((s) => (
                          <button
                            key={s}
                            className={styles.suggestion}
                            onMouseDown={() => selectSuggestion(s)}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    className={styles.startBtn}
                    onClick={handleInputSubmit}
                    disabled={!input.trim() || busyCategory !== null}
                  >
                    {busyCategory ? "..." : "Iniciar"}
                  </button>
                </div>
                {detected && input.trim() && (
                  <div className={styles.detection}>
                    <span className={styles.detectionCat}>
                      {CATEGORIES.find((c) => c.key === detected.category)?.icon}{" "}
                      {CATEGORIES.find((c) => c.key === detected.category)?.label}
                    </span>
                    {detected.rest && (
                      <span className={styles.detectionActivity}>
                        → {detected.rest}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.divider}>
                <span>o elige una categoría</span>
              </div>

              <div className={styles.categoryGrid}>
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    className={`${styles.catBtn} ${styles[`cat_${cat.key}`]}`}
                    onClick={() => handleStart(cat.key)}
                    disabled={busyCategory === cat.key}
                  >
                    <span className={styles.catIcon}>{cat.icon}</span>
                    <span className={styles.catLabel}>{cat.label}</span>
                  </button>
                ))}
              </div>
              <button className={styles.manualBtn} onClick={() => setShowManual(true)}>
                + Entrada manual (con hora)
              </button>
            </div>
          )}
        </section>

        <div className={styles.statsRow}>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{Math.round((dayData?.total_tracked_minutes || 0) / 60)}h</span>
            <span className={styles.statLabel}>Hoy</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>{dayData?.events.length || 0}</span>
            <span className={styles.statLabel}>Eventos</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statValue}>
              {currentEvent ? "En curso" : "—"}
            </span>
            <span className={styles.statLabel}>Estado</span>
          </div>
        </div>

        <Timeline events={dayData?.events || []} />
      </main>

      {showManual && (
        <ManualEntryModal onSave={handleManualSaved} onClose={() => setShowManual(false)} />
      )}

      {showPhraseModal && (
        <div className={styles.overlay} onClick={() => setShowPhraseModal(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 className={styles.modalTitle}>Configurar frase de recuperación</h3>
            <p className={styles.modalText}>
              Esta frase te permite recuperar tu identidad en otro dispositivo.
            </p>
            <input
              className={styles.modalInput}
              type="text"
              placeholder="mi frase secreta"
              value={newPhrase}
              onChange={(e) => setNewPhrase(e.target.value)}
              minLength={4}
              autoFocus
            />
            <div className={styles.modalActions}>
              <button className={styles.modalCancel} onClick={() => setShowPhraseModal(false)}>
                Cancelar
              </button>
              <button
                className={styles.modalSave}
                onClick={handleSavePhrase}
                disabled={newPhrase.length < 4}
              >
                {phraseSaved ? "Guardada ✓" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
