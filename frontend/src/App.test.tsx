import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { App } from "./App";

beforeEach(() => {
  window.localStorage.clear();
});

describe("TASK-platform-integrated-runtime 平台联调运行态", () => {
  it("渲染中文平台运行态和 MVP 模块", () => {
    render(<App />);

    expect(screen.getByText("YFI 工业 AI 小模型平台")).toBeInTheDocument();
    expect(screen.getByText("后端联调 · 数据库持久化")).toBeInTheDocument();
    expect(screen.getAllByText("数据资产").length).toBeGreaterThan(0);
    expect(screen.getAllByText("训练中心").length).toBeGreaterThan(0);
    expect(screen.getAllByText("监控审计").length).toBeGreaterThan(0);
  });

  it(
    "点击导航后切换到数据资产并打开上传弹窗",
    async () => {
      const user = userEvent.setup();
      render(<App />);

      await user.click(screen.getAllByRole("button", { name: "数据资产" })[0]);

      expect(screen.getAllByText("数据资产").length).toBeGreaterThan(0);
      expect(await screen.findByText("数据集列表")).toBeInTheDocument();

      await user.click(screen.getAllByRole("button", { name: "上传数据集" })[0]);

      expect(await screen.findByRole("dialog", { name: "上传数据集" })).toBeInTheDocument();
      expect(screen.getByPlaceholderText("例如：电机温升异常图像集")).toBeInTheDocument();
      expect(screen.getAllByText("去重策略").length).toBeGreaterThan(0);
    },
    10000,
  );

  it("点击启动训练后展示步骤流并可进入下一步", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: "启动训练" })[0]);

    const dialog = await screen.findByRole("dialog", { name: "启动训练任务" });
    expect(within(dialog).getByText("选择训练数据集")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "下一步" }));

    expect(within(dialog).getByText("选择小模型算法模板")).toBeInTheDocument();
  });

  it("组织权限页面展示当前用户和权限门禁矩阵", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: /组织权限/ })[0]);

    expect(await screen.findByText("当前用户上下文")).toBeInTheDocument();
    expect(screen.getByText("本地平台管理员")).toBeInTheDocument();
    expect(screen.getByText("权限门禁矩阵")).toBeInTheDocument();
    expect(screen.getAllByText("inference:deploy").length).toBeGreaterThan(0);
  });

  it("组织权限页面支持发起授权登录、审批通过并切换登录态", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: /组织权限/ })[0]);
    expect(await screen.findByText("审批工作台")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "发起授权登录" }));
    const dialog = await screen.findByRole("dialog", { name: "发起授权登录" });
    await user.click(within(dialog).getByRole("radio", { name: /质检复核员/ }));
    await user.clear(within(dialog).getByPlaceholderText("填写本次授权登录的业务原因"));
    await user.type(within(dialog).getByPlaceholderText("填写本次授权登录的业务原因"), "需要审批模型版本");
    await user.click(within(dialog).getByRole("button", { name: "提交审批" }));

    expect(await screen.findByText("授权登录申请已提交：质检复核员")).toBeInTheDocument();
    expect((await screen.findAllByText(/登录授权待审批/)).length).toBeGreaterThan(0);
    expect(screen.getByText("需要审批模型版本")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "批准登录" }));
    expect(await screen.findByText("已批准 质检复核员 登录授权")).toBeInTheDocument();
    expect(screen.getByText("质检复核员")).toBeInTheDocument();
    expect(screen.getAllByText("登录状态正常").length).toBeGreaterThan(0);
    expect(screen.getAllByText("已批准").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "退出登录" }));
    expect((await screen.findAllByText("当前已退出登录")).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "恢复登录" }));
    expect((await screen.findAllByText("登录状态正常")).length).toBeGreaterThan(0);
  }, 10000);

  it("点击部署模型后展示确认弹窗", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: "推理服务" })[0]);
    await screen.findByText("推理服务调用趋势");
    await user.click(screen.getAllByRole("button", { name: "部署模型" })[0]);

    const dialog = await screen.findByRole("dialog", { name: "部署模型到推理服务" });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText("确认发布已审批模型版本 bearing-defect-detector-v1，并填写本次灰度发布参数。")).toBeInTheDocument();
    expect(within(dialog).getByDisplayValue("今日 18:00 灰度窗口")).toBeInTheDocument();
  }, 10000);

  it("推理服务页面展示调用趋势图表且柱子可点击", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: "推理服务" })[0]);

    expect(await screen.findByText("推理服务调用趋势")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "推理服务调用趋势图表" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /14:00/ }));

    expect(screen.getByText("14:00 推理指标")).toBeInTheDocument();
    expect(screen.getByText(/P95 延迟 128ms/)).toBeInTheDocument();
  });

  it("推理服务页面支持本地部署后的健康检查、放量和回滚", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: "推理服务" })[0]);
    await screen.findByText("推理服务调用趋势");

    await user.click(screen.getByRole("button", { name: "本地部署" }));
    expect(await screen.findByText(/已创建本地部署记录/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "确认健康检查" }));
    expect(await screen.findByText(/健康检查通过/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "放量至 100%" }));
    expect(await screen.findByText(/提升为全量流量/)).toBeInTheDocument();
    expect(screen.getByText("全量发布")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "回滚到上一稳定版本" }));
    expect(await screen.findByText(/已回滚到稳定版本/)).toBeInTheDocument();
  }, 10000);

  it("标注任务页面展示后端接入后的任务队列", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: "标注任务" })[0]);

    expect(await screen.findByText("标注任务工作台")).toBeInTheDocument();
    expect((await screen.findAllByText(/焊点外观缺陷复核/)).length).toBeGreaterThan(0);
  });

  it("标注任务页面支持复核通过、退回补标和交付训练", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: "标注任务" })[0]);
    await screen.findByText("标注任务工作台");

    await user.click(screen.getByRole("button", { name: "通过当前复核" }));
    expect(await screen.findByText(/复核通过结果|已通过 .* 复核/)).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "退回补标" })[0]);
    expect(await screen.findByText(/已退回 .* 补标/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "交付训练" }));
    expect(await screen.findByText(/已交付 .* 到训练环节/)).toBeInTheDocument();
  });

  it("边缘下发页面展示后端接入后的节点列表", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: "边缘下发" })[0]);

    expect(await screen.findByText("边缘下发工作台")).toBeInTheDocument();
    expect((await screen.findAllByText(/边缘/)).length).toBeGreaterThan(0);
  });

  it("边缘下发页面支持本地下发、确认同步与回滚稳定包", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: "边缘下发" })[0]);
    await screen.findByText("边缘下发工作台");

    await user.click(screen.getByRole("button", { name: "发起下发" }));
    expect(await screen.findByText(/下发任务|本地下发任务/)).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "确认同步完成" })[0]);
    expect(await screen.findByText(/已确认 .* 同步完成/)).toBeInTheDocument();

    await user.click(screen.getAllByRole("button", { name: "回滚稳定包" })[0]);
    expect(await screen.findByText(/已回滚 .* 到稳定包/)).toBeInTheDocument();
  });

  it("监控审计页面支持确认告警、静默与升级 P1", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: "监控审计" })[0]);
    await screen.findByText("监控审计工作台");

    await user.click(screen.getByRole("button", { name: "确认当前告警" }));
    expect((await screen.findAllByText("ACKNOWLEDGED")).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "静默 30 分钟" }));
    expect((await screen.findAllByText("SILENCED")).length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "升级 P1" }));
    expect((await screen.findAllByText("P1")).length).toBeGreaterThan(0);
    expect((await screen.findAllByText("ESCALATED")).length).toBeGreaterThan(0);
  }, 10000);

  it("点击流程节点后打开详情抽屉", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: /数据上传/ })[1]);

    expect(screen.getAllByText("数据上传").length).toBeGreaterThan(0);
    expect(screen.getByText("链路总览")).toBeInTheDocument();
  });
});

