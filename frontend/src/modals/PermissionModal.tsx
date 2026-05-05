import { Descriptions, Modal } from "antd";

type Props = {
  open: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export default function PermissionModal({ open, onCancel, onConfirm }: Props) {
  return (
    <Modal title="权限与登录原型" open={open} onCancel={onCancel} onOk={onConfirm} okText="模拟登录" cancelText="取消">
      <Descriptions bordered column={1} size="small" items={[
        { key: "user", label: "用户", children: "平台管理员" },
        { key: "org", label: "组织", children: "YFI 智造中心" },
        { key: "role", label: "角色", children: "系统管理员 / 算法工程师" },
        { key: "sso", label: "SSO", children: "TODO_CONFIRM_SSO_PROVIDER" },
      ]} />
    </Modal>
  );
}
