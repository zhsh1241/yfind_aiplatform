import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "./App";

describe("TASK-interactive-prototype 平台可点击原型", () => {
  it("渲染中文平台原型和 MVP 模块", () => {
    render(<App />);

    expect(screen.getByText("YFI 工业 AI 小模型平台原型")).toBeInTheDocument();
    expect(screen.getByText(/可点击原型/)).toBeInTheDocument();
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
