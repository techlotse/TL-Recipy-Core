async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });

  if (response.status === 204) return null;

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || 'Request failed';
    const details = payload?.error?.details;
    throw new Error(details ? `${message}: ${details}` : message);
  }

  return payload;
}

export const api = {
  async listRecipes({ search = '', tags = [] } = {}) {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (tags.length) params.set('tags', tags.join(','));
    const query = params.toString();
    return request(`/api/recipes${query ? `?${query}` : ''}`);
  },
  async getRecipe(id) {
    return request(`/api/recipes/${id}`);
  },
  async createRecipe(recipe) {
    return request('/api/recipes', { method: 'POST', body: recipe });
  },
  async deleteRecipe(id) {
    return request(`/api/recipes/${id}`, { method: 'DELETE' });
  },
  async listTags() {
    return request('/api/tags');
  },
  async createTag(name) {
    return request('/api/tags', { method: 'POST', body: { name } });
  },
  async importUrl(input) {
    return request('/api/imports/url', { method: 'POST', body: input });
  },
  async getSettings() {
    return request('/api/settings');
  },
  async updateSettings(settings) {
    return request('/api/settings', { method: 'PUT', body: settings });
  },
  async verifyOpenAi(input) {
    return request('/api/settings/verify-openai', { method: 'POST', body: input });
  },
  async exportBackup() {
    return request('/api/backups/export');
  },
  async importBackup(backup) {
    return request('/api/backups/import', { method: 'POST', body: backup });
  },
  async getVersion() {
    return request('/api/version');
  }
};
