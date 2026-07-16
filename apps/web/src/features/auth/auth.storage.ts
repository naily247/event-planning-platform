const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

type AccessTokenPayload = {
  sub: string;
  role: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
  type: 'access';
  iat?: number;
  exp?: number;
};

export function saveAuthTokens(tokens: { accessToken: string; refreshToken?: string }) {
  localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);

  if (tokens.refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
  }
}

export function getAccessToken() {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function getAccessTokenPayload(): AccessTokenPayload | null {
  const accessToken = getAccessToken();

  if (!accessToken) {
    return null;
  }

  try {
    const [, encodedPayload] = accessToken.split('.');

    if (!encodedPayload) {
      return null;
    }

    const normalizedPayload = encodedPayload.replaceAll('-', '+').replaceAll('_', '/');

    const paddedPayload = normalizedPayload.padEnd(
      Math.ceil(normalizedPayload.length / 4) * 4,
      '=',
    );

    const payload = JSON.parse(
      decodeURIComponent(
        Array.from(atob(paddedPayload))
          .map((character) => `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`)
          .join(''),
      ),
    ) as Partial<AccessTokenPayload>;

    if (
      typeof payload.sub !== 'string' ||
      !['CUSTOMER', 'VENDOR', 'ADMIN'].includes(payload.role ?? '') ||
      payload.type !== 'access'
    ) {
      return null;
    }

    return payload as AccessTokenPayload;
  } catch {
    return null;
  }
}

export function getCurrentUserId() {
  return getAccessTokenPayload()?.sub ?? null;
}

export function clearAuthTokens() {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}
