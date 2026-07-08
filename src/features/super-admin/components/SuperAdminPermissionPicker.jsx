import { Check } from 'lucide-react';
import { groupPermissions } from '@/features/super-admin/utils/permissionPresentation';

export default function SuperAdminPermissionPicker({
  catalog = [],
  selectedIds = [],
  onToggle,
  onToggleGroup,
}) {
  const groups = groupPermissions(catalog);

  return (
    <div className="sa-perm-list">
      {groups.map((group) => {
        const Icon = group.icon;
        const groupIds = group.permissions.map((p) => p.id);
        const selectedInGroup = groupIds.filter((id) => selectedIds.includes(id)).length;
        const allSelected = selectedInGroup === groupIds.length && groupIds.length > 0;

        return (
          <section
            key={group.id}
            className={`sa-perm-section sa-perm-section--${group.id}`}
          >
            <div className="sa-perm-section__head">
              <div className="sa-perm-section__title-wrap">
                <span className="sa-perm-section__icon" aria-hidden>
                  <Icon size={15} />
                </span>
                <h3 className="sa-perm-section__title">{group.label}</h3>
              </div>
              <button
                type="button"
                className="sa-perm-section__toggle"
                onClick={() => onToggleGroup(groupIds, !allSelected)}
              >
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
            </div>

            <ul className="sa-perm-section__rows">
              {group.permissions.map((perm) => {
                const checked = selectedIds.includes(perm.id);
                return (
                  <li key={perm.id}>
                    <label className={`sa-perm-row${checked ? ' sa-perm-row--on' : ''}`}>
                      <input
                        type="checkbox"
                        className="sa-perm-row__input"
                        checked={checked}
                        onChange={() => onToggle(perm.id)}
                      />
                      <span className="sa-perm-row__check" aria-hidden>
                        {checked ? <Check size={13} strokeWidth={3} /> : null}
                      </span>
                      <span className="sa-perm-row__text">
                        <span className="sa-perm-row__label">{perm.label}</span>
                        <span className="sa-perm-row__desc">{perm.description}</span>
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
