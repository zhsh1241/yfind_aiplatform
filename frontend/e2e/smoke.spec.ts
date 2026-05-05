import { expect, test } from "@playwright/test";

test.describe("TASK-interactive-prototype 平台可点击原型", () => {
  test("可进入组织权限与推理服务核心页面", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("YFI 工业 AI 小模型平台原型")).toBeVisible();

    await page.getByRole("button", { name: "组织权限" }).click();
    await expect(page.getByText("当前用户上下文")).toBeVisible();

    await page.getByRole("button", { name: "推理服务" }).click();
    await expect(page.getByText("推理服务调用趋势")).toBeVisible();
  });
});
