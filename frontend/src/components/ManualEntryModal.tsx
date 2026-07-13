import { useState } from "react"
import { api, type EventCategory } from "../services/api"
import styles from "./ManualEntryModal.module.css"

const CATEGORIES: { key: EventCategory; label: string }[] = [
  { key: "work", label: "Trabajo" },
  { key: "sleep", label: "Dormir" },
  { key: "eat", label: "Comer" },
  { key: "leisure", label: "Ocio" },
  { key: "fitness", label: "Ejercicio" },
  { key: "transport", label: "Transporte" },
  { key: "personal", label: "Personal" },
]

interface Props {
  onSave: () => void
  onClose: () => void
}

export function ManualEntryModal({ onSave, onClose }: Props) {
  const [category, setCategory] = useState<EventCategory>("work")
  const [startHour, setStartHour] = useState("09")
  const [startMin, setStartMin] = useState("00")
  const [durationH, setDurationH] = useState("1")
  const [durationM, setDurationM] = useState("0")
  const [note, setNote] = useState("")
  const [activity, setActivity] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async () => {
    const today = new Date()
    const start = new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate(),
      parseInt(startHour),
      parseInt(startMin),
    )

    const end = new Date(start.getTime() + parseInt(durationH) * 3600000 + parseInt(durationM) * 60000)

    if (end <= start) {
      setError("La hora de fin debe ser posterior a la de inicio")
      return
    }

    setBusy(true)
    setError("")
    try {
      await api.activities.manual({
        category,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        note: note || undefined,
        activity_name: activity || undefined,
      })
      onSave()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar")
    }
    setBusy(false)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>Entrada manual</h3>
        <p className={styles.subtitle}>Registra una actividad con hora específica.</p>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.field}>
          <label className={styles.label}>Categoría</label>
          <div className={styles.categoryRow}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                className={`${styles.catChip} ${category === cat.key ? styles.catChipActive : ""}`}
                onClick={() => setCategory(cat.key)}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Hora de inicio</label>
          <div className={styles.timeRow}>
            <select className={styles.select} value={startHour} onChange={(e) => setStartHour(e.target.value)}>
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i.toString().padStart(2, "0")}>
                  {i.toString().padStart(2, "0")}
                </option>
              ))}
            </select>
            <span className={styles.colon}>:</span>
            <select className={styles.select} value={startMin} onChange={(e) => setStartMin(e.target.value)}>
              {["00", "15", "30", "45"].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Duración</label>
          <div className={styles.timeRow}>
            <input
              className={styles.input}
              type="number"
              min="0"
              max="24"
              value={durationH}
              onChange={(e) => setDurationH(e.target.value)}
              style={{ width: "70px" }}
            />
            <span className={styles.colon}>h</span>
            <input
              className={styles.input}
              type="number"
              min="0"
              max="59"
              value={durationM}
              onChange={(e) => setDurationM(e.target.value)}
              style={{ width: "70px" }}
            />
            <span className={styles.colon}>m</span>
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Actividad (opcional)</label>
          <input
            className={styles.input}
            type="text"
            placeholder="ej: Diseño, Reunión, Correr..."
            value={activity}
            onChange={(e) => setActivity(e.target.value)}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Nota (opcional)</label>
          <input
            className={styles.input}
            type="text"
            placeholder="¿Algo que recordar?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancelar
          </button>
          <button className={styles.saveBtn} onClick={handleSubmit} disabled={busy}>
            {busy ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  )
}
