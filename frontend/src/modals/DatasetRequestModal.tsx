import { Descriptions, Form, Input, Modal } from "antd";
import { useEffect } from "react";
import type { Dataset } from "../prototype-data";

export type DatasetRequestFormValue = {
  reason: string;
};

type Props = {
  open: boolean;
  dataset: Dataset;
  requestApproved: boolean;
  onCancel: () => void;
  onConfirm: (values: DatasetRequestFormValue) => void;
};

export default function DatasetRequestModal({ open, dataset, requestApproved, onCancel, onConfirm }: Props) {
  const [form] = Form.useForm<DatasetRequestFormValue>();

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        reason: `申请下载 ${dataset.name} 最新版本用于本地分析与复核`,
      });
    }
  }, [dataset.name, form, open]);

  const handleOk = async () => {
    const values = await form.validateFields();
    onConfirm(values);
  };

  return (
    <Modal title="发起数据集下载申请" open={open} onCancel={onCancel} onOk={() => void handleOk()} okText="提交申请" cancelText="取消">
      <Descriptions bordered column={1} size="small" items={[
        { key: "dataset", label: "数据集", children: dataset.name },
        { key: "view", label: "查看权限", children: dataset.canView ? "已放行" : "未放行" },
        { key: "download", label: "版本下载权限", children: requestApproved || dataset.canDownloadLatestVersion ? "已放行" : "待审批" },
        { key: "version", label: "申请版本", children: `${dataset.key}-latest` },
      ]} />
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item label="申请原因" name="reason" rules={[{ required: true, message: "请填写申请原因" }]}>
          <Input.TextArea rows={4} placeholder="填写下载用途、使用范围与保密说明" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
