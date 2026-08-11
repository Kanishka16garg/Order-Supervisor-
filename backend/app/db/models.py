import uuid
from datetime import datetime
from typing import Optional, List, Dict, Any
from sqlalchemy import Column, String, Text, DateTime, Boolean, ForeignKey, JSON, Integer
from sqlalchemy.orm import relationship
from backend.app.db.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Supervisor(Base):
    __tablename__ = "supervisors"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, nullable=False)
    base_instruction = Column(Text, nullable=False)
    wake_sensitivity = Column(String, default="MEDIUM") # HIGH, MEDIUM, LOW
    available_tools = Column(JSON, default=list) # List of enabled tool names
    created_at = Column(DateTime, default=datetime.utcnow)

    runs = relationship("Run", back_populates="supervisor", cascade="all, delete-orphan")


class Run(Base):
    __tablename__ = "runs"

    id = Column(String, primary_key=True, default=generate_uuid) # Also Temporal workflow ID
    order_id = Column(String, index=True, nullable=False)
    supervisor_id = Column(String, ForeignKey("supervisors.id"), nullable=False)
    
    # Status: ACTIVE, WAITING, SLEEPING, PAUSED, COMPLETED, TERMINATED
    status = Column(String, default="ACTIVE", index=True)
    next_wakeup_at = Column(DateTime, nullable=True)
    
    customer_info = Column(JSON, default=dict) # {name, email, phone, vip_status}
    order_details = Column(JSON, default=dict) # {items, total_amount, status, carrier}
    custom_instructions = Column(JSON, default=list) # Runtime dynamic instructions
    
    final_summary = Column(JSON, nullable=True) # {summary, key_learnings, recommendations}
    
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    supervisor = relationship("Supervisor", back_populates="runs")
    events = relationship("Event", back_populates="run", cascade="all, delete-orphan")
    activities = relationship("Activity", back_populates="run", cascade="all, delete-orphan")
    memory = relationship("Memory", back_populates="run", uselist=False, cascade="all, delete-orphan")


class Event(Base):
    __tablename__ = "events"

    id = Column(String, primary_key=True, default=generate_uuid)
    run_id = Column(String, ForeignKey("runs.id"), nullable=False)
    event_type = Column(String, nullable=False) # e.g. order_created, shipment_delayed
    payload = Column(JSON, default=dict)
    processed = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    run = relationship("Run", back_populates="events")


class Activity(Base):
    __tablename__ = "activities"

    id = Column(String, primary_key=True, default=generate_uuid)
    run_id = Column(String, ForeignKey("runs.id"), nullable=False)
    
    # Type: EVENT, CLASSIFIER_DECISION, AGENT_DECISION, TOOL_EXECUTION, MEMORY_UPDATE, WORKFLOW_STATE
    type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    activity_metadata = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    run = relationship("Run", back_populates="activities")


class Memory(Base):
    __tablename__ = "memories"

    id = Column(String, primary_key=True, default=generate_uuid)
    run_id = Column(String, ForeignKey("runs.id"), unique=True, nullable=False)
    rolling_summary = Column(Text, default="Order workflow initialized.")
    important_facts = Column(JSON, default=list) # List of strings/key milestones
    last_updated_at = Column(DateTime, default=datetime.utcnow)

    run = relationship("Run", back_populates="memory")
