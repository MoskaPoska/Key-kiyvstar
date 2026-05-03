# Local PostgreSQL via Docker

Use Docker for PostgreSQL and run the Node.js app locally.

## 1. Start PostgreSQL

```bash
docker compose up -d
```

This starts PostgreSQL on `localhost:5432` with:

- database: `keytracker`
- user: `postgres`
- password: `postgres`

## 2. Create local environment file

Create `.env` in the project root based on `.env.example`:

```env
PORT=3000
JWT_SECRET=change-me-to-a-long-random-string
ADMIN_PASSWORD=admin123
USER_PASSWORD=user123
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/keytracker
```

## 3. Install dependencies

```bash
npm install
```

## 4. Initialize application tables

```bash
npm run setup
```

This creates the main PostgreSQL tables and default users.

## 5. Import data from `bot_data.db`

```bash
npm run botdata:import
```

After that, addresses, TKD and equipment data will be read from PostgreSQL.

## 6. Start the app

```bash
npm start
```

Open `http://localhost:3000`.

## Useful commands

Start DB:

```bash
docker compose up -d
```

Stop DB:

```bash
docker compose down
```

Stop DB and remove volume data:

```bash
docker compose down -v
```

View logs:

```bash
docker compose logs -f postgres
```

## Notes

- The PostgreSQL data is stored in the Docker volume `postgres_data`.
- `bot_data.db` stays in the repo only as the import source.
- On the server you do not need `bot_data.db` if the import has already been completed into PostgreSQL.
