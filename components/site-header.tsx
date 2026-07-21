import Link from 'next/link';

type SiteHeaderProps = {
  title: string;
};

export function SiteHeader({ title }: SiteHeaderProps) {
  return (
    <header style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>{title}</h1>
        <nav>
          <Link href="/">Home</Link>
          {' | '}
          <Link href="/dashboard">Dashboard</Link>
          {' | '}
          <Link href="/auth/login">Login</Link>
        </nav>
      </div>
    </header>
  );
}
