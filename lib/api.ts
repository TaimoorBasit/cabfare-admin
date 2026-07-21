import { apiConfig } from './config';

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export async function fetchHello() {
  const res = await fetch(`${apiConfig.baseUrl}/api/hello`);
  if (!res.ok) {
    throw new Error('Failed to fetch hello API');
  }
  return res.json();
}
