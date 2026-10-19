import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { signInPlatformPortal } from "../api/platformAuth";
import { portalSessionIsAuthenticated } from "../api/platformSession";
import Button from "../components/Button";
import Input from "../components/Input";
import { usePlatform } from "../context/PlatformContext";
import "../layout/AppShell.css";
import "./PortalLogin.css";

export default function PortalLogin({ portal, title, lead, home, other }) {
  const { sessionFor, openPortalSession } = usePlatform();
  const session = sessionFor(portal);
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (portalSessionIsAuthenticated(portal, session)) return <Navigate to={home} replace />;

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const profile = await signInPlatformPortal(portal, email, password);
      openPortalSession(portal, profile);
      navigate(home);
    } catch (err) {
      setError(err.message || "Could not sign in.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="sign-in-screen">
      <form className="card sign-in-card portal-login" onSubmit={submit}>
        <p className="muted">SaffoCare</p>
        <h1>{title}</h1>
        <p>{lead}</p>
        <Input label="Email" type="email" value={email} autoComplete="username" onChange={(event) => setEmail(event.target.value)} />
        <Input label="Password" type="password" value={password} autoComplete="current-password" error={error} onChange={(event) => { setPassword(event.target.value); setError(""); }} />
        <Button type="submit" disabled={submitting}>{submitting ? "Signing in…" : "Sign in"}</Button>
        <p className="portal-demo">Sign in with your platform account. A password stored in this browser is not a backend session.</p>
        {other && <Link to={other.to}>{other.label}</Link>}
      </form>
    </main>
  );
}
