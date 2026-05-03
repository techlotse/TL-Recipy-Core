export const LLM_PROVIDERS = ['platform_chatgpt', 'own_chatgpt', 'byo_llm'];

export const OPENAI_MODEL_OPTIONS = [
  {
    id: 'gpt-5.5',
    label: 'GPT-5.5',
    tier: 'Frontier',
    description: 'Highest quality option for recipe normalization.',
    pricing: {
      inputPerMillionUsd: 5,
      outputPerMillionUsd: 30
    }
  },
  {
    id: 'gpt-5.4-mini',
    label: 'GPT-5.4 Mini',
    tier: 'Mini',
    description: 'Balanced cost and quality.',
    pricing: {
      inputPerMillionUsd: 0.75,
      outputPerMillionUsd: 4.5
    }
  },
  {
    id: 'gpt-5.4-nano',
    label: 'GPT-5.4 Nano',
    tier: 'Nano',
    description: 'Cheapest option for routine imports.',
    pricing: {
      inputPerMillionUsd: 0.2,
      outputPerMillionUsd: 1.25
    }
  }
];

export const DEFAULT_OPENAI_MODEL = 'gpt-5.4-nano';

export function isSupportedOpenAiModel(model) {
  return OPENAI_MODEL_OPTIONS.some((option) => option.id === model);
}

export function getOpenAiModelPricing(model) {
  return OPENAI_MODEL_OPTIONS.find((option) => option.id === model)?.pricing || null;
}
