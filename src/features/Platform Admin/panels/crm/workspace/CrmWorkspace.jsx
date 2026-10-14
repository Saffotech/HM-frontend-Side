import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePlatform } from "../../../shared/context/PlatformContext";
import { useToast } from "../../../shared/hooks/useToast";
import { crmPath } from "../../../shared/paths";
import { todayInput } from "../../../shared/utils/formatDate";
import AddLeadForm from "../components/AddLeadForm";
import { CLAIM_LIMIT, CONTACT_OUTCOMES, isUnclaimed } from "../utils/crmLeads";
import { AgreeDialog, CloseDialog, ContactDialog, EditLeadDialog, ReopenDialog, ScheduleDialog } from "./CrmDialogs";
import { WorkspaceContext } from "./workspace-context";

const outcomeLabel = (value) => CONTACT_OUTCOMES.find(([key]) => key === value)?.[1] || "";
const BLOCKED = "This lead can't be changed. It may have been reassigned or its status has changed.";

/** Holds the signed-in employee's leads plus the dialogs every CRM page shares. */
export default function CrmWorkspace({ children }) {
  const platform = usePlatform();
  const { onboarding, hospitals, plans, crmSession } = platform;
  const { push } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const me = crmSession?.name || "";
  const today = todayInput();
  const [dialog, setDialog] = useState(null);
  const [adding, setAdding] = useState(false);

  const leads = useMemo(() => onboarding.filter((lead) => lead.assignedTo === me), [onboarding, me]);
  const pool = useMemo(() => onboarding.filter(isUnclaimed).sort((a, b) => String(b.submittedAt).localeCompare(String(a.submittedAt))), [onboarding]);
  const uncontacted = leads.filter((lead) => lead.status === "New").length;
  const planOptions = useMemo(() => plans.filter((plan) => plan.status === "Active").map((plan) => plan.name), [plans]);
  const find = (id) => leads.find((lead) => lead.id === id) || null;
  const dialogLead = dialog ? find(dialog.id) : null;

  const report = (ok, message) => {
    push(ok ? message : BLOCKED, ok ? "success" : "error");
    return ok;
  };
  const closeDialog = () => setDialog(null);

  const openLead = (id, { replace = false } = {}) => {
    navigate(crmPath(`/leads/${encodeURIComponent(id)}`), {
      replace,
      state: replace ? undefined : { from: `${location.pathname}${location.search}` },
    });
  };

  const claim = (lead) => {
    if (uncontacted >= CLAIM_LIMIT) {
      push(`You already have ${CLAIM_LIMIT} new leads you haven't contacted. Contact one of them before claiming more.`, "error");
      return false;
    }
    if (!platform.claimOnboarding(lead.id)) {
      push(`${lead.hospitalName} has already been claimed by someone else.`, "error");
      return false;
    }
    push(`${lead.hospitalName} is now yours. Contact details are unlocked.`, "success");
    openLead(lead.id);
    return true;
  };

  const actions = {
    openLead,
    claim,
    logContact: (lead, mode = "log") => setDialog({ type: "contact", id: lead.id, mode }),
    schedule: (lead) => setDialog({ type: "schedule", id: lead.id }),
    agree: (lead) => setDialog({ type: "agree", id: lead.id }),
    close: (lead) => setDialog({ type: "close", id: lead.id }),
    reopen: (lead) => setDialog({ type: "reopen", id: lead.id }),
    edit: (lead) => setDialog({ type: "edit", id: lead.id }),
    addLead: () => setAdding(true),
    note: (lead, text) => report(platform.addOnboardingNote(lead.id, text), "Note added."),
  };

  const saveContact = (values) => {
    const lead = dialogLead;
    const outcome = outcomeLabel(values.outcome);
    const closing = values.outcome === "not-interested";
    const keepsGoing = values.outcome === "interested" || values.outcome === "callback";
    const ok = platform.logOnboardingContact(lead.id, {
      method: values.method,
      note: values.note,
      outcome,
      followUpDate: keepsGoing ? values.followUpDate : "",
      nextAction: keepsGoing ? values.nextAction : "",
      notInterestedReason: closing ? values.reason : "",
    });
    if (!report(ok, closing ? `${lead.hospitalName} closed as not interested.` : `Contact logged for ${lead.hospitalName}.`)) {
      closeDialog();
      return;
    }
    if (values.outcome === "agreed") setDialog({ type: "agree", id: lead.id });
    else closeDialog();
  };

  const run = (ok, message) => {
    report(ok, message);
    closeDialog();
  };

  const value = { me, today, leads, pool, uncontacted, hospitals, invoices: platform.invoices, planOptions, actions };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
      {dialogLead && dialog.type === "contact" && (
        <ContactDialog key={dialogLead.id} lead={dialogLead} mode={dialog.mode} today={today} onCancel={closeDialog} onSubmit={saveContact} />
      )}
      {dialogLead && dialog.type === "schedule" && (
        <ScheduleDialog
          lead={dialogLead}
          today={today}
          onCancel={closeDialog}
          onSubmit={(values) => run(platform.scheduleOnboardingFollowUp(dialogLead.id, values), `Follow-up ${dialogLead.followUpDate ? "rescheduled" : "scheduled"} for ${dialogLead.hospitalName}.`)}
        />
      )}
      {dialogLead && dialog.type === "agree" && (
        <AgreeDialog
          lead={dialogLead}
          planOptions={planOptions}
          onCancel={closeDialog}
          onSubmit={(values) => run(platform.agreeOnboarding(dialogLead.id, values), `${dialogLead.hospitalName} sent to Accounts for registration.`)}
        />
      )}
      {dialogLead && dialog.type === "close" && (
        <CloseDialog
          lead={dialogLead}
          onCancel={closeDialog}
          onSubmit={(values) => run(platform.closeOnboarding(dialogLead.id, values), `${dialogLead.hospitalName} closed as not interested.`)}
        />
      )}
      {dialogLead && dialog.type === "reopen" && (
        <ReopenDialog
          lead={dialogLead}
          onCancel={closeDialog}
          onConfirm={() => run(platform.reopenOnboarding(dialogLead.id), `${dialogLead.hospitalName} reopened.`)}
        />
      )}
      {dialogLead && dialog.type === "edit" && (
        <EditLeadDialog
          lead={dialogLead}
          planOptions={planOptions}
          onCancel={closeDialog}
          onSubmit={(values) => run(platform.updateOnboardingLead(dialogLead.id, values), "Lead details saved.")}
        />
      )}
      {adding && (
        <AddLeadForm
          leads={onboarding}
          hospitals={hospitals}
          me={me}
          planOptions={planOptions}
          onClose={() => setAdding(false)}
          onOpenExisting={(id) => { setAdding(false); openLead(id); }}
          onClaim={(id) => {
            const lead = pool.find((item) => item.id === id);
            if (lead && claim(lead)) setAdding(false);
          }}
          onCreate={(input, { shared }) => {
            const created = platform.addOnboardingLead(input, { shared });
            setAdding(false);
            if (shared) {
              push(`${created.hospitalName} added to New enquiries for the team to claim.`, "success");
              navigate(`${crmPath("/leads")}?tab=New`);
              return;
            }
            push(`${created.hospitalName} added as a new lead.`, "success");
            openLead(created.id);
          }}
        />
      )}
    </WorkspaceContext.Provider>
  );
}
