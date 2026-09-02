export const parseBearerToken = (header: string | undefined): string => {
  const [scheme, token, extra] = header?.trim().split(/\s+/) ?? [];
  if (scheme?.toLowerCase() !== 'bearer' || token === undefined || extra !== undefined) {
    throw new Error('A single bearer token is required');
  }
  return token;
};
