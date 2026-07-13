import styles from "./BarChart.module.css"

interface Bar {
  label: string
  value: number
  unit?: string
  color?: string
}

interface Props {
  bars: Bar[]
  maxValue?: number
  height?: number
  showValues?: boolean
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

export function BarChart({ bars, maxValue, height = 180, showValues = true }: Props) {
  const max = maxValue ?? Math.max(...bars.map((b) => b.value), 1)

  return (
    <div className={styles.chart} style={{ height }}>
      {bars.map((bar, i) => {
        const pct = Math.max((bar.value / max) * 100, 2)
        const color = bar.color || CATEGORY_COLORS[bar.label.toLowerCase()] || "var(--primary)"
        return (
          <div key={i} className={styles.barCol}>
            <div className={styles.barWrapper}>
              <div
                className={styles.bar}
                style={{ height: `${pct}%`, background: color }}
              >
                {showValues && bar.value > 0 && (
                  <span className={styles.barValue}>
                    {bar.unit === "h"
                      ? `${Math.round(bar.value)}h`
                      : `${Math.round(bar.value)}`}
                  </span>
                )}
              </div>
            </div>
            <span className={styles.barLabel}>{bar.label}</span>
          </div>
        )
      })}
    </div>
  )
}
