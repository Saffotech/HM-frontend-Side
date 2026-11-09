import { useLegalFinance } from "../context/LegalFinanceContext";

export default function ModalHost() {
  const { modal, closeModal } = useLegalFinance();
  if (!modal) return null;
  return (
    <div className="ov" onClick={(e) => e.target === e.currentTarget && closeModal()}>
      <div className={"md" + (modal.wide ? " wide" : "")}>{modal.node}</div>
    </div>
  );
}

// Standard modal body: title, content, Cancel + your action buttons.
export function ModalFrame({ title, children, actions }) {
  const { closeModal } = useLegalFinance();
  return (
    <>
      <h2>{title}</h2>
      {children}
      <div className="row" style={{ justifyContent: "flex-end", margin: "14px 0 0" }}>
        <button className="btn" onClick={closeModal}>Cancel</button>
        {actions}
      </div>
    </>
  );
}
