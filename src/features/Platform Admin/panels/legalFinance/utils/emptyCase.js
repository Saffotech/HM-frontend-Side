/** Blank case shape so the review screens can render before CRM opens a case. */
export function emptyLegalCase() {
  return {
    id: null,
    empty: true,
    lead: "",
    h: "",
    city: "",
    plan: "",
    disc: 0,
    st: "",
    esc: "",
    pay: false,
    readyToRegister: false,
    fr: false,
    fin: null,
    docs: [],
    cl: [],
    dec: null,
    cond: null,
  };
}
