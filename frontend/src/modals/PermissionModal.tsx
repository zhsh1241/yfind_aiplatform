import { Descriptions, Input, Modal, Radio, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import { type IdentityProfileKey } from "../simulationStore";

const { Text } = Typography;

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: (payload: { profileKey: IdentityProfileKey; reason: string }) => void;
};

export default function PermissionModal({ open, onCancel, onConfirm }: Props) {
  const [profileKey, setProfileKey] = useState<IdentityProfileKey>("admin");
  const [reason, setReason] = useState("申请生产角色授权登录");

  useEffect(() => {
    if (!open) return;
    setProfileKey("admin");
    setReason("申请生产角色授权登录");
  }, [open]);

  return (
    <Modal title="发起授权登录" open={open} onCancel={onCancel} onOk={() => onConfirm({ profileKey, reason })} okText="提交审批" cancelText="取消">
      <Space direction="vertical" className="full-width" size="middle">
        <Descriptions bordered column={1} size="small" items={[
          { key: "user", label: "默认用户", children: "平台管理员" },
          { key: "org", label: "组织", children: "YFI 智造中心" },
          { key: "role", label: "目标角色", children: "系统管理员 / 质检复核员" },
          { key: "sso", label: "SSO", children: "LOCAL_SIMULATED_IDENTITY" },
        ]} />
        <Radio.Group value={profileKey} onChange={(event) => setProfileKey(event.target.value)}>
          <Space direction="vertical">
            <Radio value="admin">平台管理员：可操作全部主流程</Radio>
            <Radio value="reviewer">质检复核员：侧重数据、标注、模型审批</Radio>
          </Space>
        </Radio.Group>
        <div>
          <Text strong>申请原因</Text>
          <Input.TextArea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder="填写本次授权登录的业务原因" />
        </div>
      </Space>
    </Modal>
  );
}
