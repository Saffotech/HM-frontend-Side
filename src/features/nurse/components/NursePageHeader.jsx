import { PageHeader } from '@/components/ui';

export default function NursePageHeader({ title, actions, subtitle }) {
  return <PageHeader title={title} subtitle={subtitle} actions={actions} />;
}
