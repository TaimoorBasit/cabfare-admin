import { apiConfig } from './config';

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const defaultApiUrl = process.env.NODE_ENV === 'production'
  ? 'https://cabfare-backend.mohammad-taimoor855.workers.dev'
  : 'http://localhost:5000';

export const API_BASE_URL = (configuredApiUrl || defaultApiUrl).replace(/\/+$/, '');

export async function fetchHello() {
  const res = await fetch(`${apiConfig.baseUrl}/api/hello`);
  if (!res.ok) {
    throw new Error('Failed to fetch hello API');
  }
  return res.json();
}
