function formatIssue(issue) {
  const path = Array.isArray(issue.path) && issue.path.length ? `${issue.path.join('.')}: ` : '';
  return `${path}${issue.message || 'Invalid value'}`;
}

function formatErrorDetails(details) {
  if (!details) return '';
  if (typeof details === 'string') return details;
  if (Array.isArray(details)) {
    return details.map((detail) => (typeof detail === 'string' ? detail : formatIssue(detail))).join('; ');
  }
  if (typeof details === 'object') {
    if (details.message) return details.message;
    return JSON.stringify(details);
  }
  return String(details);
}

async function request(path, options = {}) {
  const { body, headers = {}, requiresAuth = false, ...fetchOptions } = options;
  let authorizationHeader = null;

  if (requiresAuth) {
    authorizationHeader = await getAuthorizationHeader();
    if (!authorizationHeader) throw new AuthRequiredError();
  }

  const send = () =>
    fetch(path, {
      ...fetchOptions,
      headers: {
        ...(body ? { 'Content-Type': 'application/json' } : {}),
        ...(authorizationHeader ? { Authorization: authorizationHeader } : {}),
        ...headers
      },
      body: body ? JSON.stringify(body) : undefined
    });

  let response = await send();

  if (response.status === 401 && requiresAuth) {
    clearAuthorizationHeader();
    authorizationHeader = await getAuthorizationHeader({ force: true });
    if (!authorizationHeader) throw new AuthRequiredError();
    response = await send();
  }

  return parseResponse(response);
}

async function parseResponse(response) {
  if (response.status === 204) return null;

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || 'Request failed';
    const details = formatErrorDetails(payload?.error?.details);
    const error = response.status === 401 ? new AuthRequiredError(message) : new Error(message);
    error.message = details ? `${message}: ${details}` : message;
    throw error;
  }

  return payload;
}

export class AuthRequiredError extends Error {
  constructor(message = 'Management login required') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

let authorizationProvider = async () => null;
let unauthorizedHandler = () => {};

export function configureAuth({ getAuthorizationHeader: provider, onUnauthorized } = {}) {
  authorizationProvider = provider || (async () => null);
  unauthorizedHandler = onUnauthorized || (() => {});
}

async function getAuthorizationHeader(options = {}) {
  return authorizationProvider(options);
}

function clearAuthorizationHeader() {
  unauthorizedHandler();
}

export const api = {
  async listRecipes({ search = '', tags = [], categories = [] } = {}) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (tags.length) params.set('tags', tags.join(','));
    if (categories.length) params.set('categories', categories.join(','));
    const query = params.toString();
    return request(`/api/recipes${query ? `?${query}` : ''}`);
  },
  async getRecipe(id) {
    return request(`/api/recipes/${id}`);
  },
  async createRecipe(recipe) {
    return request('/api/recipes', { method: 'POST', body: recipe, requiresAuth: true });
  },
  async updateRecipe(id, recipe) {
    return request(`/api/recipes/${id}`, { method: 'PUT', body: recipe, requiresAuth: true });
  },
  async translateRecipe(id, languages) {
    return request(`/api/recipes/${id}/translations`, {
      method: 'POST',
      body: { languages },
      requiresAuth: true
    });
  },
  async deleteRecipe(id) {
    return request(`/api/recipes/${id}`, { method: 'DELETE', requiresAuth: true });
  },
  async listTags() {
    return request('/api/tags');
  },
  async createTag(name) {
    return request('/api/tags', { method: 'POST', body: { name }, requiresAuth: true });
  },
  async importUrl(input) {
    return request('/api/imports/url', { method: 'POST', body: input, requiresAuth: true });
  },
  async importPhotos(input) {
    return request('/api/imports/photos', { method: 'POST', body: input, requiresAuth: true });
  },
  async getSettings() {
    return request('/api/settings', { requiresAuth: true });
  },
  async getPreferences() {
    return request('/api/preferences');
  },
  async updateSettings(settings) {
    return request('/api/settings', { method: 'PUT', body: settings, requiresAuth: true });
  },
  async verifyOpenAi(input) {
    return request('/api/settings/verify-openai', { method: 'POST', body: input, requiresAuth: true });
  },
  async exportBackup() {
    return request('/api/backups/export', { requiresAuth: true });
  },
  async importBackup(backup) {
    return request('/api/backups/import', { method: 'POST', body: backup, requiresAuth: true });
  },
  async getVersion() {
    return request('/api/version');
  }
};
