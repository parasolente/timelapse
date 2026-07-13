import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../hooks/useAuth"
import { api, type DailyInsight, type ProductivityInsight, type SleepInsight, type WeeklyInsight } from "../services/api"
import { BarChart } from "../components/BarChart"
import styles from "./Insights.module.css"

function fmt(minutes: number): string {
  if (minutes < 60) return `${Math.round(minutes)}m`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return `${h}h ${m}m`
}

export function Insights() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [daily, setDaily] = useState<DailyInsight | null>(null)
  const [weekly, setWeekly] = useState<WeeklyInsight | null>(null)
  const [sleep, setSleep] = useState<SleepInsight | null>(null)
  const [productivity, setProductivity] = useState<ProductivityInsight | null>(null)
  const [tab, setTab] = useState<"daily" | "weekly" | "sleep" | "productivity">("daily")
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    try {
      const [d, w, s, p] = await Promise.all([
        api.insights.daily(),
        api.insights.weekly(),
        api.insights.sleep(7),
        api.insights.productivity(7),
      ])
      setDaily(d)
      setWeekly(w)
      setSleep(s)
      setProductivity(p)
      setError("")
    } catch {
      setError("Error al cargar insights")
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <button className={styles.backBtn} onClick={() => navigate("/dashboard")}>
            ←
          </button>
          <h1 className={styles.title}>Insights</h1>
        </div>
        <div className={styles.headerRight}>
          <span className={styles.userBadge}>ID: {user?.user_uid.slice(0, 8)}...</span>
          <button className={styles.ghostBtn} onClick={logout}>
            Salir
          </button>
        </div>
      </header>

      <nav className={styles.tabs}>
        {(["daily", "weekly", "sleep", "productivity"] as const).map((t) => (
          <button
            key={t}
            className={`${styles.tab} ${tab === t ? styles.tabActive : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "daily" ? "Hoy" : t === "weekly" ? "Semana" : t === "sleep" ? "Sueño" : "Productividad"}
          </button>
        ))}
      </nav>

      {error && <p className={styles.error}>{error}</p>}

      <main className={styles.main}>
        {tab === "daily" && daily && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Resumen del día</h2>
              <span className={styles.totalTime}>{fmt(daily.total_minutes)} registrados</span>
            </div>

            <div className={styles.statCards}>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{daily.event_count}</span>
                <span className={styles.statLabel}>Eventos</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{fmt(daily.total_minutes)}</span>
                <span className={styles.statLabel}>Total</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>
                  {daily.categories[0]?.label || "—"}
                </span>
                <span className={styles.statLabel}>Principal</span>
              </div>
            </div>

            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Horas por categoría</h3>
              <BarChart
                bars={daily.categories.map((c) => ({
                  label: c.label,
                  value: c.minutes / 60,
                  unit: "h",
                  color: `var(--${c.category})`,
                }))}
              />
            </div>
          </div>
        )}

        {tab === "weekly" && weekly && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Resumen semanal (7 días)</h2>
              <span className={styles.totalTime}>
                Promedio: {fmt(weekly.average_daily_minutes)}/día
              </span>
            </div>

            <div className={styles.statCards}>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{fmt(weekly.average_daily_minutes)}</span>
                <span className={styles.statLabel}>Promedio/día</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>
                  {weekly.best_day
                    ? new Date(weekly.best_day).toLocaleDateString("es-ES", {
                        weekday: "short",
                      })
                    : "—"}
                </span>
                <span className={styles.statLabel}>Mejor día</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{weekly.totals.length}</span>
                <span className={styles.statLabel}>Categorías</span>
              </div>
            </div>

            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Total semanal por categoría</h3>
              <BarChart
                bars={weekly.totals.map((c) => ({
                  label: c.label,
                  value: c.minutes / 60,
                  unit: "h",
                  color: `var(--${c.category})`,
                }))}
              />
            </div>

            <div className={styles.chartCard}>
              <h3 className={styles.chartTitle}>Minutos por día</h3>
              <BarChart
                bars={weekly.days.map((d) => ({
                  label: new Date(d.date).toLocaleDateString("es-ES", { weekday: "short" }),
                  value: d.total_minutes,
                  unit: "m",
                }))}
              />
            </div>
          </div>
        )}

        {tab === "sleep" && sleep && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Sueño</h2>
              <span className={styles.totalTime}>{sleep.nights_count} noches registradas</span>
            </div>

            <div className={styles.statCards}>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{fmt(sleep.average_minutes)}</span>
                <span className={styles.statLabel}>Promedio</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{sleep.consistency_score}%</span>
                <span className={styles.statLabel}>Consistencia</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>
                  {sleep.nights[0]
                    ? `${sleep.nights[0].start_time} - ${sleep.nights[0].end_time}`
                    : "—"}
                </span>
                <span className={styles.statLabel}>Última noche</span>
              </div>
            </div>

            {sleep.nights.length > 0 && (
              <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Horas de sueño por noche</h3>
                <BarChart
                  bars={sleep.nights.map((n) => ({
                    label: new Date(n.date).toLocaleDateString("es-ES", {
                      weekday: "short",
                      day: "numeric",
                    }),
                    value: n.minutes / 60,
                    unit: "h",
                    color: "var(--sleep)",
                  }))}
                />
              </div>
            )}

            {sleep.nights.length > 0 && (
              <div className={styles.listCard}>
                <h3 className={styles.chartTitle}>Noches recientes</h3>
                {sleep.nights.map((n, i) => (
                  <div key={i} className={styles.listRow}>
                    <span className={styles.listDate}>
                      {new Date(n.date).toLocaleDateString("es-ES", {
                        weekday: "long",
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <span className={styles.listTime}>
                      {n.start_time} - {n.end_time}
                    </span>
                    <span className={styles.listValue}>{fmt(n.minutes)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "productivity" && productivity && (
          <div className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2>Productividad</h2>
              <span className={styles.totalTime}>7 días</span>
            </div>

            <div className={styles.statCards}>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{fmt(productivity.work_minutes_today)}</span>
                <span className={styles.statLabel}>Hoy</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{fmt(productivity.work_minutes_week)}</span>
                <span className={styles.statLabel}>Esta semana</span>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statValue}>{fmt(productivity.average_daily_work)}</span>
                <span className={styles.statLabel}>Promedio/día</span>
              </div>
            </div>

            {productivity.daily_breakdown.length > 0 && (
              <div className={styles.chartCard}>
                <h3 className={styles.chartTitle}>Horas de trabajo por día</h3>
                <BarChart
                  bars={productivity.daily_breakdown.map((d) => ({
                    label: new Date(d.date).toLocaleDateString("es-ES", {
                      weekday: "short",
                    }),
                    value: d.minutes / 60,
                    unit: "h",
                    color: "var(--work)",
                  }))}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
