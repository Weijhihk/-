import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import path from 'path';

const db = new Database('project.db');

// Initialize Database Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS cost_items (
    id TEXT PRIMARY KEY,
    itemNumber TEXT NOT NULL,
    name TEXT NOT NULL,
    unit TEXT,
    budgetQuantity REAL DEFAULT 0,
    budgetUnitPrice REAL DEFAULT 0,
    actualQuantity REAL DEFAULT 0,
    actualUnitPrice REAL DEFAULT 0,
    subItemId TEXT,
    roundTotal INTEGER DEFAULT 0,
    hasPriceAnalysis INTEGER DEFAULT 0,
    priceMultiplier REAL DEFAULT 1,
    priceAnalysisItems TEXT,
    isPriceAnalysisItem INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS sub_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    plannedStartDate TEXT,
    actualStartDate TEXT,
    plannedEndDate TEXT,
    actualEndDate TEXT,
    parentId TEXT,
    sortOrder INTEGER DEFAULT 0
  );
`);

try {
  db.exec('ALTER TABLE sub_items ADD COLUMN parentId TEXT;');
} catch (e) {}

try {
  db.exec('ALTER TABLE sub_items ADD COLUMN sortOrder INTEGER DEFAULT 0;');
} catch (e) {}

try {
  db.exec('ALTER TABLE cost_items ADD COLUMN subItemId TEXT;');
} catch (e) {}

try {
  db.exec('ALTER TABLE cost_items ADD COLUMN roundTotal INTEGER DEFAULT 0;');
} catch (e) {}

try {
  db.exec('ALTER TABLE cost_items ADD COLUMN hasPriceAnalysis INTEGER DEFAULT 0;');
} catch (e) {}

try {
  db.exec('ALTER TABLE cost_items ADD COLUMN priceMultiplier REAL DEFAULT 1;');
} catch (e) {}

try {
  db.exec('ALTER TABLE cost_items ADD COLUMN priceAnalysisItems TEXT;');
} catch (e) {}

try {
  db.exec('ALTER TABLE cost_items ADD COLUMN isPriceAnalysisItem INTEGER DEFAULT 0;');
} catch (e) {}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // --- Cost Items API ---
  app.get('/api/cost-items', (req, res) => {
    const items = db.prepare('SELECT * FROM cost_items').all();
    const parsedItems = items.map((item: any) => ({
      ...item,
      roundTotal: Boolean(item.roundTotal),
      hasPriceAnalysis: Boolean(item.hasPriceAnalysis),
      isPriceAnalysisItem: Boolean(item.isPriceAnalysisItem),
      priceAnalysisItems: item.priceAnalysisItems ? JSON.parse(item.priceAnalysisItems) : []
    }));
    res.json(parsedItems);
  });

  app.post('/api/cost-items', (req, res) => {
    const item = req.body;
    const stmt = db.prepare(`
      INSERT INTO cost_items (id, itemNumber, name, unit, budgetQuantity, budgetUnitPrice, actualQuantity, actualUnitPrice, subItemId, roundTotal, hasPriceAnalysis, priceMultiplier, priceAnalysisItems, isPriceAnalysisItem)
      VALUES (@id, @itemNumber, @name, @unit, @budgetQuantity, @budgetUnitPrice, @actualQuantity, @actualUnitPrice, @subItemId, @roundTotal, @hasPriceAnalysis, @priceMultiplier, @priceAnalysisItems, @isPriceAnalysisItem)
    `);
    stmt.run({ 
      ...item, 
      subItemId: item.subItemId || null,
      roundTotal: item.roundTotal ? 1 : 0,
      hasPriceAnalysis: item.hasPriceAnalysis ? 1 : 0,
      isPriceAnalysisItem: item.isPriceAnalysisItem ? 1 : 0,
      priceMultiplier: item.priceMultiplier ?? 1,
      priceAnalysisItems: item.priceAnalysisItems ? JSON.stringify(item.priceAnalysisItems) : null
    });
    res.json(item);
  });

  app.post('/api/cost-items/batch', (req, res) => {
    const items = req.body;
    const insert = db.prepare(`
      INSERT INTO cost_items (id, itemNumber, name, unit, budgetQuantity, budgetUnitPrice, actualQuantity, actualUnitPrice, subItemId, roundTotal, hasPriceAnalysis, priceMultiplier, priceAnalysisItems, isPriceAnalysisItem)
      VALUES (@id, @itemNumber, @name, @unit, @budgetQuantity, @budgetUnitPrice, @actualQuantity, @actualUnitPrice, @subItemId, @roundTotal, @hasPriceAnalysis, @priceMultiplier, @priceAnalysisItems, @isPriceAnalysisItem)
    `);
    const insertMany = db.transaction((items) => {
      for (const item of items) {
        insert.run({ 
          ...item, 
          subItemId: item.subItemId || null,
          roundTotal: item.roundTotal ? 1 : 0,
          hasPriceAnalysis: item.hasPriceAnalysis ? 1 : 0,
          isPriceAnalysisItem: item.isPriceAnalysisItem ? 1 : 0,
          priceMultiplier: item.priceMultiplier ?? 1,
          priceAnalysisItems: item.priceAnalysisItems ? JSON.stringify(item.priceAnalysisItems) : null
        });
      }
    });
    insertMany(items);
    res.json({ success: true, count: items.length });
  });

  app.put('/api/cost-items/:id', (req, res) => {
    const item = req.body;
    const stmt = db.prepare(`
      UPDATE cost_items 
      SET itemNumber = @itemNumber, name = @name, unit = @unit, 
          budgetQuantity = @budgetQuantity, budgetUnitPrice = @budgetUnitPrice, 
          actualQuantity = @actualQuantity, actualUnitPrice = @actualUnitPrice,
          subItemId = @subItemId, roundTotal = @roundTotal, hasPriceAnalysis = @hasPriceAnalysis,
          priceMultiplier = @priceMultiplier, priceAnalysisItems = @priceAnalysisItems,
          isPriceAnalysisItem = @isPriceAnalysisItem
      WHERE id = @id
    `);
    stmt.run({ 
      ...item, 
      id: req.params.id, 
      subItemId: item.subItemId || null,
      roundTotal: item.roundTotal ? 1 : 0,
      hasPriceAnalysis: item.hasPriceAnalysis ? 1 : 0,
      isPriceAnalysisItem: item.isPriceAnalysisItem ? 1 : 0,
      priceMultiplier: item.priceMultiplier ?? 1,
      priceAnalysisItems: item.priceAnalysisItems ? JSON.stringify(item.priceAnalysisItems) : null
    });
    res.json(item);
  });

  app.delete('/api/cost-items/:id', (req, res) => {
    const stmt = db.prepare('DELETE FROM cost_items WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
  });

  // --- Sub Items API ---
  app.get('/api/sub-items', (req, res) => {
    const items = db.prepare('SELECT * FROM sub_items ORDER BY sortOrder ASC').all();
    res.json(items);
  });

  app.post('/api/sub-items', (req, res) => {
    const item = req.body;
    const stmt = db.prepare(`
      INSERT INTO sub_items (id, name, plannedStartDate, actualStartDate, plannedEndDate, actualEndDate, parentId, sortOrder)
      VALUES (@id, @name, @plannedStartDate, @actualStartDate, @plannedEndDate, @actualEndDate, @parentId, @sortOrder)
    `);
    stmt.run({ ...item, parentId: item.parentId || null, sortOrder: item.sortOrder || 0 });
    res.json(item);
  });

  app.put('/api/sub-items/:id', (req, res) => {
    const item = req.body;
    const stmt = db.prepare(`
      UPDATE sub_items 
      SET name = @name, plannedStartDate = @plannedStartDate, actualStartDate = @actualStartDate, 
          plannedEndDate = @plannedEndDate, actualEndDate = @actualEndDate, parentId = @parentId, sortOrder = @sortOrder
      WHERE id = @id
    `);
    stmt.run({ ...item, id: req.params.id, parentId: item.parentId || null, sortOrder: item.sortOrder || 0 });
    res.json(item);
  });

  app.put('/api/sub-items-batch', (req, res) => {
    const items = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Expected an array of items' });
    }
    const stmt = db.prepare(`
      UPDATE sub_items 
      SET sortOrder = @sortOrder
      WHERE id = @id
    `);
    const updateMany = db.transaction((items) => {
      for (const item of items) {
        stmt.run({ id: item.id, sortOrder: item.sortOrder });
      }
    });
    updateMany(items);
    res.json({ success: true });
  });

  app.delete('/api/sub-items/:id', (req, res) => {
    const stmt = db.prepare('DELETE FROM sub_items WHERE id = ?');
    stmt.run(req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
