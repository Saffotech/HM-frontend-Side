import { AlertCircle } from "lucide-react";
import { usePlatformMe } from "../../../../shared/hooks/usePlatformMe";
import { formatDateTime } from "../../../../shared/utils/formatDate";
import "./MyProfile.css";

export default function MyProfile() {
  const { profile, error, loading } = usePlatformMe("platform");

  if (loading && !profile) {
    return (
      <section className="card card-pad">
        <p>Loading your profile from the server.</p>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="card card-pad">
        <p role="alert">{error || "Your profile could not be loaded."}</p>
      </section>
    );
  }

  return (
    <section className="card card-pad">
      <h2>My Profile</h2>
      {error && (
        <p className="panel-copy" role="alert">
          <AlertCircle size={14} aria-hidden="true" /> {error} Showing the signed-in session only.
        </p>
      )}
      <dl>
        <div><dt>Name</dt><dd>{profile.name || "—"}</dd></div>
        <div><dt>Email</dt><dd>{profile.email || "—"}</dd></div>
        <div><dt>Role</dt><dd>{profile.role || "—"}</dd></div>
        <div><dt>User ID</dt><dd>{profile.userId ?? "—"}</dd></div>
        <div><dt>Created</dt><dd>{profile.createdAt ? formatDateTime(profile.createdAt) : "—"}</dd></div>
      </dl>
      <p className="panel-copy">
        Profile edits, password changes, and photo uploads are unavailable. There is no platform profile update API. GET /auth/me is used for this page.
      </p>
    </section>
  );
}
