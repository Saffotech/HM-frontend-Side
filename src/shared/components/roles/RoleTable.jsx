export default function RoleTable({ roles, loading, error }) {
  if (loading) return <p>Loading roles…</p>;
  if (error) return <p className="error">{error}</p>;
  if (!roles?.length) return <p>No roles found.</p>;

  return (
    <table className="role-table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Name</th>
          <th>Description</th>
        </tr>
      </thead>
      <tbody>
        {roles.map((role) => (
          <tr key={role.id}>
            <td>{role.id}</td>
            <td>{role.name}</td>
            <td>{role.description || '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
