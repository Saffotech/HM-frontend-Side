import { useEffect, useRef, useState } from "react";
import { Bell, ChevronDown } from "lucide-react";
import { Link } from "react-router-dom";
import { usePlatform } from "../../../shared/context/PlatformContext";
import { initials } from "../../../shared/utils/validation";
import { formatDateTime } from "../../../shared/utils/formatDate";
import { platformPath } from "../../../shared/paths";
import Breadcrumbs from "./Breadcrumbs";
import "../../../shared/layout/Header.css";

export default function Header() {
  const platform = usePlatform();
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

  const unread = platform.notifications.filter((item) => !item.read).length;

  return (
    <header className="header">
      <div className="header-left">
        <Breadcrumbs />
      </div>
      <div className="header-right">
        <div className="menu-anchor" ref={notesRef}>
          <button type="button" className="icon-btn" aria-label="Notifications" onClick={() => setNotesOpen((open) => !open)}>
            <Bell size={18} />
            {unread > 0 && <span className="unread-dot" />}
          </button>
          {notesOpen && (
            <div className="dropdown notify-panel">
              <button type="button" className="dropdown-item" onClick={platform.markNotificationsRead}>Mark all read</button>
              {platform.notifications.map((item) => (
                <Link
                  key={item.id}
                  to={item.href}
                  className="notify-item"
                  onClick={() => {
                    platform.markNotificationRead(item.id);
                    setNotesOpen(false);
                  }}
                >
                  <strong>{item.title}</strong>
                  <small className="muted">{formatDateTime(item.time)}{item.read ? "" : " · Unread"}</small>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="menu-anchor" ref={userRef}>
          <button type="button" className="avatar-btn" onClick={() => setUserOpen((open) => !open)}>
            <span className="avatar">
              {platform.profile.photo
                ? <img src={platform.profile.photo} alt="" />
                : initials(platform.profile.name)}
            </span>
            <span className="user-meta">
              <strong>{platform.profile.name}</strong>
            </span>
            <ChevronDown size={16} />
          </button>
          {userOpen && (
            <div className="dropdown">
              <Link className="dropdown-item" to={platformPath("/profile")} onClick={() => setUserOpen(false)}>Profile</Link>
              <button type="button" className="dropdown-item" onClick={() => { setUserOpen(false); platform.signOutPortal("platform"); }}>Logout</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
