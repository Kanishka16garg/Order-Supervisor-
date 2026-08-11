from typing import List, Dict, Any

class MemoryService:
    @staticmethod
    def update_rolling_memory(
        current_summary: str,
        new_event_type: str,
        agent_reasoning: str,
        actions_taken: List[str]
    ) -> str:
        """
        Updates compact rolling memory string with latest event and agent decision.
        """
        action_str = f" Actions: {', '.join(actions_taken)}." if actions_taken else " No actions needed."
        updated_summary = f"{current_summary.strip()} | Event [{new_event_type}]: {agent_reasoning}.{action_str}"
        
        # Keep summary bounded to ~500 chars for efficient prompt context
        if len(updated_summary) > 600:
            parts = updated_summary.split(" | ")
            # Keep initial status + last 3 events
            compacted = parts[0] + " | " + " | ".join(parts[-3:])
            return compacted
            
        return updated_summary

    @staticmethod
    def extract_important_facts(existing_facts: List[str], event_type: str, action_details: List[str]) -> List[str]:
        facts = list(existing_facts)
        fact_entry = f"[{event_type.upper()}] " + ("; ".join(action_details) if action_details else "Observed")
        if fact_entry not in facts:
            facts.append(fact_entry)
        return facts
