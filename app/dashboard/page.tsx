import { PageShell } from '../../components/page-shell';

export default function DashboardPage() {
  return (
    <PageShell title="Dashboard">
      <p className="description">
        This page is part of the protected app experience. It is a good place for admin UI, charts, or user details.
      </p>
    </PageShell>
  );
}
