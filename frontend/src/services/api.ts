const BASE = "/api"

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem("token")
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }

  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail || "Request failed")
  }

  if (res.status === 204) return undefined as T

  return res.json()
}

export interface RegisterResponse {
  user_uid: string
  token: string
  has_phrase: boolean
}

export interface LoginResponse {
  token: string
}

export interface RecoverResponse {
  token: string
}

export interface UserMe {
  user_uid: string
  has_phrase: boolean
  created_at: string
}

export type EventCategory = "work" | "sleep" | "leisure" | "fitness" | "transport" | "personal" | "eat"

export interface ActivityResponse {
  id: string
  event_id: string
  name: string
  start_time: string
  end_time: string | null
}

export interface EventResponse {
  id: string
  category: EventCategory
  start_time: string
  end_time: string | null
  note: string | null
  activities: ActivityResponse[]
}

export interface StartEventResponse {
  event: EventResponse
  previous_event: EventResponse | null
}

export interface StopEventResponse {
  event: EventResponse
  duration_minutes: number
}

export interface StopActivityResponse {
  activity: ActivityResponse
  duration_minutes: number
}

export interface TimelineDayResponse {
  date: string
  events: EventResponse[]
  total_tracked_minutes: number
}

export interface CategoryBreakdown {
  category: string
  label: string
  minutes: number
  percentage: number
}

export interface DailyInsight {
  date: string
  total_minutes: number
  categories: CategoryBreakdown[]
  event_count: number
}

export interface DaySummary {
  date: string
  total_minutes: number
  categories: CategoryBreakdown[]
}

export interface WeeklyInsight {
  days: DaySummary[]
  totals: CategoryBreakdown[]
  average_daily_minutes: number
  best_day: string | null
}

export interface SleepNight {
  date: string
  start_time: string
  end_time: string
  minutes: number
}

export interface SleepInsight {
  nights: SleepNight[]
  average_minutes: number
  consistency_score: number
  nights_count: number
}

export interface ProductivityInsight {
  work_minutes_today: number
  work_minutes_week: number
  daily_breakdown: { date: string; minutes: number }[]
  average_daily_work: number
}

export const api = {
  register: (phrase?: string) =>
    request<RegisterResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ phrase }),
    }),

  login: (userUid: string) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ user_uid: userUid }),
    }),

  recover: (userUid: string, phrase: string) =>
    request<RecoverResponse>("/auth/recover", {
      method: "POST",
      body: JSON.stringify({ user_uid: userUid, phrase }),
    }),

  setPhrase: (phrase: string) =>
    request<void>("/auth/phrase", {
      method: "POST",
      body: JSON.stringify({ phrase }),
    }),

  getMe: () => request<UserMe>("/auth/me"),

  events: {
    start: (category: EventCategory, note?: string) =>
      request<StartEventResponse>("/events/start", {
        method: "POST",
        body: JSON.stringify({ category, note }),
      }),

    stop: () =>
      request<StopEventResponse>("/events/stop", { method: "POST" }),

    current: () =>
      request<{ event: EventResponse | null }>("/events/current"),

    day: (date?: string) =>
      request<TimelineDayResponse>(`/events/day${date ? `?date=${date}` : ""}`),
  },

  activities: {
    start: (name: string) =>
      request<ActivityResponse>("/activities/start", {
        method: "POST",
        body: JSON.stringify({ name }),
      }),

    stop: () =>
      request<StopActivityResponse>("/activities/stop", { method: "POST" }),

    manual: (data: {
      category: EventCategory
      start_time: string
      end_time?: string
      note?: string
      activity_name?: string
    }) =>
      request<ActivityResponse>("/activities/manual", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  },

  insights: {
    daily: (date?: string) =>
      request<DailyInsight>(`/insights/daily${date ? `?date=${date}` : ""}`),

    weekly: (endDate?: string) =>
      request<WeeklyInsight>(`/insights/weekly${endDate ? `?end_date=${endDate}` : ""}`),

    sleep: (days: number = 7) =>
      request<SleepInsight>(`/insights/sleep?days=${days}`),

    productivity: (days: number = 7) =>
      request<ProductivityInsight>(`/insights/productivity?days=${days}`),
  },
}
