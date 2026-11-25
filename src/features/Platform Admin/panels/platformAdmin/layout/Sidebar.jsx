import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Building2,
  ChartColumn,
  ChevronDown,
  CircleUserRound,
  ContactRound,
  CreditCard,
  Handshake,
  IndianRupee,
  LayoutDashboard,
  Receipt,
  UserPlus,
  X,
} from "lucide-react";
import logo from "../../../shared/assets/images/logo.svg";
import { PLATFORM_BASE, platformPath } from "../../../shared/paths";
import "../../../shared/layout/Sidebar.css";

const groups = [
  {
    id: "overview",
    label: "Overview",
    items: [
      { to: PLATFORM_BASE, label: "Dashboard", icon: LayoutDashboard, end: true },
      { to: platformPath("/analytics"), label: "Platform Analytics", icon: ChartColumn },
    ],
  },
  {
    id: "tenants",
    label: "Tenant Management",
    items: [
      { to: platformPath("/hospitals"), label: "Hospitals / Tenants", icon: Building2, exclude: [platformPath("/hospitals/register")] },
      { to: platformPath("/hospitals/register"), label: "Register Hospital", icon: UserPlus },
      { to: platformPath("/crm-performance"), label: "CRM & Performance", icon: Handshake },
    ],
  },
  {
    id: "billing",
    label: "Billing & Plans",
    items: [
      { to: platformPath("/billing/plans"), label: "Subscription Plans", icon: CreditCard },
      { to: platformPath("/billing/subscriptions"), label: "Subscriptions", icon: Receipt },
      { to: platformPath("/billing/revenue"), label: "Billing & Revenue", icon: IndianRupee },
    ],
  },
  {
    id: "account",
    label: "Account",
    items: [
      { to: platformPath("/staff"), label: "Platform Staff", icon: ContactRound },
      { to: platformPath("/profile"), label: "My Profile", icon: CircleUserRound },
    ],
  },
];

export default function Sidebar({ onNavigate }) {
  const [collapsed, setCollapsed] = useState({});
  const { pathname } = useLocation();

  return (
    <aside className="sidebar" aria-label="Platform navigation">
      <div className="brand">
        <img src={logo} alt="" />
        <div>
          <strong>SaffoCare</strong>
          <span>Platform Admin</span>
        </div>
        <button type="button" className="icon-btn sidebar-close" onClick={onNavigate} aria-label="Close navigation">
          <X size={18} aria-hidden="true" />
        </button>
      </div>
      <div className="sidebar-scroll">
        {groups.map((group) => {
          const isOpen = collapsed[group.id] !== true;
          return (
            <section key={group.id} className="nav-group">
              <button
                type="button"
                className="nav-group-label"
                aria-expanded={isOpen}
                onClick={() => setCollapsed((current) => ({ ...current, [group.id]: isOpen }))}
              >
                <span className="nav-label">{group.label}</span>
                <ChevronDown size={14} style={{ transform: isOpen ? "rotate(0deg)" : "rotate(-90deg)" }} />
              </button>
              {isOpen && group.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => {
                      const excluded = item.exclude?.some((path) => pathname.startsWith(path));
                      return `nav-link ${isActive && !excluded ? "active" : ""}`;
                    }}
                    onClick={onNavigate}
                  >
                    <Icon size={16} aria-hidden="true" />
                    <span className="nav-label">{item.label}</span>
                  </NavLink>
                );
              })}
            </section>
          );
        })}
      </div>
    </aside>
  );
}
