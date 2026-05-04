import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("TASK-interactive-prototype 平台可点击原型", () => {
  it("渲染中文平台原型和 MVP 模块", () => {
    render(<App />);

    expect(screen.getByText("YFI 工业 AI 小模型平台原型")).toBeInTheDocument();
    expect(screen.getByText("可点击原型 · Apple 设计语言")).toBeInTheDocument();
    expect(screen.getAllByText("数据资产").length).toBeGreaterThan(0);
    expect(screen.getAllByText("训练中心").length).toBeGreaterThan(0);
    expect(screen.getAllByText("监控审计").length).toBeGreaterThan(0);
  });

  it("点击导航后切换到数据资产并打开上传弹窗", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: "数据资产" })[0]);

    expect(screen.getAllByText("数据资产").length).toBeGreaterThan(0);
    expect(screen.getByText("数据集列表")).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "上传数据集" })[0]);

    expect(screen.getByRole("dialog", { name: "上传数据集" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("例如：电机温升异常图像集")).toBeInTheDocument();
    expect(screen.getAllByText("去重策略").length).toBeGreaterThan(0);
  });

  it("点击启动训练后展示步骤流并可进入下一步", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: "启动训练" })[0]);

    const dialog = screen.getByRole("dialog", { name: "启动训练任务" });
    expect(within(dialog).getByText("选择训练数据集")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "下一步" }));

    expect(within(dialog).getByText("选择小模型算法模板")).toBeInTheDocument();
  });

  it("组织权限页面展示当前用户和权限门禁矩阵", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: /组织权限/ })[0]);

    expect(screen.getByText("当前用户上下文")).toBeInTheDocument();
    expect(screen.getByText("本地平台管理员")).toBeInTheDocument();
    expect(screen.getByText("权限门禁矩阵")).toBeInTheDocument();
    expect(screen.getByText("inference:deploy")).toBeInTheDocument();
  });

  it("点击部署模型后展示确认弹窗", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: "推理服务" })[0]);
    await user.click(screen.getAllByRole("button", { name: "部署模型" })[0]);

    expect(screen.getByRole("dialog", { name: "部署模型到推理服务" })).toBeInTheDocument();
    expect(screen.getByText("确认发布模型版本 v1.3.0")).toBeInTheDocument();
  });

  it("推理服务页面展示调用趋势图表且柱子可点击", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: "推理服务" })[0]);

    expect(screen.getByText("推理服务调用趋势")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "推理服务调用趋势图表" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /14:00/ }));

    expect(screen.getByText("14:00 推理指标")).toBeInTheDocument();
    expect(screen.getByText(/P95 延迟 128ms/)).toBeInTheDocument();
  });

  it("点击流程节点后打开详情抽屉", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole("button", { name: /数据上传/ }));

    expect(screen.getAllByText("数据上传").length).toBeGreaterThan(0);
    expect(screen.getByText(/第 2 步/)).toBeInTheDocument();
  });
});

describe("TASK-dataset-asset-mvp 数据资产 MVP", () => {
  it("AC-04 支持搜索与状态筛选", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: "数据资产" })[0]);
    await user.type(screen.getByRole("textbox", { name: "数据集搜索" }), "轴承");

    expect(screen.getByText("轴承异响音频集")).toBeInTheDocument();
    expect(screen.queryByText("焊点外观缺陷集")).not.toBeInTheDocument();

    await user.clear(screen.getByRole("textbox", { name: "数据集搜索" }));
    await user.click(screen.getByRole("combobox", { name: "数据集状态筛选" }));
    await user.click(screen.getAllByText("PENDING_APPROVAL")[1]);

    expect(screen.getByText("焊点外观缺陷集")).toBeInTheDocument();
    expect(screen.getAllByRole("row").some((row) => row.textContent?.includes("焊点外观缺陷集"))).toBe(true);
  });

  it("AC-04 支持图片样例预览与非图片退化说明", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: "数据资产" })[0]);
    await user.click(screen.getByRole("button", { name: "轴承异响音频集" }));
    await user.click(screen.getByRole("button", { name: "查看样例预览" }));

    expect(screen.getByText(/当前仅保证图片预览/)).toBeInTheDocument();
  });

  it(
    "AC-04 AC-06 支持下载申请与审批交互并完成 feature gate 追踪",
    async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(screen.getAllByRole("button", { name: "数据资产" })[0]);
      await user.click(screen.getByRole("button", { name: "焊点外观缺陷集" }));
      await user.click(screen.getByRole("button", { name: "发起下载申请" }));

      const requestDialog = screen.getByRole("dialog", { name: "发起数据集下载申请" });
      expect(within(requestDialog).getByText("待审批")).toBeInTheDocument();

      await user.click(within(requestDialog).getByRole("button", { name: "提交申请" }));
      await waitFor(() => expect(screen.queryByRole("dialog", { name: "发起数据集下载申请" })).not.toBeInTheDocument());

      await user.click(screen.getByRole("button", { name: "审批下载申请" }));
      expect(
        await screen.findByText("审批通过后，将为最新版本授予下载权限，但数据集级查看权限保持不变。"),
      ).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "批准下载" }));

      expect(await screen.findByText("已批准 焊点外观缺陷集 最新版本下载权限")).toBeInTheDocument();
    },
    10000,
  );
});
