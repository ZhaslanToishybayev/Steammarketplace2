import socket
from typing import Dict

def check_server_status() -> Dict[str, str]:
    """
    Checks the status of the Steammarketplace2 local servers.

    Returns:
        A dictionary containing the status ('UP' or 'DOWN') of the frontend and backend.
    """
    servers = {
        "frontend": ("localhost", 3002),
        "backend": ("localhost", 3001),
        "redis": ("localhost", 6379)
    }
    
    status = {}
    
    for name, (host, port) in servers.items():
        try:
            with socket.create_connection((host, port), timeout=1):
                status[name] = "UP"
        except (socket.timeout, ConnectionRefusedError, OSError):
            status[name] = "DOWN"
            
    return status
