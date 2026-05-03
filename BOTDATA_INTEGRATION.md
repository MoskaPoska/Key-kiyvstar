# Bot Data Integration

This project integrates the `bot_data.db` SQLite database containing information about addresses, keys, and TKD (technical compartments) for the Key Tracker system.

## Database Structure

The `bot_data.db` file contains three tables:

### 1. Keys_Backup (175 records)
- **Id**: Unique identifier
- **Zone**: Zone number (1-18)
- **Street**: Street name
- **House**: House number
- **KeyInfo**: Contact information and notes
- **TKD**: Technical compartment information
- **NumTKD**: TKD numbers

### 2. Houses (223 records)
- **Id**: Unique identifier
- **Zone**: Zone number (1-18)
- **Street**: Street name
- **House**: House number
- **KeyInfo**: Contact information

### 3. Equipments (449 records)
- **Id**: Unique identifier
- **HouseId**: Reference to Houses table
- **NumTKD**: TKD numbers
- **Entrance**: Entrance information
- **Floor**: Floor information

## Available Zones

The database contains data for zones: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 16, 17, 18

## API Endpoints

### Get Statistics
```
GET /api/botdata/stats
```
Returns summary statistics about the database.

### Get All Keys Backup
```
GET /api/botdata/keys?limit=1000
```
Returns all keys backup records.

### Get Keys by Zone
```
GET /api/botdata/keys/zone/:zone
```
Returns keys for a specific zone.

### Get All Houses
```
GET /api/botdata/houses?limit=1000
```
Returns all houses.

### Get Houses by Zone
```
GET /api/botdata/houses/zone/:zone
```
Returns houses for a specific zone.

### Search Houses
```
GET /api/botdata/houses/search?q=query
```
Searches houses by street or house number.

### Get All Equipments
```
GET /api/botdata/equipments?limit=1000
```
Returns all equipment records.

### Get Equipments by House
```
GET /api/botdata/equipments/house/:houseId
```
Returns equipment for a specific house.

### Import to PostgreSQL (Admin Only)
```
POST /api/botdata/import
```
Imports bot data into PostgreSQL database.

## Usage

### Query Bot Data via CLI
```bash
npm run botdata:query
```

### Import Bot Data to PostgreSQL
```bash
npm run botdata:import
```

### View Statistics
```bash
npm run botdata:stats
```

### Access Web Interface
Open `public/botdata.html` in a browser or navigate to the botdata page in the application.

## Files

- `src/db/models/BotData.js` - SQLite database model
- `src/services/BotDataService.js` - Service layer for bot data operations
- `src/routes/botdata.js` - API routes
- `scripts/query-botdata.js` - CLI query script
- `scripts/migrate-botdata.js` - Migration script for PostgreSQL import
- `public/botdata.html` - Web interface for browsing bot data

## Recommended Architecture

Use `bot_data.db` as the source of truth for the initial import, and use PostgreSQL as the main application database both locally and on the server:

1. **SQLite Source**: `bot_data.db` is read using `sql.js` without modifying the original file
2. **Primary Runtime Storage**: PostgreSQL stores imported addresses, TKD and equipment data for the running application
3. **Automatic Fallback**: If PostgreSQL bot data tables are not available yet, the application can still read from `bot_data.db`
4. **Authentication Required**: All API endpoints require authentication
5. **Admin-Only Import**: PostgreSQL import requires admin privileges

## Local Development Flow

1. Start PostgreSQL locally
2. Set `DATABASE_URL`
3. Run:

```bash
npm run setup
npm run botdata:import
```

After import, the application will read bot data from PostgreSQL. The SQLite file remains useful for re-import or recovery.

## Deployment Flow

1. Create a PostgreSQL database on the server
2. Set `DATABASE_URL` in the server environment
3. Deploy the project
4. Run:

```bash
npm run setup:prod
npm run botdata:import
```

If the server does not contain `bot_data.db`, the app can still work as long as the data has already been imported into PostgreSQL.

## Security

- All bot data API endpoints require authentication
- PostgreSQL import requires admin role
- Original SQLite database is read-only
- No modifications are made to `bot_data.db`

## Dependencies

- `sql.js` (^1.10.0) - SQLite database engine for JavaScript

## Notes

- The bot_data.db file contains Ukrainian address data for Kyivstar infrastructure
- TKD (технічний приміщення) refers to technical compartments/equipment rooms
- Data includes contact information for key holders at various addresses
- The system supports 16 different zones across Kyiv
