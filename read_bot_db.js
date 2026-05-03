const initSqlJs = require('sql.js').default;
initSqlJs().then(SQL => {
  const db = new SQL.Database(require('fs').readFileSync('bot_data.db'));
  const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
  console.log('Tables:', tables[0].values.map(r => r[0]));
  for (const tableName of tables[0].values.map(r => r[0])) {
    console.log('\n=== Table:', tableName, '===');
    const result = db.exec('SELECT * FROM ' + tableName + ' LIMIT 5');
    if (result.length > 0) {
      console.log('Columns:', result[0].columns);
      console.log('Rows:', result[0].values.length);
      console.log('Sample data:');
      result[0].values.forEach(row => {
        console.log(row);
      });
    }
    const count = db.exec('SELECT COUNT(*) as cnt FROM ' + tableName);
    console.log('Total rows:', count[0].values[0][0]);
  }
  db.close();
});