import AdminPageHeader from '@/features/admin/components/AdminPageHeader';

export default function SuperAdminPageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
  mockBadge,
  mockBadgeLabel = 'Demo preview',
}) {
  const badge = mockBadge ? <span className="sa-mock-badge">{mockBadgeLabel}</span> : null;
  const mergedActions = actions || badge ? (
    <div className="sa-page-header__actions">
      {actions}
      {badge}
    </div>
  ) : null;

  return (
    <AdminPageHeader
      eyebrow={eyebrow}
      title={title}
      subtitle={subtitle}
      actions={mergedActions}
    />
  );
}
