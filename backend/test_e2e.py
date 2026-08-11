import asyncio
import httpx
import json

BASE_URL = "http://127.0.0.1:8000"

async def run_e2e_verification():
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=30.0) as client:
        print("\n--- 1. Testing API Health & Supervisors ---")
        health = await client.get("/health")
        print(f"Health Status: {health.json()}")

        sups = await client.get("/api/supervisors")
        supervisors = sups.json()
        print(f"Loaded {len(supervisors)} Supervisor Templates. First Template: {supervisors[0]['name']}")
        supervisor_id = supervisors[0]["id"]

        print("\n--- 2. Starting Order Supervisor Workflow for ORD-9082 ---")
        run_resp = await client.post("/api/runs", json={
            "order_id": "ORD-9082",
            "supervisor_id": supervisor_id,
            "customer_info": {"name": "Alex Rivera", "email": "alex@example.com", "vip_status": True},
            "order_details": {"item": "Wireless Noise-Canceling Headphones", "total_amount": 199.99, "carrier": "FedEx"}
        })
        run_data = run_resp.json()
        run_id = run_data["id"]
        print(f"Created Run ID: {run_id} | Status: {run_data['status']}")

        await asyncio.sleep(1)

        print("\n--- 3. Injecting Event: payment_confirmed (Routine Lifecycle) ---")
        event1 = await client.post(f"/api/runs/{run_id}/events", json={
            "event_type": "payment_confirmed",
            "payload": {"gateway": "Stripe", "transaction_id": "tx_99812"}
        })
        print(f"Event 1 Injected: {event1.json()['event_type']}")
        await asyncio.sleep(1)

        print("\n--- 4. Injecting Event: shipment_delayed (Urgent Anomaly) ---")
        event2 = await client.post(f"/api/runs/{run_id}/events", json={
            "event_type": "shipment_delayed",
            "payload": {"delay_reason": "Severe Weather Anomaly", "delay_hours": 24}
        })
        print(f"Event 2 Injected: {event2.json()['event_type']}")
        await asyncio.sleep(1)

        print("\n--- 5. Signaling Dynamic Instruction ---")
        inst_resp = await client.post(f"/api/runs/{run_id}/instructions", json={
            "instruction": "If shipment is delayed, offer a 15% discount code to customer immediately."
        })
        print(f"Instruction Signaled: {inst_resp.json()}")
        await asyncio.sleep(1)

        print("\n--- 6. Injecting Terminal Event: delivered ---")
        event3 = await client.post(f"/api/runs/{run_id}/events", json={
            "event_type": "delivered",
            "payload": {"delivered_at": "2026-08-11T11:00:00Z", "signed_by": "A. Rivera"}
        })
        print(f"Event 3 Injected: {event3.json()['event_type']}")
        await asyncio.sleep(1)

        print("\n--- 7. Fetching Final Run State & Audit Trail ---")
        final_details = await client.get(f"/api/runs/{run_id}")
        final_data = final_details.json()

        print(f"\nFinal Run Status: {final_data['status']}")
        print(f"Rolling Memory: {final_data['memory']['rolling_summary']}")
        print(f"\nTotal Timeline Activities Logged: {len(final_data['activities'])}")
        
        for act in final_data['activities']:
            print(f"  - [{act['type']}] {act['title']}: {act['description']}")

        if final_data.get("final_summary"):
            print("\n==========================================")
            print("END-OF-RUN FINAL SUMMARY & LEARNINGS")
            print("==========================================")
            print(json.dumps(final_data["final_summary"], indent=2))
            print("==========================================\n")

if __name__ == "__main__":
    asyncio.run(run_e2e_verification())
