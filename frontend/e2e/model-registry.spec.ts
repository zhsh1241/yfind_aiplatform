import { expect, test } from "@playwright/test";

test.describe("TASK-model-registry-mvp 模型仓库 MVP", () => {
  test("AC-05 AC-06 AC-07 可查看模型版本并完成审批", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "模型仓库" }).first().click();
    await expect(page.getByRole("heading", { name: "模型仓库" })).toBeVisible();
    await expect(page.getByRole("button", { name: "轴承缺陷检测模型" })).toBeVisible();
    await expect(page.getByText("TODO_CONFIRM_MODEL_ARTIFACT_URI").first()).toBeVisible();

    await page.getByRole("button", { name: "声音异常检测模型" }).click();
    await expect(page.getByText("train-audio-poc").first()).toBeVisible();
    await expect(page.getByText("TODO_CONFIRM_MODEL_EVAL_POLICY")).toBeVisible();

    await page.getByRole("button", { name: /批准版本/ }).click();
    await expect(page.getByText("批准后，该模型版本将标记为 deployable，F007 推理服务只能消费此类版本。")).toBeVisible();
    await page.getByRole("button", { name: "批准发布" }).click();
    await expect(page.getByText("可部署").first()).toBeVisible();
  });
});
