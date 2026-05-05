import { Descriptions, Modal } from "antd";
import type { Dataset } from "../prototype-data";

type Props = {
  open: boolean;
  dataset: Dataset;
  requestApproved: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function DatasetRequestModal({ open, dataset, requestApproved, onCancel, onConfirm }: Props) {
  return (
    <Modal title="发起数据集下载申请" open={open} onCancel={onCancel} onOk={onConfirm} okText="提交申请" cancelText="取消">
      <Descriptions bordered column={1} size="small" items={[
        { key: "dataset", label: "数据集", children: dataset.name },
        { key: "view", label: "查看权限", children: dataset.canView ? "已放行" : "未放行" },
        { key: "download", label: "版本下载权限", children: requestApproved || dataset.canDownloadLatestVersion ? "已放行" : "待审批" },
        { key: "version", label: "申请版本", children: `${dataset.key}-latest` },
      ]} />
    </Modal>
  );
}
