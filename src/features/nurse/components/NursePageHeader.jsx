export default function NursePageHeader({ title, actions }) {
  return (
    <div className="nurse-page-header">
      <h1>{title}</h1>
      {actions && <div className="nurse-page-header__actions">{actions}</div>}
    </div>
  );
}
