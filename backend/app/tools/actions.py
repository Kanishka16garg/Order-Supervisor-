import logging
from datetime import datetime
from typing import Dict, Any

logger = logging.getLogger("order_supervisor_tools")

def message_fulfillment_team(order_id: str, note: str) -> Dict[str, Any]:
    """Sends an alert or instruction to the warehouse fulfillment team."""
    timestamp = datetime.utcnow().isoformat()
    logger.info(f"[TOOL EXECUTION] message_fulfillment_team for {order_id}: {note}")
    return {
        "tool": "message_fulfillment_team",
        "status": "SUCCESS",
        "order_id": order_id,
        "recipient": "Fulfillment / Warehouse Team",
        "message": note,
        "timestamp": timestamp
    }

def message_payments_team(order_id: str, issue_type: str, details: str = "") -> Dict[str, Any]:
    """Notifies the finance / payments team regarding payment status or fraud check."""
    timestamp = datetime.utcnow().isoformat()
    logger.info(f"[TOOL EXECUTION] message_payments_team for {order_id}: {issue_type} - {details}")
    return {
        "tool": "message_payments_team",
        "status": "SUCCESS",
        "order_id": order_id,
        "recipient": "Finance / Payments Team",
        "issue_type": issue_type,
        "details": details,
        "timestamp": timestamp
    }

def message_logistics_team(order_id: str, priority: str, details: str) -> Dict[str, Any]:
    """Escalates courier or shipping issues to the logistics management team."""
    timestamp = datetime.utcnow().isoformat()
    logger.info(f"[TOOL EXECUTION] message_logistics_team for {order_id} [{priority}]: {details}")
    return {
        "tool": "message_logistics_team",
        "status": "SUCCESS",
        "order_id": order_id,
        "recipient": "Logistics & Courier Operations",
        "priority": priority,
        "details": details,
        "timestamp": timestamp
    }

def message_customer(order_id: str, channel: str, message_body: str) -> Dict[str, Any]:
    """Sends an update SMS/Email message directly to the customer."""
    timestamp = datetime.utcnow().isoformat()
    logger.info(f"[TOOL EXECUTION] message_customer for {order_id} via {channel}: {message_body}")
    return {
        "tool": "message_customer",
        "status": "SUCCESS",
        "order_id": order_id,
        "channel": channel,
        "message_body": message_body,
        "timestamp": timestamp
    }

def create_internal_note(order_id: str, note_content: str) -> Dict[str, Any]:
    """Appends an official internal audit note to the order supervisor log."""
    timestamp = datetime.utcnow().isoformat()
    logger.info(f"[TOOL EXECUTION] create_internal_note for {order_id}: {note_content}")
    return {
        "tool": "create_internal_note",
        "status": "SUCCESS",
        "order_id": order_id,
        "note": note_content,
        "timestamp": timestamp
    }

def escalate_issue(order_id: str, level: str, reason: str) -> Dict[str, Any]:
    """Flags the order for immediate human intervention or senior manager review."""
    timestamp = datetime.utcnow().isoformat()
    logger.info(f"[TOOL EXECUTION] escalate_issue for {order_id} (Level: {level}): {reason}")
    return {
        "tool": "escalate_issue",
        "status": "SUCCESS",
        "order_id": order_id,
        "level": level,
        "reason": reason,
        "timestamp": timestamp
    }

AVAILABLE_TOOLS_MAP = {
    "message_fulfillment_team": message_fulfillment_team,
    "message_payments_team": message_payments_team,
    "message_logistics_team": message_logistics_team,
    "message_customer": message_customer,
    "create_internal_note": create_internal_note,
    "escalate_issue": escalate_issue
}
