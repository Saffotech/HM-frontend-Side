import EmptyState from "./EmptyState";
import "./UnavailableFeature.css";

export default function UnavailableFeature({ title, message, action }) {
  return (
    <section className="unavailable-feature">
      <EmptyState title={title} message={message} action={action} />
    </section>
  );
}
