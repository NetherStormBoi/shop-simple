// server.js
require('dotenv').config(); // NEW: Loads our secret .env file first!

const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');

const app = express();
const PORT = process.env.PORT || 3000; //This means: "Use the cloud provider's port if it exists, otherwise use 3000 for local testing."

app.use(cors());
app.use(express.json());

// ==========================================
// UPDATED: BULLETPROOF CLOUD CONNECTION POOL
// ==========================================
// We now pull the credentials safely from process.env
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
        rejectUnauthorized: false 
    },
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    enableKeepAlive: true,        // CRITICAL FIX: Stops Aiven from dropping the connection
    keepAliveInitialDelay: 10000  // Pings the cloud every 10 seconds
});

// Test the pool to make sure it connects
db.getConnection((err, connection) => {
    if (err) {
        console.error("❌ Cloud Database connection failed:", err.message);
        return;
    }
    console.log("☁️ ✅ Connected to Aiven Cloud MySQL via Bulletproof Pool!");
    connection.release(); 
});

// ==========================================
// NEW: ONE-TIME SETUP ROUTE (To build cloud tables)
// ==========================================
app.get('/api/setup', (req, res) => {
    const createProducts = `
        CREATE TABLE IF NOT EXISTS products (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            image VARCHAR(255)
        );
    `;
    const createOrders = `
        CREATE TABLE IF NOT EXISTS orders (
            id INT AUTO_INCREMENT PRIMARY KEY,
            total_amount DECIMAL(10, 2) NOT NULL,
            items_summary TEXT NOT NULL,
            order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    `;
    const insertProducts = `
        INSERT INTO products (name, price, image) VALUES
        ('Premium Wireless Headphones', 299.00, 'https://placehold.co/400'),
        ('Mechanical Keyboard', 150.00, 'https://placehold.co/400'),
        ('Gaming Mouse', 80.00, 'https://placehold.co/400'),
        ('Ultrawide Monitor', 450.00, 'https://placehold.co/400');
    `;

    // Run the queries in sequence
    db.query(createProducts, (err) => {
        if (err) return res.send("Error creating products table: " + err.message);
        
        db.query(createOrders, (err) => {
            if (err) return res.send("Error creating orders table: " + err.message);
            
            // Only insert products if the table was just created (avoid duplicates)
            db.query("SELECT * FROM products", (err, results) => {
                if (results.length === 0) {
                    db.query(insertProducts, (err) => {
                        if (err) return res.send("Error inserting products: " + err.message);
                        res.send("✅ Cloud Database Setup Complete! You can close this tab.");
                    });
                } else {
                    res.send("✅ Tables exist and are already populated!");
                }
            });
        });
    });
});

// --- EXISTING ROUTES ---
app.get('/', (req, res) => { res.send("Welcome to the ShopSimple API! 🛒"); });

app.get('/api/products', (req, res) => {
    db.query("SELECT * FROM products", (err, results) => {
        if (err) return res.status(500).json({ error: "Failed to fetch products" });
        res.json(results);
    });
});

app.post('/api/checkout', (req, res) => {
    const orderData = req.body; 
    const totalAmount = orderData.total;
    const itemsSummary = JSON.stringify(orderData.items);
    const sqlQuery = "INSERT INTO orders (total_amount, items_summary) VALUES (?, ?)";

    db.query(sqlQuery, [totalAmount, itemsSummary], (err, results) => {
        if (err) return res.status(500).json({ message: "Checkout failed. Database error." });
        res.json({ message: "Order secured in the cloud!", orderId: results.insertId });
    });
});

app.get('/api/orders', (req, res) => {
    db.query("SELECT * FROM orders ORDER BY order_date DESC", (err, results) => {
        if (err) return res.status(500).json({ error: "Failed to fetch orders" });
        res.json(results);
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Server is running on http://localhost:${PORT}`);
});