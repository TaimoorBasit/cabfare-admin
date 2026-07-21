import Link from 'next/link';

type ApiCardProps = {
  title: string;
  href: string;
  description: string;
};

export function ApiCard({ title, href, description }: ApiCardProps) {
  return (
    <Link className="card" href={href}>
      <h2>{title}</h2>
      <p>{description}</p>
    </Link>
  );
}
