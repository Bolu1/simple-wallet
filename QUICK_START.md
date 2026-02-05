# Quick Start Guide

## Local Development (Without Docker)

### Prerequisites
- Node.js v18+
- PostgreSQL 15 (or Docker for PostgreSQL only)
- Redis 7 (or Docker for Redis only)

### Setup

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Create environment file
cp .env.example .env

# 3. Update .env with your database connection
# DATABASE_URL=postgresql://user:password@localhost:5432/simple_wallet
# REDIS_URL=redis://localhost:6379

# 4. Build the project
npm run build

# 5. Start the application
npm run start:dev
```

The API will be available at `http://localhost:8000`

---

## Docker Development (Recommended)

### Prerequisites
- Docker Desktop installed and running

### Setup

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Start all services
docker-compose up -d

# 3. Verify services are running
docker-compose ps

# 4. Check logs
docker-compose logs -f app
```

The API will be available at `http://localhost:8000`

---

## Testing the Wallet Endpoint

### Get All Wallets

```bash
curl http://localhost:8000/wallets
```

Response:
```json
[
  {
    "id": "uuid-1",
    "userId": "user-uuid",
    "balance": 10000.00,
    "currency": "NGN",
    "createdAt": "2025-01-01T00:00:00Z",
    "updatedAt": "2025-01-01T00:00:00Z"
  }
]
```

---

## Database Access

### With Docker

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d simple_wallet

# Connect to Redis
docker-compose exec redis redis-cli
```

### Locally

```bash
# Connect to PostgreSQL
psql -U postgres -d simple_wallet

# Connect to Redis
redis-cli
```

---

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- interest.service.spec

# Run with coverage
npm test:cov

# Run in watch mode
npm test:watch
```

---

## Common Commands

### Development
```bash
npm run start:dev      # Start with hot reload
npm run build          # Build project
npm run lint           # Run ESLint
npm test               # Run tests
npm run seed           # Seed database with test data
```

### Docker
```bash
docker-compose up -d          # Start all services
docker-compose down           # Stop all services
docker-compose logs -f app    # View logs
docker-compose exec app bash  # Connect to app container
docker-compose restart app    # Restart app service
```

---

## Troubleshooting

### Port Already in Use
Update `.env`:
```bash
APPLICATION_PORT=8001
DATABASE_PORT=5433
REDIS_PORT=6380
```

### Dependencies Installation Error
```bash
npm install --legacy-peer-deps
```

### Docker Build Fails
```bash
docker-compose build --no-cache app
docker-compose up -d
```

### Database Connection Error
```bash
# Check if PostgreSQL is running
docker-compose logs postgres

# Verify environment variables in .env
cat .env
```

---

## Next Steps

1. **Create User**: Implement POST /users endpoint
2. **Create Wallet**: Implement POST /wallets endpoint
3. **Transfer Money**: Implement POST /transfers endpoint
4. **Get Interest History**: Already implemented in InterestService
5. **Authentication**: Add JWT authentication to endpoints

See [DOCKER_SETUP.md](DOCKER_SETUP.md) for detailed Docker information.
