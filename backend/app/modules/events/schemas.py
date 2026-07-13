from datetime import datetime

from pydantic import BaseModel, Field

from app.modules.events.models import Event, EventCategory, Activity


class ActivityResponse(BaseModel):
    id: str
    event_id: str
    name: str
    start_time: datetime
    end_time: datetime | None


class EventResponse(BaseModel):
    id: str
    category: EventCategory
    start_time: datetime
    end_time: datetime | None
    note: str | None
    activities: list[ActivityResponse] = []


class StartEventRequest(BaseModel):
    category: EventCategory
    note: str | None = None


class StartEventResponse(BaseModel):
    event: EventResponse
    previous_event: EventResponse | None = None


class StopEventResponse(BaseModel):
    event: EventResponse
    duration_minutes: float


class StartActivityRequest(BaseModel):
    name: str = Field(min_length=1, max_length=200)


class StopActivityResponse(BaseModel):
    activity: ActivityResponse
    duration_minutes: float


class ManualEntryRequest(BaseModel):
    category: EventCategory
    start_time: datetime
    end_time: datetime | None = None
    note: str | None = None
    activity_name: str | None = None


class TimelineDayResponse(BaseModel):
    date: str
    events: list[EventResponse]
    total_tracked_minutes: float


def event_to_response(e: Event) -> EventResponse:
    return EventResponse(
        id=e.id,
        category=e.category,
        start_time=e.start_time,
        end_time=e.end_time,
        note=e.note,
        activities=[
            ActivityResponse(
                id=a.id,
                event_id=a.event_id,
                name=a.name,
                start_time=a.start_time,
                end_time=a.end_time,
            )
            for a in (e.activities or [])
        ],
    )
