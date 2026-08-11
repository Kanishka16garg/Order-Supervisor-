import logging
from typing import Dict, Any
from pydantic import BaseModel

logger = logging.getLogger("event_classifier")

class ClassifierDecision(BaseModel):
    wake_immediately: bool
    urgency: str # HIGH, MEDIUM, LOW
    reason: str
    is_terminal_event: bool = False

async def classify_event(event_type: str, payload: Dict[str, Any], wake_sensitivity: str = "MEDIUM") -> ClassifierDecision:
    """
    Lightweight Event Classifier:
    Determines whether an incoming event requires waking the main LLM agent immediately
    or if the workflow should remain asleep until the next scheduled wake-up.
    """
    event_type_lower = event_type.lower()

    # Terminal events ALWAYS wake main agent to complete workflow
    if event_type_lower in ["delivered", "order_cancelled", "refund_requested"]:
        return ClassifierDecision(
            wake_immediately=True,
            urgency="HIGH",
            reason=f"Terminal event '{event_type}' detected. Waking main agent to finalize workflow.",
            is_terminal_event=True
        )

    # Urgent anomaly events ALWAYS wake agent
    if event_type_lower in ["shipment_delayed", "payment_failed", "customer_message_received"]:
        return ClassifierDecision(
            wake_immediately=True,
            urgency="HIGH",
            reason=f"Urgent operational event '{event_type}' requires immediate agent reasoning."
        )

    # Standard progression events
    if event_type_lower in ["payment_confirmed", "shipment_created"]:
        if wake_sensitivity == "HIGH":
            return ClassifierDecision(
                wake_immediately=True,
                urgency="MEDIUM",
                reason=f"High sensitivity supervisor waking on routine event '{event_type}'."
            )
        else:
            return ClassifierDecision(
                wake_immediately=False,
                urgency="LOW",
                reason=f"Routine lifecycle event '{event_type}'. Workflow stays asleep until next schedule."
            )

    # Default fallback for custom events
    return ClassifierDecision(
        wake_immediately=True,
        urgency="MEDIUM",
        reason=f"Unrecognized or custom event '{event_type}' triggers fallback wake-up."
    )
