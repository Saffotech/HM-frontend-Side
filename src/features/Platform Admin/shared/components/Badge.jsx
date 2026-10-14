import "./Badge.css";

const tones = {
  Success: "success",
  Failed: "danger",
};

export default function Badge({ children }) {
  const resolved = tones[children] || "neutral";
  return <span className={`badge badge-${resolved}`}>{children}</span>;
}
