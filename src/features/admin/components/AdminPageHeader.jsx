import { PageHeader, Badge } from '@/components/ui';

/* Legacy identifier preserved: SuperAdminPageHeader. Active name: AdminPageHeader. */
export default function AdminPageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  mockBadge,
  mockBadgeLabel = 'Demo preview',
}) {
  const badge = mockBadge ? (
    <Badge variant="info">{mockBadgeLabel}</Badge>
  ) : null;

  const mergedActions =
    actions || badge ? (
      <>
        {actions}
        {badge}
      </>
    ) : null;

  return (
    <PageHeader
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      actions={mergedActions}
    />
  );
}
