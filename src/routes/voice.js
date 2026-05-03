const { parseJsonBody, sendJson } = require('../utils/http');
const VoiceParsingService = require('../services/VoiceParsingService');

async function handleParseVoice(req, res) {
  const body = await parseJsonBody(req);
  const transcript = typeof body.transcript === 'string' ? body.transcript.trim() : '';

  if (!transcript) {
    const error = new Error('Transcript is required');
    error.statusCode = 400;
    error.exposeMessage = 'Transcript is required';
    throw error;
  }

  const parsed = await VoiceParsingService.parseTranscriptWithAI(transcript);
  sendJson(res, 200, parsed);
}

module.exports = {
  handleParseVoice,
};
