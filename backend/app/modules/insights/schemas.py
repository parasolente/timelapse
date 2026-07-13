from pydantic import BaseModel, Field


class CategoryBreakdown(BaseModel):
    category: str
    label: str
    minutes: float
    percentage: float


class DailyInsight(BaseModel):
    date: str
    total_minutes: float
    categories: list[CategoryBreakdown]
    event_count: int


class DaySummary(BaseModel):
    date: str
    total_minutes: float
    categories: list[CategoryBreakdown]


class WeeklyInsight(BaseModel):
    days: list[DaySummary]
    totals: list[CategoryBreakdown]
    average_daily_minutes: float
    best_day: str | None = None


class SleepNight(BaseModel):
    date: str
    start_time: str
    end_time: str
    minutes: float


class SleepInsight(BaseModel):
    nights: list[SleepNight]
    average_minutes: float
    consistency_score: float
    nights_count: int


class ProductivityInsight(BaseModel):
    work_minutes_today: float
    work_minutes_week: float
    daily_breakdown: list[dict] = Field(default_factory=list)
    average_daily_work: float
