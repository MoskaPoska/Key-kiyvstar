const { parseJsonBody, sendJson } = require('../utils/http');
const VoiceParsingService = require('../services/VoiceParsingService');
const ZoneAccessService = require('../services/ZoneAccessService');

async function handleParseVoice(req, res) {
  const body = await parseJsonBody(req);
  const transcript = typeof body.transcript === 'string' ? body.transcript.trim() : '';
  const zoneNum = typeof body.zoneNum === 'string' ? body.zoneNum.trim() : '';

  if (!transcript) {
    const error = new Error('Transcript is required');
    error.statusCode = 400;
    error.exposeMessage = 'Transcript is required';
    throw error;
  }

  // Fetch existing access entries for this zone to use as context
  let existingEntries = [];
  if (zoneNum) {
    try {
      const allData = await ZoneAccessService.getAllMerged();
      const zoneData = allData[zoneNum];
      if (Array.isArray(zoneData)) {
        zoneData.forEach((addr) => {
          if (addr.tkdEntries && Array.isArray(addr.tkdEntries)) {
            addr.tkdEntries.forEach((entry) => {
              if (entry.entrance || entry.tkd || entry.place) {
                existingEntries.push({
                  entrance: String(entry.entrance || '').trim(),
                  tkd: String(entry.tkd || '').trim(),
                  place: String(entry.place || '').trim(),
                });
              }
            });
          }
          if (addr.notes && Array.isArray(addr.notes)) {
            addr.notes.forEach((note) => {
              const text = String(note || '').trim();
              if (text) existingEntries.push({ place: text });
            });
          }
        });
      }
    } catch (error) {
      // Non-critical: proceed without context
    }
  }

  const parsed = await VoiceParsingService.parseTranscriptWithAI(transcript, zoneNum, existingEntries);
  sendJson(res, 200, parsed);
}

module.exports = {
  handleParseVoice,
};
