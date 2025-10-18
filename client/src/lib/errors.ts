interface ApiErrorPayload {
  message?: string;
  code?: string;
  details?: unknown;
  status?: number;
  timestamp?: string;
  requestId?: string;
}

export interface VerboseErrorContext {
  status?: number;
  statusText?: string;
  method?: string;
  url?: string;
  code?: string;
  responseData?: unknown;
}

const joinUrl = (baseURL?: string, url?: string): string | undefined => {
  if (!url && !baseURL) {
    return undefined;
  }

  if (!url) {
    return baseURL;
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  if (!baseURL) {
    return url;
  }

  const hasTrailingSlash = baseURL.endsWith('/');
  const hasLeadingSlash = url.startsWith('/');

  if (hasTrailingSlash && hasLeadingSlash) {
    return `${baseURL}${url.slice(1)}`;
  }

  if (!hasTrailingSlash && !hasLeadingSlash) {
    return `${baseURL}/${url}`;
  }

  return `${baseURL}${url}`;
};

const truncate = (value: string, max = 600): string => {
  if (value.length <= max) {
    return value;
  }
  return `${value.slice(0, Math.max(0, max - 1))}…`;
};

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

export const buildVerboseFallback = (fallback: string, context?: VerboseErrorContext): string => {
  if (!context) {
    return fallback;
  }

  const parts: string[] = [fallback];

  if (context.code) {
    parts.push(`code ${context.code}`);
  }

  if (typeof context.status === 'number') {
    const statusText = context.statusText ? ` ${context.statusText}` : '';
    parts.push(`HTTP ${context.status}${statusText}`.trim());
  } else if (context.statusText) {
    parts.push(context.statusText);
  }

  if (context.method || context.url) {
    const method = context.method ? context.method.toUpperCase() : undefined;
    const request = [method, context.url].filter(Boolean).join(' ');
    if (request) {
      parts.push(`requête ${request}`);
    }
  }

  if (context.responseData !== undefined) {
    const responseDetails = stringify(context.responseData);
    if (responseDetails) {
      parts.push(`réponse: ${truncate(responseDetails)}`);
    }
  }

  return parts.join(' — ');
};

export const extractErrorMessage = (payload: unknown, fallback: string): string => {
  if (!payload) {
    return fallback;
  }

  if (typeof payload === 'string') {
    return payload;
  }

  const { message, code, details, status, timestamp, requestId } = payload as ApiErrorPayload;
  const parts: string[] = [];

  if (code) {
    parts.push(`[${code}]`);
  }

  if (message) {
    parts.push(message);
  }

  const detailMessage = formatDetails(details);
  if (detailMessage) {
    parts.push(detailMessage);
  }

  const meta: string[] = [];
  if (typeof status === 'number') {
    meta.push(`statut ${status}`);
  }
  if (requestId) {
    meta.push(`requête ${requestId}`);
  }
  if (timestamp) {
    meta.push(`horodatage ${timestamp}`);
  }

  if (meta.length > 0) {
    parts.push(`(${meta.join(', ')})`);
  }

  if (parts.length === 0) {
    return fallback;
  }

  return parts.join(' — ');
};

export const extractAxiosErrorContext = (error: any): VerboseErrorContext | undefined => {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const config = 'config' in error && error.config && typeof error.config === 'object' ? error.config : undefined;
  const response = 'response' in error && error.response && typeof error.response === 'object' ? error.response : undefined;

  const method = config && typeof config.method === 'string' ? config.method : undefined;
  const baseURL = config && typeof config.baseURL === 'string' ? config.baseURL : undefined;
  const url = config && typeof config.url === 'string' ? config.url : undefined;
  const code = typeof (error as any).code === 'string' ? (error as any).code : undefined;

  const status = response && typeof (response as any).status === 'number' ? (response as any).status : undefined;
  const statusText = response && typeof (response as any).statusText === 'string' ? (response as any).statusText : undefined;
  const data = response && 'data' in response ? (response as any).data : undefined;

  return {
    status,
    statusText,
    method,
    url: joinUrl(baseURL, url),
    code,
    responseData: data,
  };
};

export const extractAxiosErrorPayload = (error: any): unknown => {
  if (!error || typeof error !== 'object') {
    return error;
  }

  const response = 'response' in error && error.response && typeof error.response === 'object' ? error.response : undefined;
  if (response && 'data' in response) {
    const data = (response as any).data;
    if (data && typeof data === 'object' && 'error' in data) {
      return (data as any).error;
    }
    return data;
  }

  if (typeof (error as any).toJSON === 'function') {
    try {
      return (error as any).toJSON();
    } catch {
      // ignore
    }
  }

  if ('message' in error && typeof (error as any).message === 'string') {
    return (error as any).message;
  }

  return error;
};
