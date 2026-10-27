/** CORS_ORIGIN: comma-separated list of origins, or "*" while setting up the deploy. */
export function corsOrigins(): string | string[] {
  const value = (process.env.CORS_ORIGIN ?? 'http://localhost:3000').trim();
  return value === '*' ? '*' : value.split(',').map((o) => o.trim());
}
