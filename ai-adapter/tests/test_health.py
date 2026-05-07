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

    def test_training_templates_are_exposed_for_f005(self) -> None:
        response = self.client.get("/internal/training/templates")

        self.assertEqual(response.status_code, 200)
        self.assertIn("small-cnn-vision", {item["template_key"] for item in response.json()})

    def test_training_submit_returns_placeholder_adapter_submission(self) -> None:
        response = self.client.post(
            "/internal/training/submit",
            json={
                "job_key": "train-bearing-v1",
                "dataset_key": "motor-thermal",
                "dataset_version_key": "motor-thermal-v3",
                "template_key": "small-cnn-vision",
                "accelerator": "GPU",
            },
        )

        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["submission_id"], "adapter-sim-train-bearing-v1")
        self.assertEqual(payload["feature"], "TASK-training-job-mvp")
        self.assertTrue(payload["artifact_root"].startswith("TODO_CONFIRM_MODEL_ARTIFACT_URI"))


if __name__ == "__main__":
    unittest.main()
