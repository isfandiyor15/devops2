const express = require('express');
const { Client } = require('pg');
const client = require('prom-client');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware for JSON body parsing
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Prometheus Metrics
const register = client.register;
client.collectDefaultMetrics();

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 1.5, 2, 5],
});

const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of DB queries in seconds',
  labelNames: ['query'],
  buckets: [0.1, 0.5, 1, 1.5, 2, 5],
});

// Request Instrumentation Middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    httpRequestsTotal.inc({ method: req.method, route, status_code: res.statusCode });
    httpRequestDuration.observe({ method: req.method, route, status_code: res.statusCode }, duration);
  });
  next();
});

// Database Connection
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'postgres',
  port: process.env.DB_PORT || 5432,
};

const pgClient = new Client(dbConfig);
let dbConnected = false;

async function connectDB() {
  try {
    await pgClient.connect();
    console.log('Connected to PostgreSQL');
    dbConnected = true;
    
    // Migration
    const queryStart = Date.now();
    await pgClient.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        price NUMERIC NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    const duration = (Date.now() - queryStart) / 1000;
    dbQueryDuration.observe({ query: 'create_table' }, duration);
    console.log('Migration completed');
  } catch (err) {
    console.error('DB Connection error:', err);
    setTimeout(connectDB, 5000);
  }
}

connectDB();

// Endpoints
app.get('/healthz', (req, res) => {
  res.status(200).send('ok');
});

app.get('/readyz', (req, res) => {
  if (dbConnected) {
    res.status(200).send('ok');
  } else {
    res.status(500).send('db not ready');
  }
});

app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

app.get('/products', async (req, res) => {
  if (!dbConnected) return res.status(503).json({ error: 'DB not connected' });
  try {
    const start = Date.now();
    const result = await pgClient.query('SELECT * FROM products ORDER BY created_at DESC LIMIT 50');
    const duration = (Date.now() - start) / 1000;
    dbQueryDuration.observe({ query: 'select_products' }, duration);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.post('/products', async (req, res) => {
  if (!dbConnected) return res.status(503).json({ error: 'DB not connected' });
  const { name, price } = req.body;
  if (!name || !price) return res.status(400).json({ error: 'Name and price required' });

  try {
    const start = Date.now();
    const result = await pgClient.query(
      'INSERT INTO products (name, price) VALUES ($1, $2) RETURNING *',
      [name, price]
    );
    const duration = (Date.now() - start) / 1000;
    dbQueryDuration.observe({ query: 'insert_product' }, duration);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const server = app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});

module.exports = { app, server, pgClient }; // Export for testing
