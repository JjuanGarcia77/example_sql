# enfolded or diagram

|_EXAMPLE_SQL
|___docs
|    |___archive
|    |    |___mongodb
|    |    |   |_mongo.png
|    |    |___postman
|    |    |    |_post.png
|    |    |_data.csv
|    |    |_f1.csv
|    |    |_f2.csv
|    |__scripts
|    |    |_categories.csv
|    |    |_customer.csv
|    |    |_fullmigration.csv
|    |    |_order_deteils.csv
|    |    |_order.csv
|    |    |_products.csv
|    |    |_suppliers.csv
|    |
|    |__database.sql
|    |__DER.png
|
|__node_modules
|
|__uploads
|
|_.env
|
|_.gitignore
|
|_package-lock.json
|
|_package.json
|
|_README.md
|
|_server.js

# MegaStore API

## Overview

MegaStore API is a modern backend system for managing **customers, products, orders, suppliers, and categories**.  
It provides **RESTful endpoints** with SQL persistence (MySQL) and **audit logging in MongoDB**.

The system is designed for **data migration from legacy Excel/CSV files**, supporting **idempotent bulk upload** and advanced analytics.

---

## Tech Stack

- **Node.js** + **Express.js** for backend server
- **MySQL** for relational data storage
- **MongoDB** for audit logging
- **Multer** for CSV file uploads
- **CSV-Parse** for processing CSV files
- **dotenv** for environment variables

---

## Database Schema

- **SQL (MySQL)**: Customers, Products, Orders, OrderDetails, Suppliers, Categories  
- **NoSQL (MongoDB)**: Audit logs with action names and timestamps

---

## API Endpoints

### Customers
- `POST /api/customers` → Create a customer
- `GET /api/customers` → List all customers
- `PUT /api/customers/:id` → Update a customer
- `DELETE /api/customers/:id` → Delete a customer
- `GET /api/customers/:id/history` → Audit logs for a customer

### Products
- `POST /api/products` → Create a product
- `GET /api/products` → List all products
- `PUT /api/products/:id` → Update a product
- `DELETE /api/products/:id` → Delete a product
- `GET /api/products/:id/history` → Audit logs for a product

### Orders
- `POST /api/orders` → Create an order with details
- `GET /api/orders/:id/history` → Audit logs for an order

### CSV Uploads
- `POST /upload/customers` → Bulk upload customers
- `POST /upload/products` → Bulk upload products
- `POST /upload/orders` → Bulk upload orders
- `POST /upload/order-details` → Bulk upload order details
- `POST /upload/suppliers` → Bulk upload suppliers
- `POST /upload/categories` → Bulk upload categories
- `POST /upload/full-migration` → Massive CSV migration for all tables

### Analytics
- `GET /api/analytics/customers` → Total spent per customer
- `GET /api/analytics/products` → Total sold and revenue per product
- `GET /api/analytics/suppliers` → Total items sold and revenue per supplier

---

## How to Run Locally

1. Clone the repo:
```bash
git clone <repo-url>
cd <repo-folder>