const STORAGE_PREFIX = "saffocare.crm.auto-created-email-activity.v1";

function storageKey(userId) {
  return `${STORAGE_PREFIX}:${String(userId)}`;
}

function readSuppressed(storage, userId) {
  try {
    const value = storage?.getItem(storageKey(userId));
    const parsed = value ? JSON.parse(value) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/** Store only the exact activity ID returned by the automatic post-create email save. */
export function rememberAutoCreatedHospitalEmailActivity(leadId, created, updated, userId, storage) {
  if (leadId == null || userId == null) return false;

  const createdIds = new Set((created?.activity || []).map((entry) => String(entry.id)));
  const added = (updated?.activity || []).filter((entry) => !createdIds.has(String(entry.id)));
  if (
    added.length !== 1
    || added[0]?.id == null
    || added[0]?.method !== "Details updated"
    || String(added[0]?.note || "").trim() !== "Updated hospital email."
  ) return false;

  try {
    const targetStorage = storage ?? globalThis.localStorage;
    if (!targetStorage) return false;
    const suppressed = readSuppressed(targetStorage, userId);
    const key = String(leadId);
    const ids = new Set(Array.isArray(suppressed[key]) ? suppressed[key].map(String) : []);
    ids.add(String(added[0].id));
    targetStorage.setItem(storageKey(userId), JSON.stringify({ ...suppressed, [key]: [...ids] }));
    return true;
  } catch {
    return false;
  }
}

export function isAutoCreatedHospitalEmailActivity(leadId, activityId, userId, storage) {
  if (leadId == null || activityId == null || userId == null) return false;
  let targetStorage = storage;
  if (!targetStorage) {
    try {
      targetStorage = globalThis.localStorage;
    } catch {
      return false;
    }
  }
  const suppressed = readSuppressed(targetStorage, userId);
  return Array.isArray(suppressed[String(leadId)])
    && suppressed[String(leadId)].some((id) => String(id) === String(activityId));
}
