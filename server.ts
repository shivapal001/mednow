import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("mednow.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    phone TEXT UNIQUE,
    name TEXT,
    email TEXT
  );

  CREATE TABLE IF NOT EXISTS prescriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    image_url TEXT,
    extracted_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    items TEXT,
    total_amount REAL,
    status TEXT DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    medicine_name TEXT,
    time TEXT,
    frequency TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Routes
  app.post("/api/auth/login", (req, res) => {
    const { phone } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE phone = ?").get(phone);
    if (!user) {
      return res.status(404).json({ error: "User not found. Please sign up." });
    }
    res.json(user);
  });

  app.post("/api/auth/signup", (req, res) => {
    const { phone, name, email } = req.body;
    try {
      const result = db.prepare("INSERT INTO users (phone, name, email) VALUES (?, ?, ?)").run(phone, name, email);
      const user = { id: result.lastInsertRowid, phone, name, email };
      res.json(user);
    } catch (err: any) {
      if (err.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: "Phone number already registered." });
      }
      res.status(500).json({ error: "Failed to create user." });
    }
  });

  app.get("/api/prescriptions/:userId", (req, res) => {
    const prescriptions = db.prepare("SELECT * FROM prescriptions WHERE user_id = ? ORDER BY created_at DESC").all(req.params.userId);
    res.json(prescriptions);
  });

  app.post("/api/prescriptions", (req, res) => {
    const { userId, imageUrl, extractedData } = req.body;
    const result = db.prepare("INSERT INTO prescriptions (user_id, image_url, extracted_data) VALUES (?, ?, ?)").run(userId, imageUrl, JSON.stringify(extractedData));
    res.json({ id: result.lastInsertRowid });
  });

  app.get("/api/reminders/:userId", (req, res) => {
    const reminders = db.prepare("SELECT * FROM reminders WHERE user_id = ?").all(req.params.userId);
    res.json(reminders);
  });

  app.post("/api/reminders", (req, res) => {
    const { userId, medicineName, time, frequency } = req.body;
    const result = db.prepare("INSERT INTO reminders (user_id, medicine_name, time, frequency) VALUES (?, ?, ?, ?)").run(userId, medicineName, time, frequency);
    res.json({ id: result.lastInsertRowid });
  });

  app.delete("/api/reminders/:id", (req, res) => {
    db.prepare("DELETE FROM reminders WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  app.post("/api/orders", (req, res) => {
    const { userId, items, totalAmount } = req.body;
    const result = db.prepare("INSERT INTO orders (user_id, items, total_amount) VALUES (?, ?, ?)").run(userId, JSON.stringify(items), totalAmount);
    res.json({ id: result.lastInsertRowid });
  });

  app.get("/api/orders/:userId", (req, res) => {
    const orders = db.prepare("SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC").all(req.params.userId);
    res.json(orders);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
