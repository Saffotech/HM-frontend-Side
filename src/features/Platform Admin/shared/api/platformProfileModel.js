const PROFILE_FIELDS = [
  ["phone", "phone"],
  ["phone_code", "phoneCode"],
  ["address", "address"],
  ["city", "city"],
  ["state", "state"],
  ["postal_code", "postalCode"],
  ["job_title", "jobTitle"],
];

const PROFILE_KEYS = new Set([
  "phone",
  "phone_code",
  "address",
  "city",
  "state",
  "postal_code",
  "job_title",
  "profile_image_url",
  "email",
  "first_name",
  "last_name",
  "user_id",
  "role",
]);

const PHOTO_BYTES = 5 * 1024 * 1024;

export function profileDraft(profile) {
  return {
    phone: profile?.phone || "",
    phoneCode: profile?.phoneCode || profile?.phone_code || "",
    address: profile?.address || "",
    city: profile?.city || "",
    state: profile?.state || "",
    postalCode: profile?.postalCode || profile?.postal_code || "",
    jobTitle: profile?.jobTitle || profile?.job_title || "",
  };
}

/** PATCH body of changed profile fields. Email, role, and permissions are never included. */
export function profileUpdateBody(current, draft) {
  const base = profileDraft(current);
  const body = {};
  PROFILE_FIELDS.forEach(([apiField, formField]) => {
    const next = String(draft?.[formField] ?? "").trim();
    const previous = String(base[formField] ?? "").trim();
    if (next !== previous) body[apiField] = next;
  });
  return body;
}

export function mapPlatformAdminProfile(body, resolveUrl = (url) => url || "") {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  if (![...PROFILE_KEYS].some((key) => key in body)) return null;
  const name = [body.first_name, body.last_name].filter(Boolean).join(" ").trim();
  return {
    ...profileDraft(body),
    photoUrl: resolveUrl(body.profile_image_url || ""),
    email: body.email || "",
    role: body.role || "",
    name,
    userId: body.user_id,
  };
}

export function platformPasswordBody(currentPassword, newPassword) {
  return {
    current_password: currentPassword,
    new_password: newPassword,
  };
}

export function platformPasswordIssue(currentPassword, newPassword) {
  const errors = {};
  if (!currentPassword) errors.current_password = "Enter your current password.";
  if (!newPassword) errors.new_password = "Enter a new password.";
  else if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
    errors.new_password = "Use at least 8 characters, with one letter and one number.";
  } else if (newPassword === currentPassword) {
    errors.new_password = "Choose a password different from the current password.";
  }
  return errors;
}

export function platformPhotoIssue(file) {
  if (!file) return "Choose a photo.";
  const name = String(file.name || "").toLowerCase();
  const type = String(file.type || "").toLowerCase();
  const allowedType = type === "image/jpeg" || type === "image/jpg" || type === "image/png" || type === "image/webp";
  const allowedName = /\.(jpe?g|png|webp)$/.test(name);
  if (!allowedType && !allowedName) return "Use a JPG, JPEG, PNG, or WEBP image.";
  if (file.size > PHOTO_BYTES) return "Photo must be 5 MB or smaller.";
  return "";
}
