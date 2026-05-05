import { Button, Card } from "antd";

type Props = {
  moduleLabel: string;
  summary: string;
  openDetail: (title: string, description: string) => void;
};

export default function GenericModulePage({ moduleLabel, summary, openDetail }: Props) {
  return (
    <section className="utility-grid-section">
      <Card title={`${moduleLabel}工作台`}>
        <Button onClick={() => openDetail(moduleLabel, summary)}>查看原型说明</Button>
      </Card>
    </section>
  );
}
