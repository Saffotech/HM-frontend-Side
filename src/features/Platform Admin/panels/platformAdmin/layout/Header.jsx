import { Menu } from "lucide-react";
import { Link } from "react-router-dom";
import { usePlatform } from "../../../shared/context/PlatformContext";
import { initials } from "../../../shared/utils/validation";
import { platformPath } from "../../../shared/paths";
import Breadcrumbs from "./Breadcrumbs";
import "../../../shared/layout/Header.css";

export default function Header({ navOpen = false, onOpenNav }) {
  const { sessionFor } = usePlatform();
  const session = sessionFor("platform");
  const name = session?.name || "Platform Admin";

  return (
    <header className="header">
      <div className="header-left">
        <button type="button" className="icon-btn nav-toggle" aria-label="Open navigation" aria-expanded={navOpen} onClick={onOpenNav}>
          <Menu size={18} aria-hidden="true" />
        </button>
        <Breadcrumbs />
      </div>
      <div className="header-right">
        <Link className="avatar-btn" to={platformPath("/profile")} aria-label={`Open profile for ${name}`}>
          <span className="avatar">{initials(name)}</span>
          <span className="user-meta">
            <strong>{name}</strong>
          </span>
        </Link>
      </div>
    </header>
  );
}
