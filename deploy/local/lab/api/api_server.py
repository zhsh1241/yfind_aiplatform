from http.server import BaseHTTPRequestHandler, HTTPServer
import json
from datetime import datetime, timezone

WORKORDERS = [
    {"workOrderId": "WO-20260518-0001", "line": "CABIN-WELD-01", "defectCode": "POROSITY", "text": "焊缝气孔疑似异常，需复检", "createdAt": "2026-05-18T08:00:00Z"},
    {"workOrderId": "WO-20260518-0002", "line": "CABIN-WELD-02", "defectCode": "UNDERCUT", "text": "边缘咬边超阈值，建议调整电流", "createdAt": "2026-05-18T08:05:00Z"},
    {"workOrderId": "WO-20260518-0003", "line": "QE-MEASURE-01", "defectCode": "SIZE_DRIFT", "text": "尺寸测量出现连续漂移", "createdAt": "2026-05-18T08:10:00Z"},
]

class Handler(BaseHTTPRequestHandler):
    def _json(self, code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.startswith('/health'):
            self._json(200, {"status": "UP", "service": "smp-source-api", "time": datetime.now(timezone.utc).isoformat()})
        elif self.path.startswith('/api/workorders'):
            self._json(200, {"items": WORKORDERS, "total": len(WORKORDERS), "source": "API"})
        elif self.path.startswith('/api/quality-events'):
            self._json(200, {"items": [{"eventId": "QE-001", "metric": "weld.current", "value": 12.3}], "total": 1})
        else:
            self._json(404, {"error": "not_found", "path": self.path})

    def log_message(self, fmt, *args):
        print(fmt % args)

HTTPServer(('0.0.0.0', 8081), Handler).serve_forever()
