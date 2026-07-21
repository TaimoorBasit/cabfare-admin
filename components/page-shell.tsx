import { SiteHeader } from './site-header';

type PageShellProps = {
  title: string;
  children: React.ReactNode;
};

export function PageShell({ title, children }: PageShellProps) {
  return (
    <main>
      <SiteHeader title={title} />
      {children}
    </main>
  );
}
