require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const mongoose = require('mongoose');
const { parse } = require('csv-parse');
const fs = require('fs');
const multer = require('multer');

const app = express();
app.use(express.json());

const upload = multer({ dest: 'uploads/' });

/* ===============================
   MYSQL CONNECTION
=================================*/
const pool = mysql.createPool({
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    port: process.env.MYSQL_PORT
});

/* ===============================
   MONGODB CONNECTION (AUDIT)
=================================*/
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("MongoDB connected"))
    .catch(err => console.error("Mongo error:", err));

const auditSchema = new mongoose.Schema({
    action: String,
    date: { type: Date, default: Date.now }
});

const Audit = mongoose.model('audit_logs', auditSchema);

// Log con ID opcional
async function logActionWithId(action, entityId = null) {
    const logEntry = entityId ? `${action}_${entityId}` : action;
    await Audit.create({ action: logEntry });
}
 /* manipula*/
/* ===============================
   CRUD CUSTOMERS PROTEGIDO
=================================*/

app.post('/api/customers', async (req, res) => {
    try {
        const { name, email, address, phone } = req.body || {};

        if (!name || !email || !address || !phone) {
            return res.status(400).json({ error: "Todos los campos son obligatorios" });
        }

        const [result] = await pool.query(
            `INSERT INTO customers (name,email,address,phone)
             VALUES (?,?,?,?)`,
            [name, email, address, phone]
        );

        const customerId = result.insertId;
        await logActionWithId("create_customer", customerId);

        res.status(201).json({ id: customerId });

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/customers', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM customers');
        await logActionWithId("run_query");
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/customers/:id', async (req, res) => {
    try {
        const { name, email, address, phone } = req.body || {};
        const customerId = req.params.id;

        if (!name || !email || !address || !phone) {
            return res.status(400).json({ error: "Todos los campos son obligatorios" });
        }

        await pool.query(
            `UPDATE customers
             SET name=?, email=?, address=?, phone=?
             WHERE customer_id=?`,
            [name, email, address, phone, customerId]
        );

        await logActionWithId("update_customer", customerId);
        res.json({ message: "Updated" });

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/api/customers/:id', async (req, res) => {
    try {
        const customerId = req.params.id;

        await pool.query(
            'DELETE FROM customers WHERE customer_id=?',
            [customerId]
        );

        await logActionWithId("delete_customer", customerId);
        res.json({ message: "Deleted" });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/* ===============================
   CUSTOMER HISTORY
=================================*/
app.get('/api/customers/:id/history', async (req, res) => {
    try {
        const customerId = req.params.id;
        const logs = await Audit.find({ action: new RegExp(`_${customerId}$`) })
                                .sort({ date: -1 });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
/* ===============================
   CRUD PRODUCTS
=================================*/
app.post('/api/products', async (req, res) => {
    try {
        const { sku, name, unit_price, category_id, supplier_id } = req.body;

        const [result] = await pool.query(
            `INSERT INTO products (sku,name,unit_price,category_id,supplier_id)
             VALUES (?,?,?,?,?)`,
            [sku, name, unit_price, category_id, supplier_id]
        );

        const productId = result.insertId;
        await logActionWithId("create_product", productId);

        res.status(201).json({ id: productId });

    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

app.get('/api/products', async (req, res) => {
    const [rows] = await pool.query(`
        SELECT p.product_id,
               p.sku,
               p.name,
               p.unit_price,
               c.name AS category,
               s.name AS supplier
        FROM products p
        JOIN categories c ON p.category_id = c.category_id
        JOIN suppliers s ON p.supplier_id = s.supplier_id
    `);

    await logActionWithId("run_query");
    res.json(rows);
});

app.put('/api/products/:id', async (req, res) => {
    const { name, unit_price, category_id, supplier_id } = req.body;
    const productId = req.params.id;

    await pool.query(
        `UPDATE products
         SET name=?, unit_price=?, category_id=?, supplier_id=?
         WHERE product_id=?`,
        [name, unit_price, category_id, supplier_id, productId]
    );

    await logActionWithId("update_product", productId);
    res.json({ message: "Updated" });
});

app.delete('/api/products/:id', async (req, res) => {
    const productId = req.params.id;

    await pool.query(
        'DELETE FROM products WHERE product_id=?',
        [productId]
    );

    await logActionWithId("delete_product", productId);
    res.json({ message: "Deleted" });
});

/* ===============================
   CREATE ORDER WITH DETAILS
=================================*/
app.post('/api/orders', async (req, res) => {

    const connection = await pool.getConnection();

    try {
        await connection.beginTransaction();

        const { transaction_code, customer_id, order_date, details } = req.body;

        const [orderResult] = await connection.query(
            `INSERT INTO orders (transaction_code,customer_id,order_date)
             VALUES (?,?,?)`,
            [transaction_code, customer_id, order_date]
        );

        const orderId = orderResult.insertId;

        for (const item of details) {
            const totalLine = item.quantity * item.unit_price;

            await connection.query(
                `INSERT INTO order_details (order_id,product_id,quantity,total_line_value)
                 VALUES (?,?,?,?)`,
                [orderId, item.product_id, item.quantity, totalLine]
            );
        }

        await connection.commit();
        await logActionWithId("create_order", orderId);

        res.json({ message: "Order created", order_id: orderId });

    } catch (error) {
        await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});

/*No tocar */
/* ===============================
   CSV UPLOADS (ALL TABLES)
=================================*/
function processCSV(filePath, callback) {
    const rows = [];
    fs.createReadStream(filePath)
        .pipe(parse({ columns: true, trim: true }))
        .on('data', row => rows.push(row))
        .on('end', () => callback(rows));
}

/* CUSTOMERS CSV */
app.post('/upload/customers', upload.single('file'), (req, res) => {
    processCSV(req.file.path, async (rows) => {
        try {
            for (const row of rows) {
                await pool.query(`
                    INSERT INTO customers (name,email,address,phone)
                    VALUES (?,?,?,?)
                    ON DUPLICATE KEY UPDATE
                    name=VALUES(name),
                    address=VALUES(address),
                    phone=VALUES(phone)
                `, [row.name, row.email, row.address, row.phone]);
            }
            await logActionWithId("csv_customers_upload");
            res.json({ message: "Customers uploaded", total: rows.length });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
});

/* SUPPLIERS CSV */
app.post('/upload/suppliers', upload.single('file'), (req, res) => {
    processCSV(req.file.path, async (rows) => {
        try {
            for (const row of rows) {
                await pool.query(`
                    INSERT INTO suppliers (name,email)
                    VALUES (?,?)
                    ON DUPLICATE KEY UPDATE name=VALUES(name)
                `, [row.name, row.email]);
            }
            await logActionWithId("csv_suppliers_upload");
            res.json({ message: "Suppliers uploaded", total: rows.length });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
});

/* CATEGORIES CSV */
app.post('/upload/categories', upload.single('file'), (req, res) => {
    processCSV(req.file.path, async (rows) => {
        try {
            for (const row of rows) {
                await pool.query(`
                    INSERT INTO categories (name)
                    VALUES (?)
                    ON DUPLICATE KEY UPDATE name=VALUES(name)
                `, [row.name]);
            }
            await logActionWithId("csv_categories_upload");
            res.json({ message: "Categories uploaded", total: rows.length });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
});

/* PRODUCTS CSV */
app.post('/upload/products', upload.single('file'), (req, res) => {
    processCSV(req.file.path, async (rows) => {
        try {
            for (const row of rows) {
                await pool.query(`
                    INSERT INTO products (sku,name,unit_price,category_id,supplier_id)
                    VALUES (?,?,?,?,?)
                    ON DUPLICATE KEY UPDATE
                    name=VALUES(name),
                    unit_price=VALUES(unit_price)
                `, [row.sku, row.name, row.unit_price, row.category_id, row.supplier_id]);
            }
            await logActionWithId("csv_products_upload");
            res.json({ message: "Products uploaded", total: rows.length });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
});

/* ORDERS CSV */
app.post('/upload/orders', upload.single('file'), (req, res) => {
    processCSV(req.file.path, async (rows) => {
        try {
            for (const row of rows) {
                await pool.query(`
                    INSERT INTO orders (transaction_code,customer_id,order_date)
                    VALUES (?,?,?)
                    ON DUPLICATE KEY UPDATE order_date=VALUES(order_date)
                `, [row.transaction_code, row.customer_id, row.order_date]);
            }
            await logActionWithId("csv_orders_upload");
            res.json({ message: "Orders uploaded", total: rows.length });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
});

/*NO TOCAR MUERTE */
/* ORDER DETAILS CSV */
app.post('/upload/order-details', upload.single('file'), (req, res) => {
    processCSV(req.file.path, async (rows) => {
        try {
            for (const row of rows) {
                await pool.query(`
                    INSERT INTO order_details (order_id,product_id,quantity,total_line_value)
                    VALUES (?,?,?,?)
                `, [row.order_id, row.product_id, row.quantity, row.total_line_value]);
            }
            await logActionWithId("csv_order_details_upload");
            res.json({ message: "Order details uploaded", total: rows.length });
        } catch (error) {
            res.status(500).json({ error: error.message });
        }
    });
});

/* ===============================
   MASSIVE MIGRATION - FLAT CSV
=================================*/
app.post('/upload/full-migration', upload.single('file'), (req, res) => {

    processCSV(req.file.path, async (rows) => {

        const connection = await pool.getConnection();

        try {
            await connection.beginTransaction();

            for (const row of rows) {

                /* 1️ CUSTOMER (idempotent) */
                const [customerResult] = await connection.query(`
                    INSERT INTO customers (name,email,address,phone)
                    VALUES (?,?,?,NULL)
                    ON DUPLICATE KEY UPDATE name=VALUES(name)
                `, [row.customer_name, row.customer_email, row.address]);

                const [customer] = await connection.query(
                    `SELECT customer_id FROM customers WHERE email=?`,
                    [row.customer_email]
                );

                const customerId = customer[0].customer_id;

                /* 2️ CATEGORY */
                await connection.query(`
                    INSERT INTO categories (name)
                    VALUES (?)
                    ON DUPLICATE KEY UPDATE name=VALUES(name)
                `, [row.category_name]);

                const [category] = await connection.query(
                    `SELECT category_id FROM categories WHERE name=?`,
                    [row.category_name]
                );

                const categoryId = category[0].category_id;

                /* 3 SUPPLIER */
                await connection.query(`
                    INSERT INTO suppliers (name,email)
                    VALUES (?,?)
                    ON DUPLICATE KEY UPDATE name=VALUES(name)
                `, [row.supplier_name, row.supplier_email]);

                const [supplier] = await connection.query(
                    `SELECT supplier_id FROM suppliers WHERE email=?`,
                    [row.supplier_email]
                );

                const supplierId = supplier[0].supplier_id;

                /* 4️ PRODUCT */
                await connection.query(`
                    INSERT INTO products (sku,name,unit_price,category_id,supplier_id)
                    VALUES (?,?,?,?,?)
                    ON DUPLICATE KEY UPDATE
                    name=VALUES(name),
                    unit_price=VALUES(unit_price)
                `, [
                    row.sku,
                    row.product_name,
                    row.unit_price,
                    categoryId,
                    supplierId
                ]);

                const [product] = await connection.query(
                    `SELECT product_id FROM products WHERE sku=?`,
                    [row.sku]
                );

                const productId = product[0].product_id;

                /* 5️ ORDER */
                await connection.query(`
                    INSERT INTO orders (transaction_code,customer_id,order_date)
                    VALUES (?,?,?)
                    ON DUPLICATE KEY UPDATE order_date=VALUES(order_date)
                `, [
                    row.transaction_id,
                    customerId,
                    row.date
                ]);

                const [order] = await connection.query(
                    `SELECT order_id FROM orders WHERE transaction_code=?`,
                    [row.transaction_id]
                );

                const orderId = order[0].order_id;

                /* 6️ ORDER DETAIL */
                const totalLine = row.quantity * row.unit_price;

                await connection.query(`
                    INSERT INTO order_details (order_id,product_id,quantity,total_line_value)
                    VALUES (?,?,?,?)
                `, [orderId, productId, row.quantity, totalLine]);
            }

            await connection.commit();
            await logActionWithId("full_migration_executed");

            res.json({ message: "Full migration completed", rows: rows.length });

        } catch (error) {
            await connection.rollback();
            res.status(500).json({ error: error.message });
        } finally {
            connection.release();
        }
    });
});

/* ===============================
   BUSINESS INTELLIGENCE
=================================*/
app.get('/api/analytics/customers', async (req, res) => {
    const [rows] = await pool.query(`
        SELECT c.name,
               SUM(od.total_line_value) AS total_spent
        FROM customers c
        JOIN orders o ON c.customer_id = o.customer_id
        JOIN order_details od ON o.order_id = od.order_id
        GROUP BY c.customer_id
        ORDER BY total_spent DESC
    `);
    await logActionWithId("run_query");
    res.json(rows);
});

app.get('/api/analytics/products', async (req, res) => {
    const [rows] = await pool.query(`
        SELECT p.name,
               SUM(od.quantity) AS total_sold,
               SUM(od.total_line_value) AS revenue
        FROM products p
        JOIN order_details od ON p.product_id = od.product_id
        GROUP BY p.product_id
        ORDER BY total_sold DESC
    `);
    await logActionWithId("run_query");
    res.json(rows);
});

/* ===============================
   BUSINESS INTELLIGENCE - SUPPLIERS
=================================*/

app.get('/api/analytics/suppliers', async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT 
                s.name AS supplier_name,
                COUNT(od.product_id) AS total_items_sold,
                SUM(od.total_line_value) AS total_revenue
            FROM suppliers s
            JOIN products p ON s.supplier_id = p.supplier_id
            JOIN order_details od ON p.product_id = od.product_id
            GROUP BY s.supplier_id
            ORDER BY total_items_sold DESC
        `);

        // Log de auditoría en MongoDB
        await logActionWithId("run_supplier_analytics");

        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/* ===============================
   CUSTOMER / PRODUCT / ORDER HISTORY
=================================*/
app.get('/api/customers/:id/history', async (req, res) => {
    try {
        const customerId = req.params.id;
        const logs = await Audit.find({ action: new RegExp(`_${customerId}$`) })
                                .sort({ date: -1 });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/products/:id/history', async (req, res) => {
    try {
        const productId = req.params.id;
        const logs = await Audit.find({ action: new RegExp(`_${productId}$`) })
                                .sort({ date: -1 });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/orders/:id/history', async (req, res) => {
    try {
        const orderId = req.params.id;
        const logs = await Audit.find({ action: new RegExp(`_${orderId}$`) })
                                .sort({ date: -1 });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/* ===============================
   START SERVER
=================================*/
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});