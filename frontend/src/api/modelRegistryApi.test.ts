import { afterEach, describe, expect, it, vi } from "vitest";
import { approveModelVersion, loadModelRegistry } from "./modelRegistryApi";

function jsonResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body),
  } as Response);
}

describe("TASK-model-registry-mvp 前后端模型仓库 API 集成层", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("AC-01 AC-02 将后端模型详情映射为前端模型版本结构", async () => {
    const fetchMock = vi.fn()
      .mockReturnValueOnce(jsonResponse({
        featureTrace: "TASK-model-registry-mvp",
        items: [{ modelKey: "audio-anomaly-lite" }],
      }))
      .mockReturnValueOnce(jsonResponse({
        modelKey: "audio-anomaly-lite",
        modelName: "声音异常检测模型",
        domain: "预测性维护",
        owner: "设备组",
        description: "承接 F005 声音异常检测 PoC 的轻量音频模型",
        latestVersionKey: "audio-anomaly-lite-v1",
        versions: [{
          versionKey: "audio-anomaly-lite-v1",
          versionName: "v1.0.0-rc1",
          trainingJobKey: "train-audio-poc",
          artifactUri: "TODO_CONFIRM_MODEL_ARTIFACT_URI/train-audio-poc",
          checksum: "sha256:audio-anomaly-lite-v1",
          status: "APPROVAL_PENDING",
          approvalStatus: "APPROVAL_PENDING",
          deployable: false,
          metrics: [
            { metricName: "accuracy", metricValue: 0.84, metricUnit: "%" },
            { metricName: "latency", metricValue: 55, metricUnit: "ms" },
          ],
          createdAt: "2026-05-05T00:00:00Z",
        }],
        evalPolicy: "TODO_CONFIRM_MODEL_EVAL_POLICY",
        approvalPolicy: "TODO_CONFIRM_MODEL_APPROVAL_POLICY",
        featureTrace: "TASK-model-registry-mvp",
      }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await loadModelRegistry();

    expect(result.source).toBe("backend");
    expect(result.models[0].name).toBe("声音异常检测模型");
    expect(result.models[0].versions[0].trainingJobKey).toBe("train-audio-poc");
    expect(result.models[0].versions[0].metrics[0]).toEqual({ name: "accuracy", value: "84%" });
    expect(fetchMock).toHaveBeenCalledWith("http://localhost:8080/api/models", expect.objectContaining({
      headers: expect.objectContaining({ Authorization: expect.stringMatching(/^Bearer /) }),
    }));
  });

  it("AC-05 审批操作调用后端 approve 接口", async () => {
    const fetchMock = vi.fn().mockReturnValueOnce(jsonResponse({
      modelKey: "audio-anomaly-lite",
      versionKey: "audio-anomaly-lite-v1",
      status: "APPROVED",
      approvalStatus: "APPROVED",
      deployable: true,
      featureTrace: "TASK-model-registry-mvp",
    }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await approveModelVersion("audio-anomaly-lite", "audio-anomaly-lite-v1");

    expect(result.deployable).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8080/api/models/audio-anomaly-lite/versions/audio-anomaly-lite-v1/approve",
      expect.objectContaining({ method: "POST" }),
    );
  });
});
