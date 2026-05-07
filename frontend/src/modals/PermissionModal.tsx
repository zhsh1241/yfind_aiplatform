import { Descriptions, Input, Modal, Radio, Space, Typography } from "antd";
import { useEffect, useState } from "react";
import { type IdentityProfileKey } from "../simulationStore";

const { Text } = Typography;

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: (payload: { profileKey: IdentityProfileKey; reason: string; username: string; password: string }) => void;
};

export default function PermissionModal({ open, onCancel, onConfirm }: Props) {
  const [profileKey, setProfileKey] = useState<IdentityProfileKey>("admin");
  const [reason, setReason] = useState("申请临时登录授权");
  const [username, setUsername] = useState("admin@yfind.local");
  const [password, setPassword] = useState("admin123!");

  useEffect(() => {
    if (!open) return;
    setProfileKey("admin");
    setReason("申请临时登录授权");
    setUsername("admin@yfind.local");
    setPassword("admin123!");
  }, [open]);

  return (
    <Modal title="登录并发起授权" open={open} onCancel={onCancel} onOk={() => onConfirm({ profileKey, reason, username, password })} okText="登录/提交审批" cancelText="取消">
      <Space direction="vertical" className="full-width" size="middle">
        <Descriptions bordered column={1} size="small" items={[
          { key: "user", label: "内置账号", children: "admin@yfind.local / reviewer@yfind.local / engineer@yfind.local" },
          { key: "org", label: "组织", children: "YFI 工业平台" },
          { key: "role", label: "授权角色", children: "平台管理员 / 质检复核员" },
          { key: "sso", label: "会话凭证", children: "BACKEND_SESSION_TOKEN" },
        ]} />
        <div>
          <Text strong>登录账号</Text>
          <Input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="admin@yfind.local" />
        </div>
        <div>
          <Text strong>登录密码</Text>
          <Input.Password value={password} onChange={(event) => setPassword(event.target.value)} placeholder="输入登录密码" />
        </div>
        <Radio.Group value={profileKey} onChange={(event) => setProfileKey(event.target.value)}>
          <Space direction="vertical">
            <Radio value="admin">平台管理员（全局授权）</Radio>
            <Radio value="reviewer">质检复核员（审批与质检权限）</Radio>
          </Space>
        </Radio.Group>
        <div>
          <Text strong>授权原因</Text>
          <Input.TextArea value={reason} onChange={(event) => setReason(event.target.value)} rows={3} placeholder="填写本次授权登录的业务原因" />
        </div>
      </Space>
    </Modal>
  );
}
