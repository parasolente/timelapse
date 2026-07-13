from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_action
from app.core.database import get_session
from app.core.deps import get_current_user_uid
from app.modules.events.models import Event, EventCategory
from app.modules.events.schemas import (
    StartEventRequest,
    StartEventResponse,
    StopEventResponse,
    TimelineDayResponse,
    event_to_response,
)

router = APIRouter(prefix="/events", tags=["events"])

CATEGORY_LABELS: dict[EventCategory, str] = {
    EventCategory.work: "Trabajo",
    EventCategory.sleep: "Dormir",
    EventCategory.leisure: "Ocio",
    EventCategory.fitness: "Ejercicio",
    EventCategory.transport: "Transporte",
    EventCategory.personal: "Personal",
    EventCategory.eat: "Comer",
}


async def get_current_event(session: AsyncSession, user_uid: str) -> Event | None:
    result = await session.execute(
        select(Event)
        .where(Event.user_uid == user_uid, Event.end_time.is_(None))
        .order_by(Event.start_time.desc())
        .limit(1)
    )
    return result.scalar_one_or_none()


@router.post("/start", response_model=StartEventResponse, status_code=status.HTTP_201_CREATED)
async def start_event(
    body: StartEventRequest,
    user_uid: str = Depends(get_current_user_uid),
    session: AsyncSession = Depends(get_session),
):
    now = datetime.now(timezone.utc)
    previous = None

    current = await get_current_event(session, user_uid)
    if current:
        if current.category == body.category:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ya estás en '{CATEGORY_LABELS[body.category]}'",
            )
        current.end_time = now
        previous = event_to_response(current)

    event = Event(user_uid=user_uid, category=body.category, start_time=now, note=body.note)
    session.add(event)
    await session.commit()
    await session.refresh(event, ["activities"])

    log_action(user_uid, "start_event", "event", {"category": body.category.value})

    return StartEventResponse(event=event_to_response(event), previous_event=previous)


@router.post("/stop", response_model=StopEventResponse)
async def stop_event(
    user_uid: str = Depends(get_current_user_uid),
    session: AsyncSession = Depends(get_session),
):
    current = await get_current_event(session, user_uid)
    if not current:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay evento en curso")

    now = datetime.now(timezone.utc)
    current.end_time = now
    await session.commit()
    await session.refresh(current, ["activities"])

    duration = (now - current.start_time).total_seconds() / 60

    log_action(user_uid, "stop_event", "event",
               {"category": current.category.value, "duration_minutes": round(duration)})

    return StopEventResponse(event=event_to_response(current), duration_minutes=round(duration, 1))


@router.get("/current")
async def get_current(
    user_uid: str = Depends(get_current_user_uid),
    session: AsyncSession = Depends(get_session),
):
    current = await get_current_event(session, user_uid)
    if not current:
        return {"event": None}
    await session.refresh(current, ["activities"])
    return {"event": event_to_response(current)}


@router.get("/day", response_model=TimelineDayResponse)
async def get_day(
    date_str: str | None = Query(None, alias="date"),
    user_uid: str = Depends(get_current_user_uid),
    session: AsyncSession = Depends(get_session),
):
    if date_str:
        day = date.fromisoformat(date_str)
    else:
        day = date.today()

    day_start = datetime(day.year, day.month, day.day, tzinfo=timezone.utc)
    day_end = datetime(day.year, day.month, day.day, 23, 59, 59, tzinfo=timezone.utc)

    result = await session.execute(
        select(Event)
        .where(Event.user_uid == user_uid, Event.start_time >= day_start, Event.start_time <= day_end)
        .order_by(Event.start_time)
    )
    events = list(result.scalars().all())

    for e in events:
        await session.refresh(e, ["activities"])

    now = datetime.now(timezone.utc)
    total = sum(
        ((e.end_time or now) - e.start_time).total_seconds() / 60 for e in events
    )

    return TimelineDayResponse(
        date=day.isoformat(),
        events=[event_to_response(e) for e in events],
        total_tracked_minutes=round(total, 1),
    )
