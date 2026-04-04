// Скрипт для добавления тестовых пользователей
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/people/add',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
};

async function addPerson(name, phone, isAdmin) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log(`${name}: ${res.statusCode} - ${data}`);
        resolve();
      });
    });
    req.on('error', reject);
    req.write(JSON.stringify({ name, phone, isAdmin }));
    req.end();
  });
}

async function main() {
  console.log('Добавление тестовых пользователей...\n');
  await addPerson('Администратор', '+380501234567', true);
  await addPerson('Обычный Пользователь', '', false);
  console.log('\nГотово!');
}

main().catch(console.error);