import { apiConfig } from './config';

const defaultApiUrl = process.env.NODE_ENV === 'production'
  ? 'https://cabfare-backend.mohammad-taimoor855.workers.dev'
  : 'http://localhost:5000';
const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

export const API_BASE_URL = (process.env.NODE_ENV === 'production' ? defaultApiUrl : configuredApiUrl || defaultApiUrl).replace(/\/+$/, '');

export async function fetchHello() {
  const res = await fetch(`${apiConfig.baseUrl}/api/hello`);
  if (!res.ok) {
    throw new Error('Failed to fetch hello API');
  }
  return res.json();
}
