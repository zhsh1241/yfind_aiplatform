import unittest

from fastapi.testclient import TestClient

from app.api.health import FEATURE_TRACE
from app.main import create_app


class HealthApiTest(unittest.TestCase):
    def setUp(self) -> None:
        self.client = TestClient(create_app())

    def test_health_returns_baseline_trace(self) -> None:
        response = self.client.get("/internal/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(
            response.json(),
            {
                "status": "UP",
                "service": "yfind-aiplatform-ai-adapter",
                "feature": FEATURE_TRACE,
                "role": "ai-mlops-adapter",
            },
        )

    def test_capabilities_are_explicit_placeholders(self) -> None:
        response = self.client.get("/internal/capabilities")

        self.assertEqual(response.status_code, 200)
        capabilities = response.json()
        self.assertEqual(
            {item["name"] for item in capabilities},
            {
                "label-studio",
                "mlflow",
                "workflow-engine",
                "kserve",
                "object-storage",
            },
        )
        self.assertTrue(all(item["status"] == "pending-confirmation" for item in capabilities))
        self.assertTrue(all(item["endpoint"].startswith("TODO_CONFIRM_") for item in capabilities))


if __name__ == "__main__":
    unittest.main()
