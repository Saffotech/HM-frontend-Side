import { useEffect, useRef, useState } from "react";
import { useLegalFinance } from "../context/LegalFinanceContext";
import Clip from "./Clip";

export default function CaseSelector() {
  const { cases, current, ws, selectCase } = useLegalFinance();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const box = useRef(null);

  useEffect(() => {
    const onDoc = (e) => box.current && !box.current.contains(e.target) && setOpen(false);
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const list = cases.filter((x) => !q || `${x.h} ${x.id} ${x.lead}`.toLowerCase().includes(q.toLowerCase()));
  if (!current) {
    return (
      <div className="cs">
        <button className="csb" type="button" disabled>
          <span className="hi2">{ws.ic}</span>
          <span className="cst"><b>No legal cases found</b><small>Waiting for an agreed hospital lead</small></span>
        </button>
      </div>
    );
  }
  return (
    <div className="cs" ref={box}>
      <button className="csb" onClick={() => setOpen((o) => !o)}>
        <span className="hi2">{ws.ic}</span>
        <span className="cst"><b><Clip passive>{current.h}</Clip></b><small>{current.id} · {current.city}</small></span>
        <span className="car">▾</span>
      </button>
      {open && (
        <div className="csp">
          <input autoFocus placeholder="Search by name or case ID" value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="csl">
            {list.map((x) => (
              <div key={x.id} className={"cso" + (x.id === current.id ? " on" : "")} onClick={() => { selectCase(x.id); setOpen(false); }}>
                <span className="hi2">{ws.ic}</span>
                <span className="cst"><b><Clip>{x.h}</Clip></b><small>{x.id} · {x.city}</small></span>
              </div>
            ))}
            {!list.length && <div className="mu" style={{ padding: 10 }}>No matches</div>}
          </div>
        </div>
      )}
    </div>
  );
}
