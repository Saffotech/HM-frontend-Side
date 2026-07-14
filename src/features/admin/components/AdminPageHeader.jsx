import { PageHeader } from '@/components/ui';

export default function AdminPageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <PageHeader
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      actions={actions}
    />
  );
}
