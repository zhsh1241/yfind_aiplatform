import { expect, test } from "@playwright/test";

test.describe("TASK-dataset-asset-mvp 数据准备入口", () => {
  test("AC-04 AC-06 管理员可进入重做后的数据准备工作台", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "数据准备" }).click();
    await expect(page.getByText("数据源管理").first()).toBeVisible();
    await expect(page.getByText("数据源类型").first()).toBeVisible();
    await expect(page.getByPlaceholder("请输入数据源名称")).toBeVisible();
    await expect(page.getByRole("button", { name: "+ 新建数据源" })).toBeVisible();
    await expect(page.getByText("电机温升异常图像集").first()).toBeVisible();
    await expect(page.getByText("数据集列表")).toHaveCount(0);
  });
});

test.describe("TASK-dataset-preparation-pipeline", () => {
  test("AC-02 AC-05 AC-07 独立数据准备工作台展示七阶段处理页、阻断原因与重跑入口", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "数据准备" }).click();
    await expect(page.getByText("数据源管理").first()).toBeVisible();
    await expect(page.getByText("数据源类型").first()).toBeVisible();
    await expect(page.getByPlaceholder("请输入数据源名称")).toBeVisible();
    await expect(page.getByRole("button", { name: "+ 新建数据源" })).toBeVisible();
    await expect(page.getByText("电机温升异常图像集").first()).toBeVisible();
    await expect(page.getByText("TASK-dataset-preparation-pipeline").first()).toBeVisible();
    await expect(page.getByText("平台内置覆盖数据收集、清洗、标注、划分、预处理、增强、格式转换与加载 7 个训练前步骤；失败即阻断，人工修正后重跑。")).toBeVisible();
    await expect(page.getByText("数据集列表")).toHaveCount(0);
    await expect(page.getByText("阻断原因：标注一致性低于阈值")).toBeVisible();
    await expect(page.getByText(/PAI_DLC_DATA_LOADER/).first()).toBeVisible();
    for (const stage of ["数据收集", "数据清洗", "数据标注", "数据划分", "数据预处理", "数据增强", "格式转换与加载"]) {
      await expect(page.getByRole("button", { name: `进入${stage}处理页` })).toBeVisible();
    }
    await page.getByRole("button", { name: "进入数据标注处理页" }).click();
    await expect(page.getByText("数据标注处理页")).toBeVisible();
    await expect(page.getByText("阶段目标")).toBeVisible();
    await expect(page.getByText("输入材料")).toBeVisible();
    await expect(page.getByText("功能处理")).toBeVisible();
    await expect(page.getByText("质量门禁")).toBeVisible();
    await expect(page.getByText("阶段产出")).toBeVisible();
    await expect(page.getByText("数据标注本页功能")).toBeVisible();
    await expect(page.getByText("标签体系校验")).toBeVisible();
    await expect(page.getByRole("button", { name: "启动标注一致性复核" })).toBeVisible();
    await expect(page.getByRole("button", { name: "打开人工修正队列" })).toBeVisible();
    await page.getByRole("button", { name: "返回流水线总览" }).first().click();
    await expect(page.getByText("数据源管理").first()).toBeVisible();
    await page.getByRole("button", { name: "人工修正后重跑" }).first().click();
    await expect(page.getByText("数据准备阶段已记录为本地重跑通过")).toBeVisible();
  });
});





