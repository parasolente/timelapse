import type { EventResponse } from "../services/api"
import styles from "./Timeline.module.css"

interface Props {
  events: EventResponse[]
}

const CATEGORY_COLORS: Record<string, string> = {
  work: "#ff8c42",
  sleep: "#6c63ff",
  eat: "#fd7e14",
  leisure: "#e83e8c",
  fitness: "#28a745",
  transport: "#17a2b8",
  personal: "#ffc107",
}

const CATEGORY_LABELS: Record<string, string> = {
  work: "Trabajo",
  sleep: "Dormir",
  eat: "Comer",
  leisure: "Ocio",
  fitness: "Ejercicio",
  transport: "Transporte",
  personal: "Personal",
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return `${h}h ${m}m`
}

export function Timeline({ events }: Props) {
  if (events.length === 0) {
    return (
      <section className={styles.section}>
        <h3 className={styles.title}>Línea de tiempo</h3>
        <div className={styles.empty}>
          <svg width="48" height="48" viewBox="0 0 64 64" fill="none" opacity="0.25">
            <rect x="8" y="16" width="48" height="4" rx="2" fill="currentColor" />
            <rect x="8" y="30" width="32" height="4" rx="2" fill="currentColor" />
            <rect x="8" y="44" width="40" height="4" rx="2" fill="currentColor" />
            <circle cx="6" cy="18" r="3" fill="currentColor" />
            <circle cx="6" cy="32" r="3" fill="currentColor" />
            <circle cx="6" cy="46" r="3" fill="currentColor" />
          </svg>
          <p>Hoy no hay actividades registradas</p>
        </div>
      </section>
    )
  }

  const totalMinutes = 24 * 60
  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)
  const dayStartMs = dayStart.getTime()

  return (
    <section className={styles.section}>
      <h3 className={styles.title}>Línea de tiempo</h3>

      <div className={styles.timelineBar}>
        {events.map((event) => {
          const start = new Date(event.start_time).getTime()
          const end = event.end_time ? new Date(event.end_time).getTime() : Date.now()
          const left = ((start - dayStartMs) / (totalMinutes * 60000)) * 100
          const width = ((end - start) / (totalMinutes * 60000)) * 100
          const color = CATEGORY_COLORS[event.category] || "#999"

          return (
            <div
              key={event.id}
              className={styles.block}
              style={{
                left: `${Math.max(0, left)}%`,
                width: `${Math.max(0.5, Math.min(width, 100 - Math.max(0, left)))}%`,
                background: color,
              }}
              title={`${CATEGORY_LABELS[event.category] || event.category}: ${formatTime(event.start_time)} - ${event.end_time ? formatTime(event.end_time) : "ahora"}`}
            >
              <span className={styles.blockLabel}>
                {CATEGORY_LABELS[event.category] || event.category}
              </span>
            </div>
          )
        })}
      </div>

      <div className={styles.hours}>
        {[0, 3, 6, 9, 12, 15, 18, 21, 24].map((h) => (
          <span key={h} className={styles.hourMark}>
            {h.toString().padStart(2, "0")}:00
          </span>
        ))}
      </div>

      <div className={styles.eventList}>
        {events.map((event) => {
          const color = CATEGORY_COLORS[event.category] || "#999"
          const durationMin = event.end_time
            ? (new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / 60000
            : (Date.now() - new Date(event.start_time).getTime()) / 60000

          return (
            <div key={event.id} className={styles.eventRow}>
              <div className={styles.eventDot} style={{ background: color }} />
              <div className={styles.eventTime}>
                {formatTime(event.start_time)}
                {event.end_time && <span className={styles.eventTimeEnd}> - {formatTime(event.end_time)}</span>}
                {!event.end_time && <span className={styles.eventTimeEnd}> - ahora</span>}
              </div>
              <div className={styles.eventBody}>
                <div className={styles.eventCategory}>
                  {CATEGORY_LABELS[event.category] || event.category}
                </div>
                {event.note && <div className={styles.eventNote}>{event.note}</div>}
                {event.activities.length > 0 && (
                  <div className={styles.activities}>
                    {event.activities.map((a) => (
                      <span key={a.id} className={styles.activity}>
                        {a.name} ({formatDuration(
                          ((a.end_time ? new Date(a.end_time).getTime() : Date.now()) - new Date(a.start_time).getTime()) / 60000
                        )})
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className={styles.eventDuration}>{formatDuration(durationMin)}</div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
