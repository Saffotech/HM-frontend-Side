import {
  BarChart3,
  Building2,
  ClipboardList,
  LayoutDashboard,
  Settings,
  User,
  UserCog,
  Users,
} from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { adminPanelRoutes } from '@/shared/constants';
import RoleLayout from '@/shared/components/layout/RoleLayout';
import '../styles/admin.css';
import '../styles/admin-mobile.css';

function navLinksFor(panel) {
  return [
    { href: panel.dashboard, label: 'Dashboard', icon: LayoutDashboard },
    { href: panel.staff, label: 'Staff', icon: Users },
    { href: panel.departments, label: 'Departments', icon: Building2 },
    { href: panel.roles, label: 'Roles', icon: UserCog },
    { href: panel.settings, label: 'Settings', icon: Settings },
    { href: panel.reports, label: 'Reports', icon: BarChart3 },
    { href: panel.audit, label: 'Audit Log', icon: ClipboardList },
    { href: panel.profile, label: 'Profile', icon: User },
  ];
}

/** Top shell title stays "Admin"; page names live in each screen header. */
const HEADER_TITLE = 'Admin';

function resolveTitle() {
  return HEADER_TITLE;
}

function isSectionActive(pathname, root) {
  return pathname === root || pathname.startsWith(`${root}/`);
}

function isNavLinkActive(pathname, link, panel) {
  if (link.href === panel.staff) return isSectionActive(pathname, panel.staff);
  if (link.href === panel.departments) return isSectionActive(pathname, panel.departments);
  if (link.href === panel.roles) return isSectionActive(pathname, panel.roles);
  if (link.href === panel.settings) return isSectionActive(pathname, panel.settings);
  return pathname === link.href || pathname.startsWith(`${link.href}/`);
}

/* Legacy identifier preserved: SuperAdminLayout. Active name: AdminLayout. */
export default function AdminLayout({ children, compact = false }) {
  const location = useLocation();
  const panel = adminPanelRoutes(location.pathname);
  const onProfilePage = location.pathname === panel.profile;

  // Legacy layout class: layout--super-admin. Active: layout--admin.
  // Legacy shell class: sa-shell. Active: admin-panel-shell.
  return (
    <RoleLayout
      navLinks={navLinksFor(panel)}
      resolveTitle={resolveTitle}
      homeRoute={panel.dashboard}
      layoutClassName="layout--admin"
      defaultTitle={HEADER_TITLE}
      compact={compact}
      isNavLinkActive={(pathname, link) => isNavLinkActive(pathname, link, panel)}
      showBell={false}
      profileHref={panel.profile}
      logoutMenuOnly={onProfilePage}
    >
      <div className="admin-panel-shell">{children}</div>
    </RoleLayout>
  );
}
