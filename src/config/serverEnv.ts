export function getRequiredServerEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value || /^(change[-_ ]?me|placeholder|your[-_ ]|my_)/i.test(value)) {
    throw new Error(`Missing required server environment variable: ${name}`);
  }
  return value;
}

export function getJwtSecret(): string {
  return getRequiredServerEnv('JWT_SECRET');
}
