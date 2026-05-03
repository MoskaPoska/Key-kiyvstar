const fs = require('fs');
const path = require('path');

const { initDatabase } = require('../src/db/init');
const database = require('../src/db/database');
const ZoneAccess = require('../src/db/models/ZoneAccess');
const ZoneAccessService = require('../src/services/ZoneAccessService');

function printUsage() {
  console.log('Usage: node scripts/import-zone-access.js <path-to-zone-access.json> [--replace]');
  console.log('Default mode: merge imported data into existing database data.');
  console.log('Use --replace to fully replace current zone_access contents.');
}

function loadJsonFromFile(filePath) {
  const absolutePath = path.resolve(process.cwd(), filePath);
  const raw = fs.readFileSync(absolutePath, 'utf8');
  const parsed = JSON.parse(raw);

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Zone access file must contain an object keyed by zone number.');
  }

  return {
    absolutePath,
    data: parsed,
  };
}

function countStats(data) {
  const zoneCount = Object.keys(data || {}).length;
  let addressCount = 0;
  let tkdCount = 0;

  Object.values(data || {}).forEach((entries) => {
    if (!Array.isArray(entries)) return;
    addressCount += entries.length;
    entries.forEach((entry) => {
      if (Array.isArray(entry && entry.tkdEntries)) {
        tkdCount += entry.tkdEntries.length;
      }
    });
  });

  return { zoneCount, addressCount, tkdCount };
}

async function main() {
  const args = process.argv.slice(2);
  const replaceMode = args.includes('--replace');
  const fileArg = args.find((arg) => !arg.startsWith('--'));

  if (!fileArg) {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const { absolutePath, data: importedData } = loadJsonFromFile(fileArg);

  const initResult = await initDatabase();
  if (initResult.storage !== 'postgres') {
    throw new Error('PostgreSQL is not connected. Set DATABASE_URL before importing.');
  }

  const existingData = replaceMode ? {} : await ZoneAccess.getAll();
  const mergedData = replaceMode
    ? importedData
    : ZoneAccessService.mergeZoneAccessData(existingData, importedData);

  await ZoneAccess.replaceAll(mergedData);

  const importedStats = countStats(importedData);
  const finalStats = countStats(mergedData);

  console.log(`Imported file: ${absolutePath}`);
  console.log(`Mode: ${replaceMode ? 'replace' : 'merge'}`);
  console.log(
    `Imported zones: ${importedStats.zoneCount}, addresses: ${importedStats.addressCount}, tkd entries: ${importedStats.tkdCount}`
  );
  console.log(
    `Database now has zones: ${finalStats.zoneCount}, addresses: ${finalStats.addressCount}, tkd entries: ${finalStats.tkdCount}`
  );

  await database.end();
}

main().catch(async (error) => {
  console.error('Zone access import failed:', error.message);
  try {
    await database.end();
  } catch (closeError) {
    // ignore close errors after failure
  }
  process.exitCode = 1;
});
