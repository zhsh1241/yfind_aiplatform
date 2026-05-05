import { Form, Input, Modal, Select } from "antd";

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function UploadDatasetModal({ open, onCancel, onConfirm }: Props) {
  return (
    <Modal title="上传数据集" open={open} onCancel={onCancel} onOk={onConfirm} okText="创建上传任务" cancelText="取消">
      <Form layout="vertical">
        <Form.Item label="数据集名称" required><Input placeholder="例如：电机温升异常图像集" /></Form.Item>
        <Form.Item label="上传类型" required><Select defaultValue="file" options={[{ value: "file", label: "通用文件上传" }, { value: "image", label: "图片样例保障" }]} /></Form.Item>
        <Form.Item label="去重策略" required><Select defaultValue="SKIP_DUPLICATE" options={[{ value: "SKIP_DUPLICATE", label: "跳过重复文件" }, { value: "WARN_DUPLICATE", label: "提示重复后继续" }]} /></Form.Item>
        <Form.Item label="说明"><Input.TextArea placeholder="填写采集来源、元数据规则、审批边界和保密等级" /></Form.Item>
      </Form>
    </Modal>
  );
}
