const botDataService = require('../src/services/BotDataService');

async function queryBotData() {
  console.log('Initializing bot data connection...');
  await botDataService.initialize();
  
  console.log('\n=== Bot Data Statistics ===\n');
  
  try {
    const stats = await botDataService.getStats();
    console.log('Total Keys Backup Records:', stats.keysBackup);
    console.log('Total Houses:', stats.houses);
    console.log('Total Equipments:', stats.equipments);
    console.log('Zones:', stats.zones.join(', '));
    
    console.log('\n=== Sample Houses (first 10) ===\n');
    const houses = await botDataService.getAllHouses(10);
    houses.forEach(house => {
      console.log(`ID: ${house.Id}, Zone: ${house.Zone}, Street: ${house.Street}, House: ${house.House}`);
      console.log(`  Key Info: ${house.KeyInfo}`);
    });
    
    console.log('\n=== Sample Keys Backup (first 10) ===\n');
    const keys = await botDataService.getAllKeysBackup(10);
    keys.forEach(key => {
      console.log(`ID: ${key.Id}, Zone: ${key.Zone}, Street: ${key.Street}, House: ${key.House}`);
      console.log(`  Key Info: ${key.KeyInfo}`);
      if (key.TKD) console.log(`  TKD: ${key.TKD}`);
      if (key.NumTKD) console.log(`  NumTKD: ${key.NumTKD}`);
    });
    
    console.log('\n=== Sample Equipments (first 10) ===\n');
    const equipments = await botDataService.getAllEquipments(10);
    equipments.forEach(eq => {
      console.log(`ID: ${eq.Id}, House ID: ${eq.HouseId}, NumTKD: ${eq.NumTKD || 'N/A'}, Entrance: ${eq.Entrance || 'N/A'}, Floor: ${eq.Floor || 'N/A'}`);
    });
    
    console.log('\n=== Houses by Zone 1 ===\n');
    const zone1Houses = await botDataService.getHousesByZone('1');
    zone1Houses.slice(0, 5).forEach(house => {
      console.log(`  ${house.Street}, ${house.House} - ${house.KeyInfo}`);
    });
    console.log(`  ... and ${zone1Houses.length - 5} more houses`);
    
    console.log('\n=== Search Results for "Шевченко" ===\n');
    const searchResults = await botDataService.searchHouses('Шевченко');
    searchResults.slice(0, 5).forEach(house => {
      console.log(`  ${house.Street}, ${house.House} - ${house.KeyInfo}`);
    });
    console.log(`  ... and ${searchResults.length - 5} more results`);
    
  } catch (err) {
    console.error('Error:', err);
  }
}

queryBotData();