describe("TASK-dataset-asset-mvp 数据资产 MVP", () => {
  it("AC-04 支持搜索与状态筛选", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: "数据资产" })[0]);
    await screen.findByText("数据集列表");
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
    await screen.findByText("数据集列表");
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
      await screen.findByText("数据集列表");
      await user.click(screen.getByRole("button", { name: "焊点外观缺陷集" }));
      await user.click(screen.getByRole("button", { name: "发起下载申请" }));

      const requestDialog = await screen.findByRole("dialog", { name: "发起数据集下载申请" });
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

describe("TASK-training-job-mvp 训练任务 MVP", () => {
  it("AC-05 展示训练任务、资源调度、模板和 artifact 信息", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: "训练中心" })[0]);

    expect(await screen.findByText("训练任务看板")).toBeInTheDocument();
    expect(screen.getByText("轴承缺陷检测 v1")).toBeInTheDocument();
    expect(screen.getByText(/TODO_CONFIRM_MODEL_ARTIFACT_URI/)).toBeInTheDocument();
    expect(screen.getByText("资源与调度")).toBeInTheDocument();
    expect(screen.getByText("算法模板")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "训练指标趋势图" })).toBeInTheDocument();
  });

  it("AC-05 AC-06 支持训练指标点击与启动训练资源配置流程", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: "训练中心" })[0]);
    await screen.findByText("训练任务看板");
    await user.click(screen.getByRole("button", { name: /Epoch 10/ }));

    expect(screen.getByText("Epoch 10 指标")).toBeInTheDocument();
    expect(screen.getByText(/accuracy 90%/)).toBeInTheDocument();
    await user.click(screen.getByLabelText("Close"));

    await user.click(screen.getAllByRole("button", { name: "启动训练" })[0]);
    const dialog = await screen.findByRole("dialog", { name: "启动训练任务" });
    expect(within(dialog).getByText("电机温升异常图像集 / v3")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "下一步" }));
    expect(within(dialog).getByText("small-cnn-vision")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "下一步" }));
    expect(within(dialog).getByText("GPU：1 卡")).toBeInTheDocument();
  });
});

