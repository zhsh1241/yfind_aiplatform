import { Form, Input, Modal, Select } from "antd";
import { useEffect, useState } from "react";

export type UploadDatasetFormValue = {
  name: string;
  uploadType: "file" | "image";
  dedupStrategy: "SKIP_DUPLICATE" | "WARN_DUPLICATE";
  description?: string;
};

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: (values: UploadDatasetFormValue) => void;
};

export default function UploadDatasetModal({ open, onCancel, onConfirm }: Props) {
  const [form] = Form.useForm<UploadDatasetFormValue>();
  const [confirmLoading, setConfirmLoading] = useState(false);

  useEffect(() => {
    if (open) {
      form.setFieldsValue({
        name: "",
        uploadType: "file",
        dedupStrategy: "SKIP_DUPLICATE",
        description: "",
      });
    }
  }, [form, open]);

  const handleOk = async () => {
    const values = await form.validateFields();
    setConfirmLoading(true);
    try {
      onConfirm(values);
    } finally {
      setConfirmLoading(false);
    }
  };

  return (
    <Modal title="上传数据集" open={open} onCancel={onCancel} onOk={() => void handleOk()} okText="创建上传任务" cancelText="取消" confirmLoading={confirmLoading}>
      <Form form={form} layout="vertical">
        <Form.Item label="数据集名称" name="name" rules={[{ required: true, message: "请输入数据集名称" }]}>
          <Input placeholder="例如：电机温升异常图像集" />
        </Form.Item>
        <Form.Item label="上传类型" name="uploadType" rules={[{ required: true, message: "请选择上传类型" }]}>
          <Select options={[{ value: "file", label: "通用文件上传" }, { value: "image", label: "图片样例保障" }]} />
        </Form.Item>
        <Form.Item label="去重策略" name="dedupStrategy" rules={[{ required: true, message: "请选择去重策略" }]}>
          <Select options={[{ value: "SKIP_DUPLICATE", label: "跳过重复文件" }, { value: "WARN_DUPLICATE", label: "提示重复后继续" }]} />
        </Form.Item>
        <Form.Item label="说明" name="description">
          <Input.TextArea placeholder="填写采集来源、元数据规则、审批边界和保密等级" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
