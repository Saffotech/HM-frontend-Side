import { Link } from "react-router-dom";
import Button from "../../../shared/components/Button";
import { PLATFORM_BASE } from "../../../shared/paths";

export default function NotFound() {
  return (
    <section className="card card-pad">
      <p className="muted" style={{ marginBottom: 14 }}>That address is not part of the SaffoCare platform admin.</p>
      <Link to={PLATFORM_BASE}><Button>Back to dashboard</Button></Link>
    </section>
  );
}
