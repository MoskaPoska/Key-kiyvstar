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

function buildExistingEntriesContext(existingEntries) {
  if (!existingEntries || existingEntries.length === 0) return '';

  const unique = [];
  const seen = new Set();
  existingEntries.forEach((entry) => {
    const parts = [];
    if (entry.entrance) parts.push(`подъезд ${entry.entrance}`);
    if (entry.tkd) parts.push(`ТКД ${entry.tkd}`);
    if (entry.place) parts.push(entry.place);
    const text = parts.join(', ');
    if (text && !seen.has(text)) {
      seen.add(text);
      unique.push(text);
    }
  });

  if (unique.length === 0) return '';

  const examples = unique.slice(0, 15).join('; ');
  return ` Known access patterns for this zone: ${examples}. Use these patterns to recognize similar access descriptions.`;
}

function buildRequestBody(transcript, zoneNum, existingEntries) {
  let instructions = [
    'You extract fields from short speech-to-text transcripts for address entry forms.',
    'Return only the requested JSON schema.',
    'The transcript may be in Russian, Ukrainian, or mixed.',
    'Do not invent values.',
    'If a field is missing or uncertain, return an empty string for it.',
    'Address MUST contain ONLY the street name and house number (e.g. "Парковая, 107" or "Гагарина 10").',
    'Do NOT include entrance info, door codes, intercom, keys, security descriptions, or any access instructions in the address — those go into the "code" field.',
    'Code should contain ANY access-related information: entrance number, intercom code, door code, key location, concierge info, security gate code, apartment number — anything that describes how to enter or who has the key.',
    'Zone must contain digits only.',
    'Confidence is an integer from 0 to 100 for the extraction as a whole.',
  ].join(' ');

  if (zoneNum) {
    instructions += ` The current zone number is ${zoneNum}.`;
  }

  const existingContext = buildExistingEntriesContext(existingEntries);
  instructions += existingContext;

  return {
    model: process.env.OPENAI_VOICE_MODEL || DEFAULT_MODEL,
    instructions,
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

async function parseTranscriptWithAI(transcript, zoneNum, existingEntries) {
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
    body: JSON.stringify(buildRequestBody(transcript, zoneNum, existingEntries)),
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
