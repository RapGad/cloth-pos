import { app, BrowserWindow, ipcMain } from "electron";
import path$1 from "node:path";
import { fileURLToPath } from "node:url";
import Database from "better-sqlite3";
import path from "path";
class DBManager {
  db;
  constructor() {
    const dbPath = path.join(app.getPath("userData"), "cloth-pos.db");
    this.db = new Database(dbPath);
    this.initSchema();
  }
  initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        cost_price REAL NOT NULL DEFAULT 0,
        selling_price REAL NOT NULL,
        tax_rate REAL DEFAULT 0,
        category TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS variants (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        size TEXT NOT NULL,
        color TEXT NOT NULL,
        stock_qty INTEGER DEFAULT 0,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        receipt_number TEXT NOT NULL COLLATE NOCASE,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        total REAL NOT NULL,
        payment_method TEXT NOT NULL,
        cashier_id TEXT
      );

      CREATE TABLE IF NOT EXISTS sale_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sale_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        variant_id INTEGER NOT NULL,
        qty INTEGER NOT NULL,
        cost_at_sale REAL NOT NULL DEFAULT 0,
        price_at_sale REAL NOT NULL,
        discount REAL DEFAULT 0,
        FOREIGN KEY (sale_id) REFERENCES sales(id),
        FOREIGN KEY (variant_id) REFERENCES variants(id)
      );
      
      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin', 'cashier')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    const migrateTable = (tableName, requiredColumns) => {
      const info = this.db.pragma(`table_info(${tableName})`);
      const existingColumns = info.map((c) => c.name);
      for (const col of requiredColumns) {
        if (!existingColumns.includes(col.name)) {
          let query = `ALTER TABLE ${tableName} ADD COLUMN ${col.name} ${col.type}`;
          if (col.default !== void 0) {
            query += ` DEFAULT ${col.default}`;
          }
          this.db.exec(query);
        }
      }
    };
    migrateTable("products", [
      { name: "name", type: "TEXT", default: "''" },
      { name: "cost_price", type: "REAL", default: "0" },
      { name: "selling_price", type: "REAL", default: "0" },
      { name: "tax_rate", type: "REAL", default: "0" },
      { name: "category", type: "TEXT" },
      { name: "created_at", type: "DATETIME", default: "CURRENT_TIMESTAMP" }
    ]);
    migrateTable("variants", [
      { name: "product_id", type: "INTEGER", default: "0" },
      { name: "size", type: "TEXT", default: "''" },
      { name: "color", type: "TEXT", default: "''" },
      { name: "stock_qty", type: "INTEGER", default: "0" }
    ]);
    migrateTable("sales", [
      { name: "receipt_number", type: "TEXT", default: "'WAITING'" },
      { name: "timestamp", type: "DATETIME", default: "CURRENT_TIMESTAMP" },
      { name: "total", type: "REAL", default: "0" },
      { name: "payment_method", type: "TEXT", default: "'cash'" },
      { name: "cashier_id", type: "TEXT" }
    ]);
    migrateTable("sale_items", [
      { name: "sale_id", type: "INTEGER", default: "0" },
      { name: "product_id", type: "INTEGER", default: "0" },
      { name: "variant_id", type: "INTEGER", default: "0" },
      { name: "qty", type: "INTEGER", default: "1" },
      { name: "cost_at_sale", type: "REAL", default: "0" },
      { name: "price_at_sale", type: "REAL", default: "0" },
      { name: "discount", type: "REAL", default: "0" }
    ]);
    const saleItemsInfo = this.db.pragma("table_info(sale_items)");
    const hasQuantityCol = saleItemsInfo.some((c) => c.name === "quantity");
    if (hasQuantityCol) {
      console.log("Detected malformed sale_items schema. Recreating table...");
      this.db.transaction(() => {
        this.db.exec("ALTER TABLE sale_items RENAME TO sale_items_old");
        this.db.exec(`
          CREATE TABLE sale_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            variant_id INTEGER NOT NULL,
            qty INTEGER NOT NULL,
            cost_at_sale REAL NOT NULL DEFAULT 0,
            price_at_sale REAL NOT NULL,
            discount REAL DEFAULT 0,
            FOREIGN KEY (sale_id) REFERENCES sales(id),
            FOREIGN KEY (variant_id) REFERENCES variants(id)
          );
        `);
        this.db.exec(`
          INSERT INTO sale_items (id, sale_id, product_id, variant_id, qty, cost_at_sale, price_at_sale, discount)
          SELECT 
            id, 
            sale_id, 
            product_id, 
            variant_id, 
            COALESCE(NULLIF(qty, 0), quantity) as qty, 
            cost_at_sale, 
            COALESCE(NULLIF(price_at_sale, 0), price) as price_at_sale, 
            discount
          FROM sale_items_old
        `);
        this.db.exec("DROP TABLE sale_items_old");
      })();
    }
    const userCount = this.db.prepare("SELECT COUNT(*) as count FROM users").get();
    if (userCount.count === 0) {
      const defaultPassword = "admin123";
      this.db.prepare(`
        INSERT INTO users (username, password, role)
        VALUES (?, ?, ?)
      `).run("admin", defaultPassword, "admin");
      console.log("Default admin user created: username=admin, password=admin123");
    }
  }
  getProducts() {
    const products = this.db.prepare("SELECT * FROM products").all();
    return products.map((p) => {
      const variants = this.db.prepare("SELECT * FROM variants WHERE product_id = ?").all(p.id);
      return { ...p, variants };
    });
  }
  addProduct(product, variants) {
    const insertProduct = this.db.prepare(`
      INSERT INTO products (name, cost_price, selling_price, tax_rate, category)
      VALUES (@name, @cost_price, @selling_price, @tax_rate, @category)
    `);
    const insertVariant = this.db.prepare(`
      INSERT INTO variants (product_id, size, color, stock_qty)
      VALUES (@product_id, @size, @color, @stock_qty)
    `);
    const transaction = this.db.transaction(() => {
      const info = insertProduct.run(product);
      const productId = info.lastInsertRowid;
      for (const v of variants) {
        insertVariant.run({ ...v, product_id: productId });
      }
      return productId;
    });
    return transaction();
  }
  updateProduct(product, variants) {
    const updateProduct = this.db.prepare(`
      UPDATE products 
      SET name = @name, cost_price = @cost_price, selling_price = @selling_price, category = @category
      WHERE id = @id
    `);
    const updateVariant = this.db.prepare(`
      UPDATE variants 
      SET size = @size, color = @color, stock_qty = @stock_qty
      WHERE id = @id
    `);
    const insertVariant = this.db.prepare(`
      INSERT INTO variants (product_id, size, color, stock_qty)
      VALUES (@product_id, @size, @color, @stock_qty)
    `);
    const transaction = this.db.transaction(() => {
      updateProduct.run(product);
      for (const v of variants) {
        if (v.id) {
          updateVariant.run(v);
        } else {
          insertVariant.run({ ...v, product_id: product.id });
        }
      }
    });
    return transaction();
  }
  updateStock(variantId, qtyChange) {
    const stmt = this.db.prepare("UPDATE variants SET stock_qty = stock_qty + ? WHERE id = ?");
    stmt.run(qtyChange, variantId);
  }
  deleteProduct(productId) {
    this.db.prepare("DELETE FROM products WHERE id = ?").run(productId);
  }
  getSettings() {
    return this.db.prepare("SELECT * FROM settings").all();
  }
  updateSetting(key, value) {
    this.db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run(key, value);
  }
  getProfitReport(startDate, endDate) {
    const query = `
      SELECT 
        p.category,
        SUM(si.qty * (si.price_at_sale - si.cost_at_sale)) as profit,
        SUM(si.qty * si.price_at_sale) as revenue
      FROM sales s
      JOIN sale_items si ON s.id = si.sale_id
      JOIN variants v ON si.variant_id = v.id
      JOIN products p ON v.product_id = p.id
      WHERE s.timestamp BETWEEN ? AND ?
      GROUP BY p.category
    `;
    return this.db.prepare(query).all(startDate, endDate);
  }
  getSales(search) {
    let query = "SELECT * FROM sales";
    let params = [];
    if (search) {
      query += " WHERE id = ?";
      params.push(search);
    }
    query += " ORDER BY timestamp DESC";
    return this.db.prepare(query).all(...params);
  }
  getSaleDetails(saleId) {
    const query = `
      SELECT 
        si.*,
        p.name,
        v.size,
        v.color
      FROM sale_items si
      JOIN variants v ON si.variant_id = v.id
      JOIN products p ON v.product_id = p.id
      WHERE si.sale_id = ?
    `;
    return this.db.prepare(query).all(saleId);
  }
  processSale(sale) {
    console.log("Processing sale:", JSON.stringify(sale, null, 2));
    const receiptNumber = `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const insertSale = this.db.prepare(`
      INSERT INTO sales (receipt_number, total, payment_method)
      VALUES (@receipt_number, @total, @payment_method)
    `);
    const insertSaleItem = this.db.prepare(`
      INSERT INTO sale_items (sale_id, product_id, variant_id, qty, cost_at_sale, price_at_sale, discount)
      VALUES (@sale_id, @product_id, @variant_id, @qty, @cost_at_sale, @price_at_sale, @discount)
    `);
    const updateStock = this.db.prepare(`
      UPDATE variants SET stock_qty = stock_qty - @qty WHERE id = @variant_id
    `);
    const transaction = this.db.transaction(() => {
      const info = insertSale.run({ ...sale, receipt_number: receiptNumber });
      const saleId = info.lastInsertRowid;
      for (const item of sale.items) {
        insertSaleItem.run({ ...item, sale_id: saleId });
        updateStock.run({ qty: item.qty, variant_id: item.variant_id });
      }
      return { id: saleId, receipt_number: receiptNumber };
    });
    return transaction();
  }
  // User Authentication Methods
  validateUser(username, password) {
    const user = this.db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password);
    if (user) {
      const { password: _, ...userWithoutPassword } = user;
      return userWithoutPassword;
    }
    return null;
  }
  getUsers() {
    const users = this.db.prepare("SELECT id, username, role, created_at FROM users").all();
    return users;
  }
  addUser(username, password, role) {
    try {
      const result = this.db.prepare(`
        INSERT INTO users (username, password, role)
        VALUES (?, ?, ?)
      `).run(username, password, role);
      return result.lastInsertRowid;
    } catch (error) {
      if (error.message.includes("UNIQUE constraint failed")) {
        throw new Error("Username already exists");
      }
      throw error;
    }
  }
  updateUser(id, username, role) {
    try {
      this.db.prepare(`
        UPDATE users 
        SET username = ?, role = ?
        WHERE id = ?
      `).run(username, role, id);
    } catch (error) {
      if (error.message.includes("UNIQUE constraint failed")) {
        throw new Error("Username already exists");
      }
      throw error;
    }
  }
  deleteUser(id) {
    const adminCount = this.db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get();
    const user = this.db.prepare("SELECT role FROM users WHERE id = ?").get(id);
    if (user?.role === "admin" && adminCount.count <= 1) {
      throw new Error("Cannot delete the last admin user");
    }
    this.db.prepare("DELETE FROM users WHERE id = ?").run(id);
  }
  changePassword(id, newPassword) {
    this.db.prepare(`
      UPDATE users 
      SET password = ?
      WHERE id = ?
    `).run(newPassword, id);
  }
}
app.commandLine.appendSwitch("disable-features", "Autofill,PasswordManager,AutofillServerCommunication,AutofillAddressEnabled,AutofillCreditCardEnabled");
app.commandLine.appendSwitch("disable-autofill");
console.log("Autofill features disabled via command line switches");
const __dirname$1 = path$1.dirname(fileURLToPath(import.meta.url));
process.env.APP_ROOT = path$1.join(__dirname$1, "..");
const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
const MAIN_DIST = path$1.join(process.env.APP_ROOT, "dist-electron");
const RENDERER_DIST = path$1.join(process.env.APP_ROOT, "dist");
process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path$1.join(process.env.APP_ROOT, "public") : RENDERER_DIST;
let win;
function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path$1.join(__dirname$1, "preload.mjs"),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  win.webContents.on("did-finish-load", () => {
    win?.webContents.send("main-process-message", (/* @__PURE__ */ new Date()).toLocaleString());
  });
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL);
  } else {
    win.loadFile(path$1.join(RENDERER_DIST, "index.html"));
  }
}
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
app.whenReady().then(() => {
  const db = new DBManager();
  ipcMain.handle("get-products", () => {
    return db.getProducts();
  });
  ipcMain.handle("add-product", (_event, product, variants) => {
    return db.addProduct(product, variants);
  });
  ipcMain.handle("update-product", (_event, product, variants) => {
    return db.updateProduct(product, variants);
  });
  ipcMain.handle("delete-product", (_event, id) => {
    return db.deleteProduct(id);
  });
  ipcMain.handle("process-sale", (_event, sale) => {
    return db.processSale(sale);
  });
  ipcMain.handle("get-settings", () => {
    return db.getSettings();
  });
  ipcMain.handle("update-setting", (_event, key, value) => {
    return db.updateSetting(key, value);
  });
  ipcMain.handle("get-profit-report", (_event, startDate, endDate) => {
    return db.getProfitReport(startDate, endDate);
  });
  ipcMain.handle("get-sales", (_event, search) => {
    return db.getSales(search);
  });
  ipcMain.handle("get-sale-details", (_event, saleId) => {
    return db.getSaleDetails(saleId);
  });
  ipcMain.handle("check-printer-status", async (event) => {
    const printers = await event.sender.getPrintersAsync();
    return printers.length > 0;
  });
  ipcMain.handle("get-printers", async () => {
    const { getAllPrinters } = await import("./printer-g3QAWT3L.js");
    return await getAllPrinters();
  });
  ipcMain.handle("print-receipt", async (_event, receiptData) => {
    try {
      const { printReceipt } = await import("./printer-g3QAWT3L.js");
      const settingsData = db.getSettings();
      const settingsMap = {};
      settingsData.forEach((s) => {
        settingsMap[s.key] = s.value;
      });
      const printerSettings = {
        printer_device_name: settingsMap.printerName || "",
        printer_type: settingsMap.printerType || "system",
        printer_paper_width: settingsMap.printerPaperWidth || "80mm",
        store_name: settingsMap.storeName || "Clothing POS",
        store_address: settingsMap.storeAddress || "",
        store_phone: settingsMap.storePhone || "",
        currency_symbol: settingsMap.currency || "GH₵",
        receipt_footer: settingsMap.receiptFooter || "Thank you for your purchase!"
      };
      const saleData = {
        receipt_number: receiptData.receiptNumber,
        timestamp: receiptData.timestamp,
        customer_name: receiptData.customerName,
        payment_method: receiptData.paymentMethod,
        total: receiptData.total * 100,
        // Convert to cents
        items: receiptData.items.map((item) => ({
          name: item.name,
          size: item.size,
          color: item.color,
          quantity: item.qty,
          price: item.price * 100
          // Convert to cents
        }))
      };
      await printReceipt(saleData, printerSettings);
      return true;
    } catch (error) {
      console.error("Print error:", error);
      return false;
    }
  });
  ipcMain.handle("db:validateUser", (_event, username, password) => {
    return db.validateUser(username, password);
  });
  ipcMain.handle("db:getUsers", () => {
    return db.getUsers();
  });
  ipcMain.handle("db:addUser", (_event, username, password, role) => {
    return db.addUser(username, password, role);
  });
  ipcMain.handle("db:updateUser", (_event, id, username, role) => {
    return db.updateUser(id, username, role);
  });
  ipcMain.handle("db:deleteUser", (_event, id) => {
    return db.deleteUser(id);
  });
  ipcMain.handle("db:changePassword", (_event, id, newPassword) => {
    return db.changePassword(id, newPassword);
  });
  createWindow();
});
export {
  MAIN_DIST,
  RENDERER_DIST,
  VITE_DEV_SERVER_URL
};
