import socketserver
import json
from datetime import datetime, timezone

POINTS = [
    {"nodeId": "ns=2;s=weld.current", "value": 12.3, "unit": "A"},
    {"nodeId": "ns=2;s=weld.voltage", "value": 48.7, "unit": "V"},
    {"nodeId": "ns=2;s=robot.speed", "value": 0.82, "unit": "m/s"},
]

class Handler(socketserver.StreamRequestHandler):
    def handle(self):
        line = self.rfile.readline().decode('utf-8', errors='ignore').strip().upper()
        payload = {"protocol": "OPC_UA_SIM", "status": "OK", "timestamp": datetime.now(timezone.utc).isoformat(), "points": POINTS}
        if line and line not in {"READ", "HEALTH"}:
            payload["echo"] = line
        self.wfile.write((json.dumps(payload, ensure_ascii=False) + "\n").encode('utf-8'))

socketserver.ThreadingTCPServer.allow_reuse_address = True
socketserver.ThreadingTCPServer(('0.0.0.0', 4840), Handler).serve_forever()
