import { expect, test } from "@playwright/test";

test.describe("TASK-dataset-asset-mvp 数据资产 MVP", () => {
  test("AC-04 AC-06 管理员可完成搜索、上传入口、申请与审批闭环", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("button", { name: "数据资产" }).first().click();
    await expect(page.getByText("数据集列表")).toBeVisible();

    await page.getByRole("textbox", { name: "数据集搜索" }).fill("轴承");
    await expect(page.getByRole("button", { name: "轴承异响音频集" })).toBeVisible();
    await expect(page.getByRole("button", { name: "焊点外观缺陷集" })).toHaveCount(0);

    await page.getByRole("button", { name: "重置筛选" }).click();
    await page.getByRole("button", { name: "上传数据集" }).first().click();
    const uploadDialog = page.getByRole("dialog", { name: "上传数据集" });
    await expect(uploadDialog).toBeVisible();
    await uploadDialog.getByRole("button", { name: "Close" }).click();
    await expect(uploadDialog).toBeHidden();

    await page.getByRole("button", { name: "焊点外观缺陷集" }).click();
    await page.getByRole("button", { name: "发起下载申请" }).click();
    await expect(page.getByRole("dialog", { name: "发起数据集下载申请" })).toBeVisible();
    await page.getByRole("button", { name: "提交申请" }).click();

    await page.getByRole("button", { name: "审批下载申请" }).click();
    await expect(page.getByText("审批通过后，将为最新版本授予下载权限，但数据集级查看权限保持不变。")).toBeVisible();
    await page.getByRole("button", { name: "批准下载" }).click();

    await expect(page.getByText("已批准 焊点外观缺陷集 最新版本下载权限")).toBeVisible();
  });
});
