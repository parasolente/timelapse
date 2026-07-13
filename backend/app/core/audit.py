import structlog

logger = structlog.get_logger()


def log_action(user_uid: str, action: str, resource: str, payload: dict | None = None):
    logger.info("audit", user_uid=user_uid, action=action, resource=resource, payload=payload)
