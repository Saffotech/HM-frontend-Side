import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import Button from "../components/Button";
import Input from "../components/Input";
import { usePlatform } from "../context/PlatformContext";
import { PORTAL_USERS } from "../data/portalUsers";
import "../layout/AppShell.css";
import "./PortalLogin.css";

export default function PortalLogin({ portal, title, lead, home, other }) {
  const account = PORTAL_USERS.find((user) => user.portal === portal);
  const { sessionFor, signInPortal } = usePlatform();
  const session = sessionFor(portal);
  const navigate = useNavigate();
  const [email, setEmail] = useState(account?.email || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  if (session?.userId) return <Navigate to={home} replace />;

  const submit = (event) => {
    event.preventDefault();
    const message = signInPortal(portal, email, password);
    if (message) {
      setError(message);
      return;
    }
    navigate(home);
  };

  return (
    <main className="sign-in-screen">
      <form className="card sign-in-card portal-login" onSubmit={submit}>
        <p className="muted">SaffoCare</p>
        <h1>{title}</h1>
        <p>{lead}</p>
        <Input label="Email" type="email" value={email} autoComplete="username" onChange={(event) => setEmail(event.target.value)} />
        <Input label="Password" type="password" value={password} autoComplete="current-password" error={error} onChange={(event) => { setPassword(event.target.value); setError(""); }} />
        <Button type="submit">Sign in</Button>
        <p className="portal-demo">Demo account: {account?.email} · password {account?.password}</p>
        {other && <Link to={other.to}>{other.label}</Link>}
      </form>
    </main>
  );
}
