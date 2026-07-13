from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_session
from app.core.deps import get_current_user_uid
from app.modules.events.models import Event, EventCategory
from app.modules.insights.schemas import (
    CategoryBreakdown,
    DailyInsight,
    DaySummary,
    ProductivityInsight,
    SleepInsight,
    SleepNight,
    WeeklyInsight,
)

router = APIRouter(prefix="/insights", tags=["insights"])

CATEGORY_LABELS: dict[EventCategory, str] = {
    EventCategory.work: "Trabajo",
    EventCategory.sleep: "Dormir",
    EventCategory.leisure: "Ocio",
    EventCategory.fitness: "Ejercicio",
    EventCategory.transport: "Transporte",
    EventCategory.personal: "Personal",
    EventCategory.eat: "Comer",
}


async def get_day_breakdown(
    session: AsyncSession, user_uid: str, day: date
) -> tuple[list[CategoryBreakdown], float, int]:
    day_start = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
    day_end = datetime(day.year, day.month, day.day, 23, 59, 59, tzinfo=timezone.utc)

    result = await session.execute(
        select(Event).where(
            Event.user_uid == user_uid,
            Event.start_time >= day_start,
            Event.start_time <= day_end,
        ).order_by(Event.start_time)
    )
    events = list(result.scalars().all())

    now = datetime.now(timezone.utc)
    category_minutes: dict[str, float] = {}
    total = 0.0

    for e in events:
        end = e.end_time if e.end_time else now
        minutes = max(0, (end - e.start_time).total_seconds() / 60)
        key = e.category.value
        category_minutes[key] = category_minutes.get(key, 0) + minutes
        total += minutes

    categories = [
        CategoryBreakdown(
            category=cat,
            label=CATEGORY_LABELS.get(EventCategory(cat), cat),
            minutes=round(m, 1),
            percentage=round((m / total * 100), 1) if total > 0 else 0,
        )
        for cat, m in sorted(category_minutes.items(), key=lambda x: -x[1])
    ]

    return categories, round(total, 1), len(events)


@router.get("/daily", response_model=DailyInsight)
async def daily_insight(
    date_str: str | None = Query(None, alias="date"),
    user_uid: str = Depends(get_current_user_uid),
    session: AsyncSession = Depends(get_session),
):
    day = date.fromisoformat(date_str) if date_str else date.today()
    categories, total, count = await get_day_breakdown(session, user_uid, day)
    return DailyInsight(
        date=day.isoformat(),
        total_minutes=total,
        categories=categories,
        event_count=count,
    )


@router.get("/weekly", response_model=WeeklyInsight)
async def weekly_insight(
    end_date: str | None = Query(None, alias="end_date"),
    user_uid: str = Depends(get_current_user_uid),
    session: AsyncSession = Depends(get_session),
):
    end = date.fromisoformat(end_date) if end_date else date.today()
    start = end - timedelta(days=6)

    days: list[DaySummary] = []
    category_week_totals: dict[str, float] = {}
    best_day_total = 0
    best_day_str: str | None = None

    for i in range(7):
        d = start + timedelta(days=i)
        categories, total, _ = await get_day_breakdown(session, user_uid, d)

        days.append(DaySummary(date=d.isoformat(), total_minutes=total, categories=categories))

        for cat in categories:
            category_week_totals[cat.category] = category_week_totals.get(cat.category, 0) + cat.minutes

        if total > best_day_total:
            best_day_total = total
            best_day_str = d.isoformat()

    week_total = sum(d.total_minutes for d in days)
    average = round(week_total / 7, 1)

    week_categories = [
        CategoryBreakdown(
            category=cat,
            label=CATEGORY_LABELS.get(EventCategory(cat), cat),
            minutes=round(m, 1),
            percentage=round((m / week_total * 100), 1) if week_total > 0 else 0,
        )
        for cat, m in sorted(category_week_totals.items(), key=lambda x: -x[1])
    ]

    return WeeklyInsight(
        days=days,
        totals=week_categories,
        average_daily_minutes=average,
        best_day=best_day_str,
    )


@router.get("/sleep", response_model=SleepInsight)
async def sleep_insight(
    days_count: int = Query(7, alias="days"),
    user_uid: str = Depends(get_current_user_uid),
    session: AsyncSession = Depends(get_session),
):
    end = date.today()
    start = end - timedelta(days=days_count - 1)

    day_start_dt = datetime(start.year, start.month, start.day, tzinfo=timezone.utc)

    result = await session.execute(
        select(Event).where(
            Event.user_uid == user_uid,
            Event.category == EventCategory.sleep,
            Event.start_time >= day_start_dt,
            Event.end_time.isnot(None),
        ).order_by(Event.start_time.desc())
    )
    events = list(result.scalars().all())

    nights: list[SleepNight] = []
    total_minutes = 0.0

    for e in events:
        if not e.end_time:
            continue
        minutes = (e.end_time - e.start_time).total_seconds() / 60
        total_minutes += minutes
        nights.append(SleepNight(
            date=e.start_time.strftime("%Y-%m-%d"),
            start_time=e.start_time.strftime("%H:%M"),
            end_time=e.end_time.strftime("%H:%M"),
            minutes=round(minutes, 1),
        ))

    avg = round(total_minutes / len(nights), 1) if nights else 0

    variance = sum((n.minutes - avg) ** 2 for n in nights) / len(nights) if nights else 0
    std_dev = variance ** 0.5
    consistency = max(0, min(100, round(100 - (std_dev / 60 * 20), 1)))

    return SleepInsight(
        nights=nights[:days_count],
        average_minutes=avg,
        consistency_score=consistency,
        nights_count=len(nights),
    )


@router.get("/productivity", response_model=ProductivityInsight)
async def productivity_insight(
    days_count: int = Query(7, alias="days"),
    user_uid: str = Depends(get_current_user_uid),
    session: AsyncSession = Depends(get_session),
):
    end = date.today()
    start = end - timedelta(days=days_count - 1)

    daily_breakdown: list[dict] = []
    week_work_minutes = 0.0
    today_work = 0.0

    for i in range(days_count):
        d = start + timedelta(days=i)
        categories, total, _ = await get_day_breakdown(session, user_uid, d)

        work_minutes = next(
            (c.minutes for c in categories if c.category == "work"), 0
        )
        daily_breakdown.append({"date": d.isoformat(), "minutes": work_minutes})
        week_work_minutes += work_minutes

        if d == end:
            today_work = work_minutes

    avg = round(week_work_minutes / days_count, 1)

    return ProductivityInsight(
        work_minutes_today=round(today_work, 1),
        work_minutes_week=round(week_work_minutes, 1),
        daily_breakdown=daily_breakdown,
        average_daily_work=avg,
    )
