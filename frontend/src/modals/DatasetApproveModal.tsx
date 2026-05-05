import { Descriptions, Modal, Typography } from "antd";
import type { Dataset } from "../prototype-data";

const { Paragraph } = Typography;

type Props = {
  open: boolean;
  dataset: Dataset;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function DatasetApproveModal({ open, dataset, onCancel, onConfirm }: Props) {
  return (
    <Modal title="审批下载申请" open={open} onCancel={onCancel} onOk={onConfirm} okText="批准下载" cancelText="取消">
      <Paragraph>审批通过后，将为最新版本授予下载权限，但数据集级查看权限保持不变。</Paragraph>
      <Descriptions bordered column={1} size="small" items={[
        { key: "dataset", label: "数据集", children: dataset.name },
        { key: "dedup", label: "去重策略", children: dataset.dedupStrategy },
        { key: "job", label: "异步任务状态", children: dataset.processingStatus },
      ]} />
    </Modal>
  );
}
