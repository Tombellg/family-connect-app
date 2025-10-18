interface ApiErrorPayload {
  message?: string;
  code?: string;
  details?: unknown;
}

const stringify = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }
  if (value && typeof value === 'object') {
    if ('message' in value && typeof (value as any).message === 'string') {
      return (value as any).message as string;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return undefined;
    }
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return undefined;
};

const formatDetails = (details: unknown): string | undefined => {
  if (!details) {
    return undefined;
  }
  if (Array.isArray(details)) {
    const formatted = details
      .map((detail) => {
        if (detail && typeof detail === 'object') {
          const path = 'path' in detail && typeof (detail as any).path === 'string' && (detail as any).path
            ? `${(detail as any).path}: `
            : '';
          const message = stringify(detail) ?? '';
          return `${path}${message}`.trim();
        }
        return stringify(detail);
      })
      .filter((item): item is string => Boolean(item));
    return formatted.length > 0 ? formatted.join('; ') : undefined;
  }
  return stringify(details);
};

export const extractErrorMessage = (payload: unknown, fallback: string): string => {
  if (!payload) {
    return fallback;
  }

  if (typeof payload === 'string') {
    return payload;
  }

  const { message, code, details } = payload as ApiErrorPayload;
  const parts: string[] = [];

  if (message) {
    parts.push(message);
  }

  if (code && !message) {
    parts.push(code);
  }

  const detailMessage = formatDetails(details);
  if (detailMessage) {
    parts.push(detailMessage);
  }

  if (parts.length === 0) {
    return fallback;
  }

  return parts.join(' — ');
};
