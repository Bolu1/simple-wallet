# Simple Wallet App

This is the repository for the Sycamore backend task. I have leveraged a modern tech stack to ensure data precision, system reliability, and maintainability through clean architecture.

---

## 🏗️ Architectural Decisions

This project is built with a focus on **long-term scalability** and **fault tolerance**. Here are my key design choices:

* **Domain-Driven Design (DDD):** I organized the codebase by feature modules (User, Wallet, Transfer, Interest). This ensures that business logic is encapsulated within its own domain, making the system easier to navigate and scale.
* **Repository Pattern:** I used repositories to abstract the data access layer (Sequelize). By injecting repositories into my services rather than models directly, I decoupled business logic from the ORM, facilitating easier unit testing and providing the flexibility to switch data sources in the future.
* **Eventual Consistency via Message Queues:** For transaction processing, I opted for **Bull Queue (Redis)**. Instead of processing heavy financial transfers in a single request-response cycle, I queue them. This ensures:
* **Scalability:** The system can handle spikes in transaction volume without crashing.
* **Reliability:** Built-in retry mechanisms with exponential backoff handle transient database or network failures.
* **User Experience:** The API responds immediately, while the heavy lifting happens in the background.


* **Precision Engineering:** In fintech, floating-point math is a liability. I used **`decimal.js`** for all balance and interest calculations to ensure zero rounding errors.

---

## 💰 Interest Calculation Service

A standout feature of this wallet is the **Automated Interest Accrual**.

* **Rate:** 27.5% APR (Annual Percentage Rate).
* **Formula:** Interest is calculated daily using the following formula:


* **Logic:** The service automatically detects leap years (366 days) vs. non-leap years (365 days) to ensure absolute accuracy.

---

## 🚀 Getting Started

### Prerequisites

* **Docker** and **Docker Compose**
* Node.js 18+ (if running locally)

### Setup Instructions

1. **Clone the Repository:**
```bash
git clone https://github.com/Bolu1/simple-wallet.git
cd simple-wallet

```


2. **Environment Configuration:**
There is an `.env.example` file included in the root directory. Copy it to create your local environment file:
```bash
cp .env.example .env

```


*Update the variables in `.env` if you have specific port preferences.*
3. **Start the Application:**
You can run the entire stack (PostgreSQL, Redis, NestJS) using Docker:
```bash
docker-compose up -d --build

```


*Alternatively, for local development, ensure Postgres and Redis are running, then use `npm run start:dev`.*

---

## 🗄️ Database Management

### Seeding the Database

To populate your environment with test data (Users and Wallets), use the following command to reach inside the running container:

```bash
docker exec -it simple-wallet-app npm run seed:prod

```

---

## 🛠️ API Highlights

The API follows standard RESTful principles.

### 1. Get All User Wallets

* **Endpoint:** `GET /wallets`
* **Description:** Retrieves all wallets associated with the authenticated user. **Use this to get the `Wallet IDs` needed for transfers.**

### 2. Initiate Transfer

* **Endpoint:** `POST /v1/transfer`
* **Header:** `x-idempotency-key: <UUID>` (Mandatory to prevent double-spending/duplicate transactions).
* **Body:**
```json
{
    "fromWalletId": "2f970b6d-9d8b-475f-859a-4e85d57bc92b",
    "toWalletId": "332ebe85-2a12-4b03-adfb-c830587b128e",
    "amount": 100
}

```



---

## 🧪 Testing

The project includes a comprehensive test suite using Jest, covering precision math, leap year edge cases, and queue processing.

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:cov

```
