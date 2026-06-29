/** Normalize list query results (array vs paginated page object). */

export function asPatientList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.patients ?? [];
}

export function asPatientPageMeta(data) {
  if (!data || Array.isArray(data)) {
    const list = asPatientList(data);
    return { total: list.length, page: 1, totalPages: 1, limit: list.length };
  }
  return {
    total: data.total ?? 0,
    page: data.page ?? 1,
    totalPages: data.totalPages ?? 1,
    limit: data.limit ?? 20,
  };
}

export function asAppointmentList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.appointments ?? [];
}

export function asAppointmentPageMeta(data) {
  if (!data || Array.isArray(data)) {
    const list = asAppointmentList(data);
    return { total: list.length, page: 1, totalPages: 1, limit: list.length };
  }
  return {
    total: data.total ?? 0,
    page: data.page ?? 1,
    totalPages: data.totalPages ?? 1,
    limit: data.limit ?? 20,
  };
}

export function asBillList(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  return data.bills ?? [];
}

export function asBillPageMeta(data) {
  if (!data || Array.isArray(data)) {
    const list = asBillList(data);
    return { total: list.length, page: 1, totalPages: 1, limit: list.length };
  }
  return {
    total: data.total ?? 0,
    page: data.page ?? 1,
    totalPages: data.totalPages ?? 1,
    limit: data.limit ?? 20,
  };
}
