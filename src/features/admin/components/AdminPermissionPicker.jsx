import { Check } from 'lucide-react';
import { groupPermissions } from '@/features/admin/utils/permissionPresentation';

/* Legacy identifier preserved: SuperAdminPermissionPicker. Active name: AdminPermissionPicker. */
export default function AdminPermissionPicker({
  catalog = [],
  selectedIds = [],
  onToggle,
  onToggleGroup,
}) {
  const groups = groupPermissions(catalog);

  return (
    <div className="admin-panel-perm-list">
      {groups.map((group) => {
        const Icon = group.icon;
        const groupIds = group.permissions.map((p) => p.id);
        const selectedInGroup = groupIds.filter((id) => selectedIds.includes(id)).length;
        const allSelected = selectedInGroup === groupIds.length && groupIds.length > 0;

        return (
          <section
            key={group.id}
            className={`admin-panel-perm-section admin-panel-perm-section--${group.id}`}
          >
            <div className="admin-panel-perm-section__head">
              <div className="admin-panel-perm-section__title-wrap">
                <span className="admin-panel-perm-section__icon" aria-hidden>
                  <Icon size={15} />
                </span>
                <h3 className="admin-panel-perm-section__title">{group.label}</h3>
              </div>
              <button
                type="button"
                className="admin-panel-perm-section__toggle"
                onClick={() => onToggleGroup(groupIds, !allSelected)}
              >
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            <ul className="admin-panel-perm-section__rows">
              {group.permissions.map((perm) => {
                const checked = selectedIds.includes(perm.id);
                return (
                  <li key={perm.id}>
                    <label className={`admin-panel-perm-row${checked ? ' admin-panel-perm-row--on' : ''}`}>
                      <input
                        type="checkbox"
                        className="admin-panel-perm-row__input"
                        checked={checked}
                        onChange={() => onToggle(perm.id)}
                      />
                      <span className="admin-panel-perm-row__check" aria-hidden>
                        {checked ? <Check size={13} strokeWidth={3} /> : null}
                      </span>
                      <span className="admin-panel-perm-row__text">
                        <span className="admin-panel-perm-row__label">{perm.label}</span>
                        <span className="admin-panel-perm-row__desc">{perm.description}</span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
