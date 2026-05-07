import { expect, test } from "@playwright/test";

test.describe("TASK-training-job-mvp 训练任务 MVP", () => {
  test("AC-05 AC-06 AC-07 可查看训练看板并推进启动训练配置", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "训练中心" }).first().click();
    await expect(page.getByText("训练任务看板")).toBeVisible();
    await expect(page.getByText("轴承缺陷检测 v1")).toBeVisible();
    await expect(page.getByText("资源与调度")).toBeVisible();
    await expect(page.getByText("TODO_CONFIRM_MODEL_ARTIFACT_URI")).toBeVisible();

    await page.getByRole("button", { name: /Epoch 10/ }).click();
    await expect(page.getByText("Epoch 10 指标")).toBeVisible();
    await expect(page.getByText(/accuracy 90%/)).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();
    await expect(page.getByText("Epoch 10 指标")).toBeHidden();

    await page.getByRole("button", { name: "启动训练" }).first().click();
    const dialog = page.getByRole("dialog", { name: "启动训练任务" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("电机温升异常图像集 / v3")).toBeVisible();

    await dialog.getByRole("button", { name: "下一步" }).click();
    await expect(dialog.getByText("small-cnn-vision")).toBeVisible();

    await dialog.getByRole("button", { name: "下一步" }).click();
    await expect(dialog.getByText("GPU：1 卡")).toBeVisible();
  });
});

