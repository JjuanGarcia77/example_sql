1️⃣ Instalar Node.js y npm

Node.js es necesario para correr tu API Express.js.

Windows / Linux / WSL:

Descarga desde Node.js official
 (versión LTS recomendada).

Verifica instalación:

node -v
npm -v

Debe mostrar las versiones instaladas.

2️⃣ Instalar MySQL

Tu proyecto usa MySQL para la parte relacional.

Windows / WSL

Descarga MySQL Community Server: MySQL Downloads

Instala y recuerda el usuario y contraseña que pongas.

Opcional: instala MySQL Workbench para ver tus tablas gráficamente.

Prueba conexión:

mysql -u root -p

Crea la base de datos que usarás:

CREATE DATABASE megastore;
3️⃣ Instalar MongoDB

Tu proyecto usa MongoDB para el log de auditoría.

Windows / WSL

Descarga MongoDB Community: MongoDB Download Center

Instala y habilita el servicio.

Inicia MongoDB:

# Windows CMD o PowerShell
net start MongoDB

# Linux / WSL
sudo systemctl start mongod
sudo systemctl enable mongod

Verifica conexión:

mongo
show dbs
4️⃣ Clonar tu proyecto de GitHub
git clone https://github.com/tu-usuario/megastore-api.git
cd megastore-api
5️⃣ Instalar dependencias de Node.js

Dentro de la carpeta del proyecto:

npm install

Esto instalará:

express

mysql2

mongoose

dotenv

multer

csv-parse

y todas las demás que tu package.json tenga.

6️⃣ Configurar .env

Crea un archivo .env en la raíz del proyecto con tus credenciales:

PORT=3000

# MySQL
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=tu_password
MYSQL_DATABASE=megastore
MYSQL_PORT=3306

# MongoDB
MONGO_URI=mongodb://localhost:27017/megastore

⚠️ Cambia los valores según tu instalación.

7️⃣ Crear tablas en MySQL

Tu proyecto requiere ciertas tablas (customers, products, orders, order_details, suppliers, categories).

Puedes crear un script SQL db.sql como este:

CREATE TABLE customers (
    customer_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    address VARCHAR(255),
    phone VARCHAR(50)
);

CREATE TABLE suppliers (
    supplier_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100),
    email VARCHAR(100) UNIQUE
);

CREATE TABLE categories (
    category_id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) UNIQUE
);

CREATE TABLE products (
    product_id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(50) UNIQUE,
    name VARCHAR(100),
    unit_price DECIMAL(10,2),
    category_id INT,
    supplier_id INT,
    FOREIGN KEY (category_id) REFERENCES categories(category_id),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
);

CREATE TABLE orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_code VARCHAR(50) UNIQUE,
    customer_id INT,
    order_date DATE,
    FOREIGN KEY (customer_id) REFERENCES customers(customer_id)
);

CREATE TABLE order_details (
    order_detail_id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT,
    product_id INT,
    quantity INT,
    total_line_value DECIMAL(10,2),
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (product_id) REFERENCES products(product_id)
);

Ejecuta este script en MySQL Workbench o consola:

mysql -u root -p megastore < db.sql
8️⃣ Ejecutar el servidor
node server.js
# o si tienes nodemon instalado
nodemon server.js

Deberías ver:

Server running on http://localhost:3000
MongoDB connected
9️⃣ Probar endpoints en Postman

Algunos ejemplos:

Customers CRUD

GET: http://localhost:3000/api/customers

POST: http://localhost:3000/api/customers

{ "name": "Juan Perez", "email": "juan@email.com", "address": "Calle 123", "phone": "555-1234" }

PUT: http://localhost:3000/api/customers/1

DELETE: http://localhost:3000/api/customers/1

Products CRUD

GET: /api/products

POST: /api/products

Orders

POST: /api/orders con detalles en JSON

Auditoría / logs

GET: /api/customers/1/history

GET: /api/products/1/history

GET: /api/orders/1/history

Business Intelligence

GET: /api/analytics/customers

GET: /api/analytics/products

CSV uploads

POST: /upload/customers (multipart/form-data, file)

POST: /upload/full-migration