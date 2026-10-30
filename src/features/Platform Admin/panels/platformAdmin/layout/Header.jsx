import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { usePlatform } from "../../../shared/context/PlatformContext";
import { initials } from "../../../shared/utils/validation";
import { platformPath } from "../../../shared/paths";
import useLogoutConfirmation from "@/shared/hooks/useLogoutConfirmation";
import Breadcrumbs from "./Breadcrumbs";
import "../../../shared/layout/Header.css";

export default function Header() {
  const { sessionFor, signOutPortal } = usePlatform();
  const logoutConfirmation = useLogoutConfirmation(() => signOutPortal("platform"));
  const session = sessionFor("platform");
  const [userOpen, setUserOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const userRef = useRef(null);
  const notesRef = useRef(null);

  useEffect(() => {
    const close = (event) => {
      if (userRef.current && !userRef.current.contains(event.target)) setUserOpen(false);
      if (notesRef.current && !notesRef.current.contains(event.target)) setNotesOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  return (
    <header className="header">
      <div className="header-left">
        <Breadcrumbs />
      </div>
      <div className="header-right">
        <div className="menu-anchor" ref={notesRef}>
          <button type="button" className="icon-btn" aria-label="Notifications" onClick={() => setNotesOpen((open) => !open)}>
            <Bell size={18} />
          </button>
          {notesOpen && (
            <div className="dropdown notify-panel">
              <p className="dropdown-item">No platform notifications API is available.</p>
            </div>
          )}
        </div>
        <div className="menu-anchor" ref={userRef}>
          <button type="button" className="avatar-btn" onClick={() => setUserOpen((open) => !open)}>
            <span className="avatar">{initials(session?.name || "P")}</span>
            <span className="user-meta">
              <strong>{session?.name || "Platform Admin"}</strong>
            </span>
            <ChevronDown size={16} />
          </button>
          {userOpen && (
            <div className="dropdown">
              <Link className="dropdown-item" to={platformPath("/profile")} onClick={() => setUserOpen(false)}>Profile</Link>
              <button type="button" className="dropdown-item" onClick={() => { setUserOpen(false); logoutConfirmation.requestLogout(); }}>Logout</button>
            </div>
          )}
        </div>
      </div>
      {logoutConfirmation.dialog}
    </header>
  );
}