describe("TASK-model-registry-mvp 模型仓库 MVP", () => {
  it("AC-05 AC-07 展示模型列表、版本来源和部署准入信息", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: "模型仓库" })[0]);

    expect((await screen.findAllByText("模型仓库")).length).toBeGreaterThan(0);
    await screen.findByText("模型列表");
    expect(screen.getByRole("button", { name: "轴承缺陷检测模型" })).toBeInTheDocument();
    expect(screen.getByText("TASK-model-registry-mvp")).toBeInTheDocument();
    expect(screen.getByText("可部署版本")).toBeInTheDocument();
    expect(screen.getAllByText(/TODO_CONFIRM_MODEL_ARTIFACT_URI/).length).toBeGreaterThan(0);
  });

  it("AC-02 AC-03 AC-05 支持查看版本详情并批准模型版本", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getAllByRole("button", { name: "模型仓库" })[0]);
    await screen.findByText("模型列表");
    await user.click(screen.getByRole("button", { name: "声音异常检测模型" }));
    await user.click(screen.getByRole("button", { name: "v1.0.0-rc1" }));

    expect(screen.getByText("训练来源")).toBeInTheDocument();
    expect(screen.getAllByText("train-audio-poc").length).toBeGreaterThan(0);
    expect(screen.getByText("TODO_CONFIRM_MODEL_EVAL_POLICY")).toBeInTheDocument();
    expect(screen.getByText("model:manage")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /批准版本/ }));
    expect(await screen.findByText("批准后，该模型版本将标记为 deployable，F007 推理服务只能消费此类版本。")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "批准发布" }));

    expect((await screen.findAllByText("可部署")).length).toBeGreaterThan(0);
    expect(screen.getByText("local.admin")).toBeInTheDocument();
  }, 10000);
});
