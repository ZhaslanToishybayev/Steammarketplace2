from src.tools.steam_tools import check_server_status
import json

def test_status():
    print("🧪 Testing check_server_status tool...")
    status = check_server_status()
    print(json.dumps(status, indent=2))
    
    # Simple assertion logic (just ensuring we got a dict back)
    if isinstance(status, dict) and "frontend" in status:
         print("✅ Tool structure valid.")
    else:
         print("❌ Tool output invalid.")

if __name__ == "__main__":
    test_status()
