const OPENAI_API_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = process.env.OPENAI_VOICE_MODEL || 'gpt-4o-mini';

const RESPONSE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['zone', 'address', 'code', 'confidence'],
  properties: {
    zone: { type: 'string' },
    address: { type: 'string' },
    code: { type: 'string' },
    confidence: {
      type: 'integer',
      minimum: 0,
      maximum: 100,
    },
  },
};

function isEnabled() {
  return !!process.env.OPENAI_API_KEY;
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeParsedVoice(payload) {
  const zone = cleanString(payload && payload.zone).replace(/[^\d]/g, '');
  const address = cleanString(payload && payload.address).replace(/\s+/g, ' ');
  const code = cleanString(payload && payload.code).replace(/\s+/g, ' ');
  const confidence = Number.isFinite(payload && payload.confidence)
    ? Math.max(0, Math.min(100, Math.round(payload.confidence)))
    : 0;

  return {
    zone,
    address,
    code,
    confidence,
  };
}

function buildRequestBody(transcript) {
  return {
    model: process.env.OPENAI_VOICE_MODEL || DEFAULT_MODEL,
    instructions: [
      'You extract fields from short speech-to-text transcripts for address entry forms.',
      'Return only the requested JSON schema.',
      'The transcript may be in Russian, Ukrainian, or mixed.',
      'Do not invent values.',
      'If a field is missing or uncertain, return an empty string for it.',
      'Address should contain the street name and house number if present.',
      'Zone must contain digits only.',
      'Code should contain the spoken access code, apartment marker, or phone-like value when clearly present.',
      'Confidence is an integer from 0 to 100 for the extraction as a whole.',
    ].join(' '),
    input: transcript,
    text: {
      format: {
        type: 'json_schema',
        name: 'voice_parse',
        strict: true,
        schema: RESPONSE_SCHEMA,
      },
    },
  };
}

function extractOutputText(responsePayload) {
  if (!responsePayload || !Array.isArray(responsePayload.output)) {
    return '';
  }

  for (const item of responsePayload.output) {
    if (!item || item.type !== 'message' || !Array.isArray(item.content)) {
      continue;
    }

    const refusal = item.content.find((contentItem) => contentItem && contentItem.type === 'refusal');
    if (refusal && refusal.refusal) {
      const error = new Error(refusal.refusal);
      error.statusCode = 422;
      error.exposeMessage = 'AI refused to parse the transcript';
      throw error;
    }

    const outputText = item.content.find((contentItem) => contentItem && contentItem.type === 'output_text');
    if (outputText && outputText.text) {
      return outputText.text;
    }
  }

  return '';
}

async function parseTranscriptWithAI(transcript) {
  if (!isEnabled()) {
    const error = new Error('AI voice parsing is not configured');
    error.statusCode = 503;
    error.exposeMessage = 'AI voice parsing is unavailable';
    throw error;
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(buildRequestBody(transcript)),
  });

  const payload = await response.json();
  if (!response.ok) {
    const message = payload && payload.error && payload.error.message
      ? payload.error.message
      : 'OpenAI request failed';
    const error = new Error(message);
    error.statusCode = 502;
    error.exposeMessage = 'AI voice parsing failed';
    throw error;
  }

  const outputText = extractOutputText(payload);
  if (!outputText) {
    const error = new Error('OpenAI returned an empty response');
    error.statusCode = 502;
    error.exposeMessage = 'AI voice parsing returned no result';
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(outputText);
  } catch (parseError) {
    const error = new Error('OpenAI returned invalid JSON');
    error.statusCode = 502;
    error.exposeMessage = 'AI voice parsing returned invalid data';
    throw error;
  }

  return normalizeParsedVoice(parsed);
}

module.exports = {
  isEnabled,
  normalizeParsedVoice,
  parseTranscriptWithAI,
};
