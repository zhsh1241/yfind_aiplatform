import { expect, test } from "@playwright/test";

test.describe("TASK-dataset-asset-mvp 数据准备入口", () => {
  test("AC-04 AC-06 管理员可进入重做后的数据准备工作台", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "数据准备" }).click();

    await expect(page.getByRole("heading", { name: "数据准备流水线工作台" })).toBeVisible();
    await expect(page.getByText("独立工作台")).toBeVisible();
    await expect(page.getByText(/不再沿用原数据资产列表页/)).toBeVisible();
    await expect(page.getByText("数据集列表")).toHaveCount(0);
  });
});

test.describe("TASK-dataset-preparation-pipeline", () => {
  test("AC-02 AC-05 AC-07 独立数据准备工作台展示七阶段、阻断原因与重跑入口", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "数据准备" }).click();

    await expect(page.getByRole("heading", { name: "数据准备流水线工作台" })).toBeVisible();
    await expect(page.getByText("独立工作台")).toBeVisible();
    await expect(page.getByText(/不再沿用原数据资产列表页/)).toBeVisible();
    await expect(page.getByText("TASK-dataset-preparation-pipeline")).toBeVisible();
    await expect(page.getByText("平台内置覆盖数据收集、清洗、标注、划分、预处理、增强、格式转换与加载 7 个训练前步骤；失败即阻断，人工修正后重跑。")).toBeVisible();
    await expect(page.getByText("数据集列表")).toHaveCount(0);
    await expect(page.getByText("阻断原因：标注一致性低于阈值")).toBeVisible();
    await expect(page.getByText(/PAI_DLC_DATA_LOADER/)).toBeVisible();

    for (const stage of ["数据收集", "数据清洗", "数据标注", "数据划分", "数据预处理", "数据增强", "格式转换与加载"]) {
      await expect(page.getByText(new RegExp(`${stage} ?`)).first()).toBeVisible();
    }

    await page.getByRole("button", { name: "人工修正后重跑" }).click();
    await expect(page.getByText("数据准备阶段已记录为本地重跑通过")).toBeVisible();
  });
});
