import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  Clock3,
  DatabaseBackup,
  Download,
  Gauge,
  Image,
  KeyRound,
  Layers,
  Link as LinkIcon,
  Loader2,
  Plus,
  Save,
  Search,
  ServerCog,
  Settings,
  ShieldCheck,
  Tags,
  Trash2,
  UploadCloud,
  Utensils
} from 'lucide-react';
import { api } from './api.js';

const emptyIngredient = { name: '', quantity: '', unit: '', notes: '' };
const emptyStep = { text: '' };
const isAdminUser = true;
const MAX_IMPORT_PHOTOS = 5;
const MAX_IMPORT_PHOTO_BYTES = 4 * 1024 * 1024;
const IMPORT_PHOTO_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function getRoute() {
  const hash = window.location.hash.replace(/^#/, '');
  return hash || '/recipes';
}

function navigate(path) {
  window.location.hash = path;
}

function useRoute() {
  const [route, setRoute] = useState(getRoute());
  useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);
  return route;
}

function minutesLabel(minutes) {
  if (minutes === null || minutes === undefined) return '';
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} h ${remainder} min` : `${hours} h`;
}

function numberLabel(value) {
  return new Intl.NumberFormat('en').format(value || 0);
}

function moneyLabel(value) {
  return new Intl.NumberFormat('en', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 4,
    maximumFractionDigits: 6
  }).format(value || 0);
}

function fileSizeLabel(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function tagNames(recipe) {
  return (recipe.tags || []).map((tag) => (typeof tag === 'string' ? tag : tag.name));
}

function TagPill({ tag, selected = false, onClick }) {
  const label = typeof tag === 'string' ? tag : tag.name;
  return (
    <button
      className={`tag-pill ${selected ? 'selected' : ''}`}
      type="button"
      onClick={onClick}
      title={`Filter by ${label}`}
    >
      {label}
    </button>
  );
}

function StatusMessage({ loading, error, empty, emptyText }) {
  if (loading) {
    return (
      <div className="state">
        <Loader2 className="spin" size={18} />
        Loading
      </div>
    );
  }
  if (error) return <div className="state error">{error}</div>;
  if (empty) return <div className="state">{emptyText}</div>;
  return null;
}

function TimeMeta({ recipe }) {
  const active = minutesLabel(recipe.activeTimeMinutes);
  const total = minutesLabel(recipe.totalTimeMinutes);
  if (!active && !total) return null;

  return (
    <div className="time-meta">
      <Clock3 size={15} />
      {active && <span>Active {active}</span>}
      {total && <span>Total {total}</span>}
    </div>
  );
}

function LlmUsageCard({ usage }) {
  if (!usage) return null;

  return (
    <section className="content-block usage-card">
      <h2>LLM usage</h2>
      <div className="metric-grid">
        <div>
          <span>Model</span>
          <strong>{usage.model}</strong>
        </div>
        <div>
          <span>Input tokens</span>
          <strong>{numberLabel(usage.inputTokens)}</strong>
        </div>
        <div>
          <span>Output tokens</span>
          <strong>{numberLabel(usage.outputTokens)}</strong>
        </div>
        <div>
          <span>Response time</span>
          <strong>{numberLabel(usage.responseMs)} ms</strong>
        </div>
        <div>
          <span>Estimated cost</span>
          <strong>{moneyLabel(usage.totalCostUsd)}</strong>
        </div>
        {usage.imageCount > 0 && (
          <div>
            <span>Step images</span>
            <strong>
              {numberLabel(usage.imageCount)} · {moneyLabel(usage.imageCostUsd)}
            </strong>
          </div>
        )}
      </div>
    </section>
  );
}

function RecipeImage({ recipe }) {
  if (recipe.imageUrl) {
    return <img src={recipe.imageUrl} alt="" loading="lazy" />;
  }

  return (
    <div className="image-placeholder" aria-hidden="true">
      <Utensils size={32} />
    </div>
  );
}

function RecipeCard({ recipe }) {
  return (
    <a className="recipe-card" href={`#/recipes/${recipe.id}`}>
      <div className="recipe-card-image">
        <RecipeImage recipe={recipe} />
      </div>
      <div className="recipe-card-body">
        <h3>{recipe.title}</h3>
        <p>{recipe.shortDescription || 'No short description yet.'}</p>
        <TimeMeta recipe={recipe} />
        <div className="tag-row">
          {tagNames(recipe)
            .slice(0, 4)
            .map((tag) => (
              <span className="tag-chip" key={tag}>
                {tag}
              </span>
            ))}
        </div>
      </div>
    </a>
  );
}

