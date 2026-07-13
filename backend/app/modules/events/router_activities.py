from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.audit import log_action
from app.core.database import get_session
from app.core.deps import get_current_user_uid
from app.modules.events.models import Activity, Event
from app.modules.events.schemas import (
    ActivityResponse,
    ManualEntryRequest,
    StartActivityRequest,
    StopActivityResponse,
)
from app.modules.events.router import get_current_event

router = APIRouter(prefix="/activities", tags=["activities"])


@router.post("/start", response_model=ActivityResponse, status_code=status.HTTP_201_CREATED)
async def start_activity(
    body: StartActivityRequest,
    user_uid: str = Depends(get_current_user_uid),
    session: AsyncSession = Depends(get_session),
):
    current_event = await get_current_event(session, user_uid)
    if not current_event:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST,
                            detail="No hay evento en curso. Inicia un evento primero.")

    now = datetime.now(timezone.utc)

    result = await session.execute(
        select(Activity)
        .where(Activity.event_id == current_event.id, Activity.end_time.is_(None))
        .limit(1)
    )
    current_activity = result.scalar_one_or_none()
    if current_activity:
        current_activity.end_time = now

    activity = Activity(event_id=current_event.id, user_uid=user_uid, name=body.name, start_time=now)
    session.add(activity)
    await session.commit()
    await session.refresh(activity)

    log_action(user_uid, "start_activity", "activity", {"name": body.name, "event_id": current_event.id})

    return ActivityResponse(
        id=activity.id,
        event_id=activity.event_id,
        name=activity.name,
        start_time=activity.start_time,
        end_time=activity.end_time,
    )


@router.post("/stop", response_model=StopActivityResponse)
async def stop_activity(
    user_uid: str = Depends(get_current_user_uid),
    session: AsyncSession = Depends(get_session),
):
    result = await session.execute(
        select(Activity)
        .where(Activity.user_uid == user_uid, Activity.end_time.is_(None))
        .order_by(Activity.start_time.desc())
        .limit(1)
    )
    activity = result.scalar_one_or_none()
    if not activity:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No hay actividad en curso")

    now = datetime.now(timezone.utc)
    activity.end_time = now
    await session.commit()

    duration = (now - activity.start_time).total_seconds() / 60

    log_action(user_uid, "stop_activity", "activity",
               {"name": activity.name, "duration_minutes": round(duration)})

    return StopActivityResponse(
        activity=ActivityResponse(
            id=activity.id,
            event_id=activity.event_id,
            name=activity.name,
            start_time=activity.start_time,
            end_time=activity.end_time,
        ),
        duration_minutes=round(duration, 1),
    )


@router.post("/manual", response_model=ActivityResponse, status_code=status.HTTP_201_CREATED)
async def create_manual_entry(
    body: ManualEntryRequest,
    user_uid: str = Depends(get_current_user_uid),
    session: AsyncSession = Depends(get_session),
):
    event = Event(
        user_uid=user_uid,
        category=body.category,
        start_time=body.start_time,
        end_time=body.end_time,
        note=body.note,
    )
    session.add(event)
    await session.flush()

    if body.activity_name:
        activity = Activity(
            event_id=event.id,
            user_uid=user_uid,
            name=body.activity_name,
            start_time=body.start_time,
            end_time=body.end_time,
        )
        session.add(activity)

    await session.commit()

    log_action(user_uid, "manual_entry", "event",
               {"category": body.category.value, "start": body.start_time.isoformat()})

    return ActivityResponse(
        id="",
        event_id=event.id,
        name=body.activity_name or body.category.value,
        start_time=body.start_time,
        end_time=body.end_time,
    )
