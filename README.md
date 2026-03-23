# Codex Commerce

A production-ready eCommerce web application built with FastAPI, SQLAlchemy, JWT authentication, and a fully custom HTML/CSS/JavaScript frontend.

## Folder Structure

```text
app/
  database/      Database session, base models, seed logic
  models/        SQLAlchemy ORM models
  routes/        FastAPI routers for auth, products, cart, and orders
  schemas/       Pydantic request/response models
  services/      Business logic services
  static/        Custom CSS and vanilla JavaScript
  templates/     HTML entry point served by FastAPI
  utils/         Security helpers and shared dependencies
main.py          FastAPI application bootstrap
requirements.txt Python dependencies
.env.example     Environment variables example
tests/           API tests
```

## Setup Instructions

1. Create and activate a virtual environment.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
4. Run the app:
   ```bash
   uvicorn main:app --reload
   ```
5. Open `http://127.0.0.1:8000` in your browser.

## Default Admin Credentials

The app seeds an admin user on startup using `.env` values:

- Email: `admin@codexcommerce.local`
- Password: `Admin123`

## Database Schema

### users
- `id` integer primary key
- `email` unique string
- `full_name` string
- `password_hash` string
- `role` string (`user` or `admin`)
- `created_at` datetime

### products
- `id` integer primary key
- `name` string
- `description` text
- `image_url` string
- `price` float
- `stock` integer
- `created_at` datetime

### cart_items
- `id` integer primary key
- `user_id` foreign key to users
- `product_id` foreign key to products
- `quantity` integer

### orders
- `id` integer primary key
- `user_id` foreign key to users
- `status` string
- `total_amount` float
- `created_at` datetime

### order_items
- `id` integer primary key
- `order_id` foreign key to orders
- `product_id` foreign key to products
- `quantity` integer
- `unit_price` float

## Notes

- SQLite is the default database for quick local setup. Set `DATABASE_URL` to a PostgreSQL connection string for production.
- Checkout is mocked and places an order without real payment processing.
