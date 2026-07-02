export default function AdminPageHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <header className="admin-page__head admin-page__head--row">
      <div className="admin-page__head-text">
        {eyebrow ? <span className="admin-page__eyebrow">{eyebrow}</span> : null}
        <h1 className="admin-page__title">{title}</h1>
        {subtitle ? <p className="admin-page__subtitle">{subtitle}</p> : null}
      </div>
      {actions ? <div className="admin-page__actions">{actions}</div> : null}
    </header>
  );
}