function AppNav({ route }) {
  const items = [
    { path: '/recipes', label: 'Recipes', icon: Utensils },
    { path: '/add', label: 'Add Recipe', icon: Plus },
    { path: '/import', label: 'Import from URL', icon: LinkIcon },
    { path: '/tags', label: 'Tags / Search', icon: Tags },
    { path: '/settings', label: 'Settings', icon: Settings },
    ...(isAdminUser ? [{ path: '/saas', label: 'SaaS Management', icon: ShieldCheck }] : [])
  ];

  return (
    <aside className="sidebar">
      <a className="brand" href="#/recipes">
        <span className="brand-mark">TL</span>
        <span>
          <strong>Recipe Core</strong>
          <small>Techlotse internal</small>
        </span>
      </a>
      <nav className="nav-list" aria-label="Primary">
        {items.map((item) => {
          const Icon = item.icon;
          const active = route === item.path || (item.path === '/recipes' && route.startsWith('/recipes/'));
          return (
            <a className={`nav-item ${active ? 'active' : ''}`} href={`#${item.path}`} key={item.path}>
              <Icon size={18} />
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>
    </aside>
  );
}

function RecipesPage() {
  const [recipes, setRecipes] = useState([]);
  const [tags, setTags] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');

    Promise.all([
      api.listRecipes({ search, tags: selectedTag ? [selectedTag] : [] }),
      api.listTags()
    ])
      .then(([recipesPayload, tagsPayload]) => {
        if (!active) return;
        setRecipes(recipesPayload.recipes);
        setTags(tagsPayload.tags);
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [search, selectedTag]);

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <p className="eyebrow">Recipes</p>
          <h1>Recipe library</h1>
        </div>
        <button className="primary-button" type="button" onClick={() => navigate('/add')}>
          <Plus size={18} />
          Add
        </button>
      </div>

      <div className="toolbar">
        <label className="search-box">
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search recipes, ingredients, descriptions"
          />
        </label>
      </div>

      <div className="tag-row filter-row">
        <TagPill tag="All" selected={!selectedTag} onClick={() => setSelectedTag('')} />
        {tags.map((tag) => (
          <TagPill
            key={tag.id}
            tag={tag}
            selected={selectedTag === tag.slug}
            onClick={() => setSelectedTag(selectedTag === tag.slug ? '' : tag.slug)}
          />
        ))}
      </div>

      <StatusMessage
        loading={loading}
        error={error}
        empty={!recipes.length}
        emptyText="No recipes found. Add one manually or import from a URL."
      />

      <div className="recipe-grid">
        {recipes.map((recipe) => (
          <RecipeCard recipe={recipe} key={recipe.id} />
        ))}
      </div>
    </section>
  );
}

function RecipeDetailPage({ id }) {
  const [recipe, setRecipe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getRecipe(id)
      .then((payload) => active && setRecipe(payload.recipe))
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  async function handleDelete() {
    if (!window.confirm('Delete this recipe?')) return;
    await api.deleteRecipe(id);
    navigate('/recipes');
  }

  if (loading || error || !recipe) {
    return (
      <section className="view">
        <StatusMessage loading={loading} error={error} empty={!recipe && !loading && !error} emptyText="Recipe not found." />
      </section>
    );
  }

  return (
    <section className="view detail-view">
      <div className="view-header">
        <button className="ghost-button" type="button" onClick={() => navigate('/recipes')}>
          <ArrowLeft size={18} />
          Recipes
        </button>
        <div className="header-actions">
          <button className="secondary-button" type="button" onClick={() => navigate(`/recipes/${recipe.id}/edit`)}>
            <Settings size={18} />
            Edit
          </button>
          <button className="danger-button" type="button" onClick={handleDelete}>
            <Trash2 size={18} />
            Delete
          </button>
        </div>
      </div>

      <div className="detail-hero">
        <div className="detail-image">
          <RecipeImage recipe={recipe} />
        </div>
        <div className="detail-copy">
          <p className="eyebrow">{recipe.importMode === 'manual' ? 'Manual recipe' : `${recipe.importMode} import`}</p>
          <h1>{recipe.title}</h1>
          <p>{recipe.shortDescription || 'No short description yet.'}</p>
          <TimeMeta recipe={recipe} />
          <div className="tag-row">
            {tagNames(recipe).map((tag) => (
              <span className="tag-chip" key={tag}>
                {tag}
              </span>
            ))}
          </div>
          {recipe.sourceUrl && (
            <a className="source-link" href={recipe.sourceUrl} target="_blank" rel="noreferrer">
              <LinkIcon size={16} />
              Source recipe
            </a>
          )}
        </div>
      </div>

      <LlmUsageCard usage={recipe.llmUsage} />

      <div className="detail-grid">
        <section className="content-block">
          <h2>Ingredients</h2>
          <ul className="ingredient-list">
            {recipe.ingredients.map((ingredient, index) => (
              <li key={`${ingredient.name}-${index}`}>
                <strong>
                  {[ingredient.quantity, ingredient.unit].filter(Boolean).join(' ')}
                  {ingredient.quantity || ingredient.unit ? ' ' : ''}
                  {ingredient.name}
                </strong>
                {(ingredient.originalText || ingredient.originalQuantity || ingredient.originalUnit) && (
                  <span>
                    Original:{' '}
                    {ingredient.originalText ||
                      [ingredient.originalQuantity, ingredient.originalUnit].filter(Boolean).join(' ')}
                  </span>
                )}
                {ingredient.notes && <span>{ingredient.notes}</span>}
              </li>
            ))}
          </ul>
        </section>

        <section className="content-block">
          <h2>Method</h2>
          <ol className="step-list">
            {recipe.steps.map((step, index) => (
              <li className={step.imageUrl ? 'illustrated-step' : ''} key={`${step.text}-${index}`}>
                {step.imageUrl && <img src={step.imageUrl} alt="" loading="lazy" />}
                <span>{step.text}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </section>
  );
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function toNumberOrNull(value) {
  if (value === '' || value === null || value === undefined) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function AddRecipePage({ recipeId = null }) {
  const steps = ['Basic info', 'Ingredients', 'Method', 'Tags', 'Review'];
  const isEditing = Boolean(recipeId);
  const [stepIndex, setStepIndex] = useState(0);
  const [loadingRecipe, setLoadingRecipe] = useState(Boolean(recipeId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [existingTags, setExistingTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [recipe, setRecipe] = useState({
    title: '',
    shortDescription: '',
    imageUrl: '',
    activeTimeMinutes: '',
    totalTimeMinutes: '',
    ingredients: [{ ...emptyIngredient }],
    steps: [{ ...emptyStep }],
    tags: []
  });

  useEffect(() => {
    let active = true;
    setLoadingRecipe(Boolean(recipeId));

    Promise.all([api.listTags(), recipeId ? api.getRecipe(recipeId) : Promise.resolve(null)])
      .then(([tagPayload, recipePayload]) => {
        if (!active) return;
        setExistingTags(tagPayload.tags);

        if (recipePayload?.recipe) {
          const loaded = recipePayload.recipe;
          setRecipe({
            title: loaded.title,
            shortDescription: loaded.shortDescription || '',
            imageUrl: loaded.imageUrl || '',
            activeTimeMinutes: loaded.activeTimeMinutes ?? '',
            totalTimeMinutes: loaded.totalTimeMinutes ?? '',
            ingredients: loaded.ingredients?.length ? loaded.ingredients : [{ ...emptyIngredient }],
            steps: loaded.steps?.length ? loaded.steps : [{ ...emptyStep }],
            tags: tagNames(loaded)
          });
        }
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoadingRecipe(false));

    return () => {
      active = false;
    };
  }, [recipeId]);

  const canGoNext = useMemo(() => {
    if (stepIndex === 0) return recipe.title.trim().length >= 2;
    if (stepIndex === 1) return recipe.ingredients.some((item) => item.name.trim());
    if (stepIndex === 2) return recipe.steps.some((item) => item.text.trim());
    return true;
  }, [recipe, stepIndex]);

  function updateRecipe(field, value) {
    setRecipe((current) => ({ ...current, [field]: value }));
  }

  function updateArrayItem(field, index, key, value) {
    setRecipe((current) => ({
      ...current,
      [field]: current[field].map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      )
    }));
  }

  function addArrayItem(field, item) {
    setRecipe((current) => ({ ...current, [field]: [...current[field], item] }));
  }

  function removeArrayItem(field, index) {
    setRecipe((current) => ({
      ...current,
      [field]: current[field].filter((_, itemIndex) => itemIndex !== index)
    }));
  }

  function toggleTag(tag) {
    setRecipe((current) => {
      const exists = current.tags.includes(tag);
      return { ...current, tags: exists ? current.tags.filter((item) => item !== tag) : [...current.tags, tag] };
    });
  }

  function addNewTag() {
    const cleaned = newTag.trim();
    if (!cleaned) return;
    setRecipe((current) => ({
      ...current,
      tags: current.tags.includes(cleaned) ? current.tags : [...current.tags, cleaned]
    }));
    setNewTag('');
  }

  function handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 1500000) {
      setError('Image uploads are limited to 1.5 MB for the MVP.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => updateRecipe('imageUrl', reader.result);
    reader.readAsDataURL(file);
  }

  async function saveRecipe() {
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...recipe,
        activeTimeMinutes: toNumberOrNull(recipe.activeTimeMinutes),
        totalTimeMinutes: toNumberOrNull(recipe.totalTimeMinutes),
        ingredients: recipe.ingredients.filter((item) => item.name.trim()),
        steps: recipe.steps.filter((item) => item.text.trim())
      };
      const result = isEditing ? await api.updateRecipe(recipeId, payload) : await api.createRecipe(payload);
      navigate(`/recipes/${result.recipe.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loadingRecipe) {
    return (
      <section className="view">
        <StatusMessage loading={loadingRecipe} />
      </section>
    );
  }

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <p className="eyebrow">{isEditing ? 'Edit Recipe' : 'Add Recipe'}</p>
          <h1>{isEditing ? 'Edit recipe' : 'Manual recipe wizard'}</h1>
        </div>
      </div>

      <div className="wizard-steps" aria-label="Recipe wizard progress">
        {steps.map((step, index) => (
          <button
            className={index === stepIndex ? 'active' : index < stepIndex ? 'complete' : ''}
            type="button"
            key={step}
            onClick={() => setStepIndex(index)}
          >
            {index < stepIndex ? <Check size={15} /> : index + 1}
            <span>{step}</span>
          </button>
        ))}
      </div>

      {error && <div className="state error">{error}</div>}

      <div className="surface">
        {stepIndex === 0 && (
          <div className="form-grid">
            <Field label="Title">
              <input value={recipe.title} onChange={(event) => updateRecipe('title', event.target.value)} />
            </Field>
            <Field label="Short description">
              <textarea
                value={recipe.shortDescription}
                onChange={(event) => updateRecipe('shortDescription', event.target.value)}
              />
            </Field>
            <Field label="Image URL">
              <input value={recipe.imageUrl} onChange={(event) => updateRecipe('imageUrl', event.target.value)} />
            </Field>
            <Field label="Image upload">
              <span className="file-input">
                <Image size={17} />
                <input type="file" accept="image/*" onChange={handleImageUpload} />
              </span>
            </Field>
            <Field label="Active time (minutes)">
              <input
                type="number"
                min="0"
                value={recipe.activeTimeMinutes}
                onChange={(event) => updateRecipe('activeTimeMinutes', event.target.value)}
              />
            </Field>
            <Field label="Total time (minutes)">
              <input
                type="number"
                min="0"
                value={recipe.totalTimeMinutes}
                onChange={(event) => updateRecipe('totalTimeMinutes', event.target.value)}
              />
            </Field>
          </div>
        )}

        {stepIndex === 1 && (
          <div className="stack">
            {recipe.ingredients.map((ingredient, index) => (
              <div className="line-item ingredient-row" key={index}>
                <input
                  placeholder="Ingredient"
                  value={ingredient.name}
                  onChange={(event) => updateArrayItem('ingredients', index, 'name', event.target.value)}
                />
                <input
                  placeholder="Quantity"
                  value={ingredient.quantity}
                  onChange={(event) => updateArrayItem('ingredients', index, 'quantity', event.target.value)}
                />
                <input
                  placeholder="Unit"
                  value={ingredient.unit}
                  onChange={(event) => updateArrayItem('ingredients', index, 'unit', event.target.value)}
                />
                <input
                  placeholder="Notes"
                  value={ingredient.notes}
                  onChange={(event) => updateArrayItem('ingredients', index, 'notes', event.target.value)}
                />
                {(ingredient.originalText || ingredient.originalQuantity || ingredient.originalUnit) && (
                  <div className="original-value">
                    Original:{' '}
                    {ingredient.originalText ||
                      [ingredient.originalQuantity, ingredient.originalUnit].filter(Boolean).join(' ')}
                  </div>
                )}
                <button
                  className="icon-button"
                  type="button"
                  title="Remove ingredient"
                  onClick={() => removeArrayItem('ingredients', index)}
                  disabled={recipe.ingredients.length === 1}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
            <button className="secondary-button" type="button" onClick={() => addArrayItem('ingredients', { ...emptyIngredient })}>
              <Plus size={18} />
              Add ingredient
            </button>
          </div>
        )}

        {stepIndex === 2 && (
          <div className="stack">
            {recipe.steps.map((step, index) => (
              <div className="line-item method-row" key={index}>
                <span className="step-number">{index + 1}</span>
                <textarea
                  value={step.text}
                  onChange={(event) => updateArrayItem('steps', index, 'text', event.target.value)}
                  placeholder="Describe this step"
                />
                <button
                  className="icon-button"
                  type="button"
                  title="Remove step"
                  onClick={() => removeArrayItem('steps', index)}
                  disabled={recipe.steps.length === 1}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
            <button className="secondary-button" type="button" onClick={() => addArrayItem('steps', { ...emptyStep })}>
              <Plus size={18} />
              Add step
            </button>
          </div>
        )}

        {stepIndex === 3 && (
          <div className="stack">
            <div className="tag-row">
              {existingTags.map((tag) => (
                <TagPill
                  key={tag.id}
                  tag={tag}
                  selected={recipe.tags.includes(tag.name)}
                  onClick={() => toggleTag(tag.name)}
                />
              ))}
            </div>
            <div className="inline-form">
              <input value={newTag} onChange={(event) => setNewTag(event.target.value)} placeholder="New tag" />
              <button className="secondary-button" type="button" onClick={addNewTag}>
                <Plus size={18} />
                Create
              </button>
            </div>
            <div className="tag-row">
              {recipe.tags.map((tag) => (
                <TagPill key={tag} tag={tag} selected onClick={() => toggleTag(tag)} />
              ))}
            </div>
          </div>
        )}

        {stepIndex === 4 && (
          <div className="review-layout">
            <div>
              <p className="eyebrow">Review</p>
              <h2>{recipe.title || 'Untitled recipe'}</h2>
              <p>{recipe.shortDescription || 'No short description.'}</p>
              <TimeMeta
                recipe={{
                  activeTimeMinutes: toNumberOrNull(recipe.activeTimeMinutes),
                  totalTimeMinutes: toNumberOrNull(recipe.totalTimeMinutes)
                }}
              />
              <div className="tag-row">
                {recipe.tags.map((tag) => (
                  <span className="tag-chip" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </div>
            <div className="review-counts">
              <span>{recipe.ingredients.filter((item) => item.name.trim()).length} ingredients</span>
              <span>{recipe.steps.filter((item) => item.text.trim()).length} steps</span>
            </div>
          </div>
        )}
      </div>

      <div className="wizard-actions">
        <button className="ghost-button" type="button" disabled={stepIndex === 0} onClick={() => setStepIndex(stepIndex - 1)}>
          <ArrowLeft size={18} />
          Back
        </button>
        {stepIndex < steps.length - 1 ? (
          <button
            className="primary-button"
            type="button"
            disabled={!canGoNext}
            onClick={() => setStepIndex(stepIndex + 1)}
          >
            Next
            <ArrowRight size={18} />
          </button>
        ) : (
          <button className="primary-button" type="button" disabled={saving} onClick={saveRecipe}>
            {saving ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
            {isEditing ? 'Update recipe' : 'Save recipe'}
          </button>
        )}
      </div>
    </section>
  );
}

function ImportPage() {
  const [sourceType, setSourceType] = useState('url');
  const [url, setUrl] = useState('');
  const [mode, setMode] = useState('verbatim');
  const [photos, setPhotos] = useState([]);
  const [createToddlerVersion, setCreateToddlerVersion] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState([]);

  function chooseSource(nextSourceType) {
    setSourceType(nextSourceType);
    setError('');
    setWarnings([]);
    if (nextSourceType === 'photos') {
      setMode('ai');
    }
  }

  function readPhotoFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () =>
        resolve({
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: String(reader.result || '')
        });
      reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
      reader.readAsDataURL(file);
    });
  }

  async function handlePhotoUpload(event) {
    const selected = Array.from(event.target.files || []);
    event.target.value = '';
    if (!selected.length) return;

    if (photos.length + selected.length > MAX_IMPORT_PHOTOS) {
      setError(`Photo import supports up to ${MAX_IMPORT_PHOTOS} photos.`);
      return;
    }

    const invalidType = selected.find((file) => !IMPORT_PHOTO_TYPES.has(file.type));
    if (invalidType) {
      setError('Photo import supports PNG, JPEG, and WebP images.');
      return;
    }

    const oversized = selected.find((file) => file.size > MAX_IMPORT_PHOTO_BYTES);
    if (oversized) {
      setError(`Each photo must be ${fileSizeLabel(MAX_IMPORT_PHOTO_BYTES)} or smaller.`);
      return;
    }

    setError('');
    try {
      const uploaded = await Promise.all(selected.map(readPhotoFile));
      setPhotos((current) => [...current, ...uploaded]);
    } catch (err) {
      setError(err.message);
    }
  }

  function removePhoto(index) {
    setPhotos((current) => current.filter((_, photoIndex) => photoIndex !== index));
  }

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setWarnings([]);
    try {
      const result =
        sourceType === 'photos'
          ? await api.importPhotos({
              photos: photos.map(({ name, type, dataUrl }) => ({ name, type, dataUrl })),
              createToddlerVersion
            })
          : await api.importUrl({
              url,
              mode,
              createToddlerVersion: mode === 'ai' && createToddlerVersion
            });
      setWarnings(result.warnings || []);
      navigate(`/recipes/${result.recipe.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <p className="eyebrow">Import recipe</p>
          <h1>Save a recipe from the web or photos</h1>
        </div>
      </div>

      <form className="surface stack" onSubmit={submit}>
        <div className="option-grid">
          <button
            className={`option-card ${sourceType === 'url' ? 'selected' : ''}`}
            type="button"
            onClick={() => chooseSource('url')}
          >
            <LinkIcon size={22} />
            <strong>Recipe URL</strong>
            <span>Import from a web page with recipe metadata or visible recipe text.</span>
          </button>
          <button
            className={`option-card ${sourceType === 'photos' ? 'selected' : ''}`}
            type="button"
            onClick={() => chooseSource('photos')}
          >
            <UploadCloud size={22} />
            <strong>Recipe photos</strong>
            <span>Upload up to five photos and extract the recipe with ChatGPT assistance.</span>
          </button>
        </div>

        {sourceType === 'url' && (
          <Field label="Recipe URL">
            <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/recipe" />
          </Field>
        )}

        {sourceType === 'url' && (
          <div className="option-grid">
            <button
              className={`option-card ${mode === 'verbatim' ? 'selected' : ''}`}
              type="button"
              onClick={() => {
                setMode('verbatim');
                setCreateToddlerVersion(false);
              }}
            >
              <LinkIcon size={22} />
              <strong>Verbatim import</strong>
              <span>Extract and save the page recipe as-is where possible.</span>
            </button>
            <button
              className={`option-card ${mode === 'ai' ? 'selected' : ''}`}
              type="button"
              onClick={() => setMode('ai')}
            >
              <KeyRound size={22} />
              <strong>ChatGPT processed import</strong>
              <span>Normalize structure, remove story content, and convert units to metric.</span>
            </button>
          </div>
        )}

        {sourceType === 'photos' && (
          <div className="photo-import-panel">
            <label className={`photo-drop ${photos.length >= MAX_IMPORT_PHOTOS ? 'disabled' : ''}`}>
              <UploadCloud size={24} />
              <strong>Upload recipe photos</strong>
              <span>
                PNG, JPEG, or WebP. Up to {MAX_IMPORT_PHOTOS} photos, {fileSizeLabel(MAX_IMPORT_PHOTO_BYTES)} each.
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                disabled={photos.length >= MAX_IMPORT_PHOTOS}
                onChange={handlePhotoUpload}
              />
            </label>

            {photos.length > 0 && (
              <div className="photo-list">
                {photos.map((photo, index) => (
                  <div className="photo-item" key={`${photo.name}-${index}`}>
                    <img src={photo.dataUrl} alt="" />
                    <div>
                      <strong>{photo.name || `Recipe photo ${index + 1}`}</strong>
                      <span>{fileSizeLabel(photo.size)}</span>
                    </div>
                    <button className="icon-button" type="button" title="Remove photo" onClick={() => removePhoto(index)}>
                      <Trash2 size={17} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {mode === 'ai' && (
          <label className="toggle-row toddler-toggle">
            <input
              type="checkbox"
              checked={createToddlerVersion}
              onChange={(event) => setCreateToddlerVersion(event.target.checked)}
            />
            <span>Create toddler helper version with AI step images</span>
          </label>
        )}

        {error && <div className="state error">{error}</div>}
        {warnings.map((warning) => (
          <div className="state" key={warning}>
            {warning}
          </div>
        ))}

        <button
          className="primary-button wide"
          type="submit"
          disabled={loading || (sourceType === 'url' ? !url.trim() : !photos.length)}
        >
          {loading ? <Loader2 className="spin" size={18} /> : sourceType === 'photos' ? <UploadCloud size={18} /> : <LinkIcon size={18} />}
          Import recipe
        </button>
      </form>
    </section>
  );
}

function TagsSearchPage() {
  const [tags, setTags] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([api.listTags(), api.listRecipes({ search, tags: selectedTags })])
      .then(([tagPayload, recipePayload]) => {
        if (!active) return;
        setTags(tagPayload.tags);
        setRecipes(recipePayload.recipes);
      })
      .catch((err) => active && setError(err.message))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [search, selectedTags]);

  function toggleSlug(slug) {
    setSelectedTags((current) =>
      current.includes(slug) ? current.filter((item) => item !== slug) : [...current, slug]
    );
  }

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <p className="eyebrow">Tags / Search</p>
          <h1>Find recipes fast</h1>
        </div>
      </div>

      <div className="toolbar">
        <label className="search-box">
          <Search size={18} />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search library" />
        </label>
      </div>

      <div className="tag-row filter-row">
        {tags.map((tag) => (
          <button
            className={`tag-pill ${selectedTags.includes(tag.slug) ? 'selected' : ''}`}
            type="button"
            key={tag.id}
            onClick={() => toggleSlug(tag.slug)}
          >
            {tag.name}
            <span>{tag.recipeCount}</span>
          </button>
        ))}
      </div>

      <StatusMessage loading={loading} error={error} empty={!recipes.length} emptyText="No matching recipes." />
      <div className="recipe-grid">
        {recipes.map((recipe) => (
          <RecipeCard recipe={recipe} key={recipe.id} />
        ))}
      </div>
    </section>
  );
}

function SettingsPage() {
  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'llm', label: 'LLM', icon: Bot },
    { id: 'backup', label: 'Backup', icon: DatabaseBackup }
  ];
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState(null);
  const [appVersion, setAppVersion] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [clearKey, setClearKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [importingBackup, setImportingBackup] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([api.getSettings(), api.getVersion()])
      .then(([settingsPayload, versionPayload]) => {
        setSettings(settingsPayload.settings);
        setAppVersion(versionPayload);
      })
      .catch((err) => setError(err.message));
  }, []);

  function updateField(field, value) {
    setSettings((current) => ({ ...current, [field]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      const body = {
        defaultLanguage: settings.defaultLanguage,
        unitSystem: 'metric',
        aiProcessingEnabled: settings.aiProcessingEnabled,
        llmProvider: settings.llmProvider,
        openaiModel: settings.openaiModel
      };
      if (apiKey.trim()) body.openaiApiKey = apiKey.trim();
      if (clearKey) body.openaiApiKey = '';
      const payload = await api.updateSettings(body);
      setSettings(payload.settings);
      setApiKey('');
      setClearKey(false);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function verifyKey() {
    setVerifying(true);
    setError('');
    try {
      const payload = await api.verifyOpenAi({
        apiKey: apiKey.trim() || undefined,
        model: settings.openaiModel
      });
      setSettings(payload.settings);
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  }

  async function exportBackup() {
    setError('');
    const backup = await api.exportBackup();
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `tl-recipe-core-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  }

  async function importBackup(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportingBackup(true);
    setError('');
    try {
      const text = await file.text();
      const payload = await api.importBackup(JSON.parse(text));
      setSaved(`Imported ${payload.importedCount} recipes`);
    } catch (err) {
      setError(err.message);
    } finally {
      setImportingBackup(false);
      event.target.value = '';
    }
  }

  if (!settings && !error) {
    return (
      <section className="view">
        <StatusMessage loading />
      </section>
    );
  }

  const usage = settings?.usageSummary || {
    recipeCount: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    averageResponseMs: 0,
    byModel: []
  };

  return (
    <section className="view">
      <div className="view-header">
        <div>
          <p className="eyebrow">Settings</p>
          <h1>User settings</h1>
        </div>
      </div>

      {error && <div className="state error">{error}</div>}
      {settings && (
        <form onSubmit={submit}>
          <div className="tab-list" role="tablist" aria-label="Settings sections">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon size={17} />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="surface settings-surface">
            {activeTab === 'general' && (
              <div className="form-grid">
                <Field label="Default language">
                  <select
                    value={settings.defaultLanguage}
                    onChange={(event) => updateField('defaultLanguage', event.target.value)}
                  >
                    <option value="en">English</option>
                    <option value="de">German</option>
                    <option value="fr">French</option>
                    <option value="it">Italian</option>
                  </select>
                </Field>
                <Field label="Default unit system">
                  <select value="metric" disabled>
                    <option value="metric">Metric</option>
                  </select>
                </Field>
                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={settings.aiProcessingEnabled}
                    onChange={(event) => updateField('aiProcessingEnabled', event.target.checked)}
                  />
                  <span>Enable AI processing</span>
                </label>
                <div className="field">
                  <span>Running version</span>
                  <div className="setting-status">
                    <Settings size={17} />
                    {appVersion ? `${appVersion.name} ${appVersion.version}` : 'Loading'}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'llm' && (
              <div className="stack">
                <div className="option-grid three">
                  <button className="option-card disabled" type="button" disabled>
                    <ServerCog size={22} />
                    <strong>Platform supplied ChatGPT</strong>
                    <span>Disabled</span>
                  </button>
                  <button
                    className={`option-card ${settings.llmProvider === 'own_chatgpt' ? 'selected' : ''}`}
                    type="button"
                    onClick={() => updateField('llmProvider', 'own_chatgpt')}
                  >
                    <KeyRound size={22} />
                    <strong>Own ChatGPT</strong>
                    <span>{settings.openaiApiKeyConfigured ? 'Configured' : 'Needs API key'}</span>
                  </button>
                  <button className="option-card disabled" type="button" disabled>
                    <Layers size={22} />
                    <strong>Bring your own LLM</strong>
                    <span>Disabled</span>
                  </button>
                </div>

                <div className="form-grid">
                  <Field label="OpenAI API key">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(event) => setApiKey(event.target.value)}
                      placeholder={settings.openaiApiKeyConfigured ? 'Configured' : 'Not configured'}
                      disabled={settings.openaiApiKeySource === 'environment'}
                    />
                  </Field>
                  <Field label="Model">
                    <select
                      value={settings.openaiModel}
                      onChange={(event) => updateField('openaiModel', event.target.value)}
                    >
                      {settings.openaiModelOptions.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.label} - {model.tier}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <div className="field">
                    <span>API key status</span>
                    <div className={`setting-status ${settings.openaiKeyStatus}`}>
                      <KeyRound size={17} />
                      {settings.openaiKeyStatus}
                      {settings.openaiKeyCheckedAt && (
                        <small>{new Date(settings.openaiKeyCheckedAt).toLocaleString()}</small>
                      )}
                    </div>
                  </div>
                  <div className="field">
                    <span>Model usage</span>
                    <div className="setting-status">
                      <Gauge size={17} />
                      {numberLabel(usage.recipeCount)} AI imports
                    </div>
                  </div>
                </div>

                {settings.openaiKeyError && <div className="state error">{settings.openaiKeyError}</div>}

                <div className="metric-grid">
                  <div>
                    <span>Input tokens</span>
                    <strong>{numberLabel(usage.inputTokens)}</strong>
                  </div>
                  <div>
                    <span>Output tokens</span>
                    <strong>{numberLabel(usage.outputTokens)}</strong>
                  </div>
                  <div>
                    <span>Total tokens</span>
                    <strong>{numberLabel(usage.totalTokens)}</strong>
                  </div>
                  <div>
                    <span>Total cost</span>
                    <strong>{moneyLabel(usage.totalCostUsd)}</strong>
                  </div>
                  <div>
                    <span>Avg response</span>
                    <strong>{numberLabel(usage.averageResponseMs)} ms</strong>
                  </div>
                </div>

                <div className="usage-table">
                  <div className="usage-table-header">
                    <span>Model</span>
                    <span>Imports</span>
                    <span>Tokens</span>
                    <span>Cost</span>
                    <span>Avg</span>
                  </div>
                  {usage.byModel.length ? (
                    usage.byModel.map((row) => (
                      <div className="usage-table-row" key={row.model}>
                        <span>{row.model}</span>
                        <span>{numberLabel(row.recipeCount)}</span>
                        <span>{numberLabel(row.totalTokens)}</span>
                        <span>{moneyLabel(row.totalCostUsd)}</span>
                        <span>{numberLabel(row.averageResponseMs)} ms</span>
                      </div>
                    ))
                  ) : (
                    <div className="usage-table-empty">No AI imports yet.</div>
                  )}
                </div>

                <label className="toggle-row">
                  <input
                    type="checkbox"
                    checked={clearKey}
                    disabled={settings.openaiApiKeySource === 'environment'}
                    onChange={(event) => setClearKey(event.target.checked)}
                  />
                  <span>Clear stored OpenAI key</span>
                </label>

                <div className="form-actions split-actions">
                  <button className="secondary-button" type="button" onClick={verifyKey} disabled={verifying}>
                    {verifying ? <Loader2 className="spin" size={18} /> : <KeyRound size={18} />}
                    Verify key
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'backup' && (
              <div className="stack">
                <div className="option-grid">
                  <button className="option-card" type="button" onClick={exportBackup}>
                    <Download size={22} />
                    <strong>Export data</strong>
                    <span>Download recipes and tags as JSON.</span>
                  </button>
                  <label className="option-card file-option">
                    <UploadCloud size={22} />
                    <strong>Import data</strong>
                    <span>{importingBackup ? 'Importing' : 'Upload a TL Recipe Core backup file.'}</span>
                    <input type="file" accept="application/json" onChange={importBackup} disabled={importingBackup} />
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="form-actions">
            {saved && <span className="saved">{saved === true ? 'Saved' : saved}</span>}
            <button className="primary-button" type="submit" disabled={saving}>
              {saving ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
              Save settings
            </button>
          </div>
        </form>
      )}
    </section>
  );
}

function SaasManagementPage() {
  return (
    <section className="view">
      <div className="view-header">
        <div>
          <p className="eyebrow">Admin</p>
          <h1>SaaS Management</h1>
        </div>
      </div>

      <div className="admin-grid">
        <section className="surface admin-panel">
          <ServerCog size={24} />
          <h2>Platform LLM</h2>
          <div className="setting-status">Disabled</div>
        </section>
        <section className="surface admin-panel">
          <Gauge size={24} />
          <h2>Usage Metrics</h2>
          <label className="toggle-row">
            <input type="checkbox" checked readOnly disabled />
            <span>Collect import metrics</span>
          </label>
        </section>
        <section className="surface admin-panel">
          <ShieldCheck size={24} />
          <h2>Admin Access</h2>
          <div className="setting-status">Local admin placeholder</div>
        </section>
      </div>
    </section>
  );
}

export default function App() {
  const route = useRoute();
  const editMatch = route.match(/^\/recipes\/(.+)\/edit$/);
  const recipeMatch = editMatch ? null : route.match(/^\/recipes\/(.+)$/);

  let page;
  if (editMatch) page = <AddRecipePage recipeId={editMatch[1]} />;
  else if (recipeMatch) page = <RecipeDetailPage id={recipeMatch[1]} />;
  else if (route === '/add') page = <AddRecipePage />;
  else if (route === '/import') page = <ImportPage />;
  else if (route === '/tags') page = <TagsSearchPage />;
  else if (route === '/settings') page = <SettingsPage />;
  else if (route === '/saas' && isAdminUser) page = <SaasManagementPage />;
  else page = <RecipesPage />;

  return (
    <div className="app-shell">
      <AppNav route={route} />
      <main className="main-content">{page}</main>
    </div>
  );
}
