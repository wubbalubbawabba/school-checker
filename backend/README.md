# School Status Backend API

Node.js backend using SQLite to check if schools in The Gap, Queensland are open on specific dates.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Start the server:
```bash
npm start
```

The server will automatically:
- Create the SQLite database (`school_status.db`)
- Set up all tables
- Seed data (schools, term dates, public holidays)

## API Endpoints

### GET /api/schools
Get all active schools.

**Response:**
```json
[
  {
    "id": "uuid",
    "name": "The Gap State School",
    "school_type": "State School",
    "suburb": "The Gap",
    "postcode": "4061",
    "state": "QLD"
  }
]
```

### GET /api/check
Check if a school is open on a specific date.

**Query Parameters:**
- `schoolId` (required): School UUID
- `date` (required): Date in YYYY-MM-DD format

**Example:**
```
GET /api/check?schoolId=xxx&date=2026-01-27
```

**Response:**
```json
{
  "status": "Open",
  "reason": "Term 1",
  "schoolName": "The Gap State School",
  "date": "2026-01-27"
}
```

### POST /api/check
Alternative endpoint using POST body.

**Body:**
```json
{
  "schoolId": "xxx",
  "date": "2026-01-27"
}
```

### GET /api/health
Health check endpoint.

## Logic Priority

The `checkSchoolStatus` function checks in this order:

1. **School Events** - School-specific closures (highest priority)
2. **Public Holidays** - State-wide holidays
3. **Weekends** - Saturday and Sunday
4. **Term Dates** - Within term = Open, outside = School Holidays

## Database Schema

- **term_rules**: Stores term date structures (JSON format)
- **public_holidays**: State-wide public holidays
- **schools**: School information
- **school_events**: School-specific events and closures

## Notes

- Database is created automatically on first run
- All UUIDs are stored as TEXT in SQLite
- JSONB fields are stored as TEXT and parsed in JavaScript
- Timestamps are stored as ISO strings



