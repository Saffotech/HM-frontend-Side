import { useRef, useState } from "react";
import { Camera, Mail, Phone, ShieldCheck, Trash2 } from "lucide-react";
import Button from "../../../../shared/components/Button";
import Input from "../../../../shared/components/Input";
import Select from "../../../../shared/components/Select";
import { usePlatform } from "../../../../shared/context/PlatformContext";
import { useToast } from "../../../../shared/hooks/useToast";
import { photoIssue, resizePhoto } from "../../../../shared/utils/photo";
import { initials, isEmail, required } from "../../../../shared/utils/validation";
import "./MyProfile.css";

export default function MyProfile() {
  const { profile, saveProfile } = usePlatform();
  const { push } = useToast();
  const [form, setForm] = useState(profile);
  const fileRef = useRef(null);

  const set = (key, value) => setForm({ ...form, [key]: value });

  const save = (event) => {
    event.preventDefault();
    if (!required(form.name) || !isEmail(form.email)) {
      push("Enter your name and a valid email.", "error");
      return;
    }
    saveProfile({ ...form, photo: profile.photo });
    push("Profile saved.", "success");
  };

  const choosePhoto = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const issue = photoIssue(file);
    if (issue) {
      push(issue, "error");
      return;
    }
    try {
      const photo = await resizePhoto(file);
      saveProfile({ ...profile, photo });
      setForm((current) => ({ ...current, photo }));
      push("Profile photo updated.", "success");
    } catch {
      push("That image could not be read. Try another file.", "error");
    }
  };

  const removePhoto = () => {
    saveProfile({ ...profile, photo: "" });
    setForm((current) => ({ ...current, photo: "" }));
    push("Profile photo removed.", "success");
  };

  return (
    <section className="profile-page">
      <form className="profile-layout" onSubmit={save}>
        <aside className="profile-card">
          <div className="profile-cover" />
          <div className="profile-avatar-wrap">
            <div className="profile-avatar">
              {profile.photo
                ? <img src={profile.photo} alt={`${form.name} profile`} />
                : <span aria-hidden="true">{initials(form.name)}</span>}
            </div>
            <button
              type="button"
              className="profile-avatar-edit"
              onClick={() => fileRef.current?.click()}
              aria-label="Change profile photo"
              title="Change photo"
            >
              <Camera size={15} />
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden onChange={choosePhoto} />
          </div>

          <div className="profile-identity">
            <strong>{form.name || "—"}</strong>
            <span className="profile-role"><ShieldCheck size={13} aria-hidden="true" />{form.role}</span>
          </div>

          <ul className="profile-contact">
            <li><Mail size={14} aria-hidden="true" /><span>{form.email || "—"}</span></li>
            <li><Phone size={14} aria-hidden="true" /><span>{form.phone || "—"}</span></li>
          </ul>

          <div className="profile-photo-actions">
            <button type="button" className="action-link" onClick={() => fileRef.current?.click()}>
              {profile.photo ? "Change photo" : "Upload photo"}
            </button>
            {profile.photo && (
              <button type="button" className="action-link danger" onClick={removePhoto}>
                <Trash2 size={13} aria-hidden="true" />Remove
              </button>
            )}
          </div>
        </aside>

        <section className="profile-panel">
          <header className="profile-panel-head">
            <h2>Profile information</h2>
          </header>

          <div className="profile-section">
            <h3>Personal details</h3>
            <div className="profile-grid">
              <Input label="Full name" value={form.name} onChange={(event) => set("name", event.target.value)} />
              <Input label="Email" type="email" value={form.email} onChange={(event) => set("email", event.target.value)} />
              <Input label="Phone" value={form.phone} onChange={(event) => set("phone", event.target.value)} />
              <Input label="Role" value={form.role} readOnly className="profile-readonly" />
            </div>
          </div>

          <div className="profile-section">
            <h3>Preferences</h3>
            <div className="profile-grid">
              <Select label="Display density" value={form.density} onChange={(event) => set("density", event.target.value)}>
                <option>Comfortable</option>
                <option>Compact</option>
              </Select>
            </div>
          </div>

          <footer className="profile-footer">
            <Button variant="secondary" onClick={() => setForm(profile)}>Reset</Button>
            <Button type="submit">Save profile</Button>
          </footer>
        </section>
      </form>
    </section>
  );
}
