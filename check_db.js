const initSqlJs = require('sql.js').default;
const fs = require('fs');

initSqlJs().then(SQL => {
  const buf = fs.readFileSync('bot_data.db');
  const db = new SQL.Database(buf);
  
  // Get tables
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
  console.log('Tables:', tables[0].values.map(r => r[0]));
  
  // Get column info for each table
  ['Houses', 'Keys_Backup', 'Equipments'].forEach(table => {
    try {
      const result = db.exec("SELECT * FROM " + table + " LIMIT 1");
      if (result.length > 0) {
        console.log('\n' + table + ' columns:', result[0].columns);
        console.log(table + ' sample row:', result[0].values[0]);
      }
    } catch(e) {
      console.log('\n' + table + ': Error -', e.message);
    }
  });
  
  // Count records
  const houses = db.exec('SELECT COUNT(*) FROM Houses')[0].values[0][0];
  const keys = db.exec('SELECT COUNT(*) FROM Keys_Backup')[0].values[0][0];
  const eq = db.exec('SELECT COUNT(*) FROM Equipments')[0].values[0][0];
  console.log('\nRecord counts:');
  console.log('  Houses:', houses);
  console.log('  Keys_Backup:', keys);
  console.log('  Equipments:', eq);
});
