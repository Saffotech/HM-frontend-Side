import { PageHeader } from '@/components/ui';

/* Legacy identifier preserved: AdminPageHeader. Active name: ManagerPageHeader. */
export default function ManagerPageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <PageHeader
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      actions={actions}
    />
  );
}
