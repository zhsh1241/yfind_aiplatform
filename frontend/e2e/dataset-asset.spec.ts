import { expect, test } from "@playwright/test";

test.describe("TASK-dataset-asset-mvp 数据准备 MVP", () => {
  test("AC-04 AC-06 管理员可完成搜索、上传入口、申请与审批闭环", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "数据准备" }).click();
    await expect(page.getByRole("heading", { name: "数据准备" })).toBeVisible();
    await expect(page.getByText("数据准备流水线")).toBeVisible();

    await page.getByRole("textbox", { name: "数据集搜索" }).fill("轴承");
    await expect(page.getByRole("button", { name: "轴承异响音频集" })).toBeVisible();
    await expect(page.getByRole("button", { name: "焊点外观缺陷集" })).toHaveCount(0);

    await page.getByRole("button", { name: "重置筛选" }).click();
    await page.getByRole("button", { name: "上传数据集" }).nth(0).click();
    const uploadDialog = page.getByRole("dialog", { name: "上传数据集" });
    await expect(uploadDialog).toBeVisible();
    await uploadDialog.locator(".ant-modal-close").click();
    await expect(uploadDialog).toBeHidden();

    await page.getByRole("button", { name: "焊点外观缺陷集" }).click();
    await page.getByRole("button", { name: "发起下载申请" }).first().click();
    await expect(page.getByRole("dialog", { name: "发起数据集下载申请" })).toBeVisible();
    await page.getByRole("button", { name: "提交申请" }).click();

    await page.getByRole("button", { name: "审批下载申请" }).click();
    await expect(page.getByText("审批通过后，将为最新版本授予下载权限，但数据集级查看权限保持不变。")).toBeVisible();
    await page.getByRole("button", { name: "批准下载" }).click();

    await expect(page.getByText("下载已放行", { exact: true }).first()).toBeVisible();
  });
});

test.describe("TASK-dataset-preparation-pipeline", () => {
  test("AC-02 AC-05 AC-07 数据准备流水线展示七阶段、阻断原因与重跑入口", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "数据准备" }).click();

    await expect(page.getByText("TASK-dataset-preparation-pipeline")).toBeVisible();
    await expect(page.getByText("平台内置覆盖数据收集、清洗、标注、划分、预处理、增强、格式转换与加载 7 个训练前步骤；失败即阻断，人工修正后重跑。")).toBeVisible();
    await expect(page.getByText("阻断原因：标注一致性低于阈值")).toBeVisible();
    await expect(page.getByText(/PAI_DLC_DATA_LOADER/)).toBeVisible();

    for (const stage of ["数据收集", "数据清洗", "数据标注", "数据划分", "数据预处理", "数据增强", "格式转换与加载"]) {
      await expect(page.getByText(new RegExp(`${stage} ·`))).toBeVisible();
    }

    await page.getByRole("button", { name: "人工修正后重跑" }).click();
    await expect(page.getByText("数据准备阶段已记录为本地重跑通过")).toBeVisible();
  });
});

