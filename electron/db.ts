import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

export class DBManager {
  private db: Database.Database;

  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'cloth-pos.db');
    this.db = new Database(dbPath);
    this.initSchema();
  }

  private initSchema() {
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

    // Migrations: Add missing columns if they don't exist
    const migrateTable = (tableName: string, requiredColumns: { name: string, type: string, default?: string }[]) => {
      const info = this.db.pragma(`table_info(${tableName})`) as any[];
      const existingColumns = info.map(c => c.name);
      
      for (const col of requiredColumns) {
        if (!existingColumns.includes(col.name)) {
          let query = `ALTER TABLE ${tableName} ADD COLUMN ${col.name} ${col.type}`;
          if (col.default !== undefined) {
            query += ` DEFAULT ${col.default}`;
          }
          this.db.exec(query);
        }
      }
    };

    migrateTable('products', [
      { name: 'name', type: 'TEXT', default: "''" },
      { name: 'cost_price', type: 'REAL', default: '0' },
      { name: 'selling_price', type: 'REAL', default: '0' },
      { name: 'tax_rate', type: 'REAL', default: '0' },
      { name: 'category', type: 'TEXT' },
      { name: 'created_at', type: 'DATETIME', default: 'CURRENT_TIMESTAMP' }
    ]);

    migrateTable('variants', [
      { name: 'product_id', type: 'INTEGER', default: '0' },
      { name: 'size', type: 'TEXT', default: "''" },
      { name: 'color', type: 'TEXT', default: "''" },
      { name: 'stock_qty', type: 'INTEGER', default: '0' }
    ]);

    migrateTable('sales', [
      { name: 'receipt_number', type: 'TEXT', default: "'WAITING'" },
      { name: 'timestamp', type: 'DATETIME', default: 'CURRENT_TIMESTAMP' },
      { name: 'total', type: 'REAL', default: '0' },
      { name: 'payment_method', type: 'TEXT', default: "'cash'" },
      { name: 'cashier_id', type: 'TEXT' }
    ]);

    migrateTable('sale_items', [
      { name: 'sale_id', type: 'INTEGER', default: '0' },
      { name: 'product_id', type: 'INTEGER', default: '0' },
      { name: 'variant_id', type: 'INTEGER', default: '0' },
      { name: 'qty', type: 'INTEGER', default: '1' },
      { name: 'cost_at_sale', type: 'REAL', default: '0' },
      { name: 'price_at_sale', type: 'REAL', default: '0' },
      { name: 'discount', type: 'REAL', default: '0' }
    ]);

    // Fix malformed sale_items table (schema mismatch repair)
    const saleItemsInfo = this.db.pragma('table_info(sale_items)') as any[];
    const hasQuantityCol = saleItemsInfo.some(c => c.name === 'quantity');
    
    if (hasQuantityCol) {
      console.log('Detected malformed sale_items schema. Recreating table...');
      this.db.transaction(() => {
        // 1. Rename existing table
        this.db.exec('ALTER TABLE sale_items RENAME TO sale_items_old');

        // 2. Create new table
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

        // 3. Migrate data
        // We map 'quantity' -> 'qty' and 'price' -> 'price_at_sale' if the new columns are empty/default
        // Actually, since the new columns 'qty' and 'price_at_sale' might exist in the old table (added by migrateTable),
        // we should prefer them if they have values, otherwise fallback to 'quantity'/'price'.
        // However, looking at the logs, 'qty' and 'price_at_sale' were just added and might be 0/default.
        // Let's assume 'quantity' and 'price' hold the real historical data for old rows.
        
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

        // 4. Drop old table
        this.db.exec('DROP TABLE sale_items_old');
      })();
    }

    // Seed default admin user if no users exist
    const userCount = this.db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    if (userCount.count === 0) {
      // Simple hash for demo - in production, use bcrypt or similar
      const defaultPassword = 'admin123';
      this.db.prepare(`
        INSERT INTO users (username, password, role)
        VALUES (?, ?, ?)
      `).run('admin', defaultPassword, 'admin');
      console.log('Default admin user created: username=admin, password=admin123');
    }
  }

  public getProducts() {
    const products = this.db.prepare('SELECT * FROM products').all();
    return products.map((p: any) => {
      const variants = this.db.prepare('SELECT * FROM variants WHERE product_id = ?').all(p.id);
      return { ...p, variants };
    });
  }

  public addProduct(product: any, variants: any[]) {
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

  public updateProduct(product: any, variants: any[]) {
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
  
  public updateStock(variantId: number, qtyChange: number) {
    // qtyChange can be negative (sale) or positive (restock)
    const stmt = this.db.prepare('UPDATE variants SET stock_qty = stock_qty + ? WHERE id = ?');
    stmt.run(qtyChange, variantId);
  }

  public deleteProduct(productId: number) {
    this.db.prepare('DELETE FROM products WHERE id = ?').run(productId);
  }

  public getSettings() {
    return this.db.prepare('SELECT * FROM settings').all();
  }

  public updateSetting(key: string, value: string) {
    this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
  }

  public getProfitReport(startDate: string, endDate: string) {
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

  public getSales(search?: string) {
    let query = 'SELECT * FROM sales';
    let params: any[] = [];
    
    if (search) {
      query += ' WHERE id = ?';
      params.push(search);
    }
    
    query += ' ORDER BY timestamp DESC';
    return this.db.prepare(query).all(...params);
  }

  public getSaleDetails(saleId: number) {
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

  public processSale(sale: { total: number, payment_method: string, items: any[] }) {
    console.log('Processing sale:', JSON.stringify(sale, null, 2));
    
    // Generate secure receipt number (e.g., INV-9A2B3C)
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
      return saleId;
    });

    return transaction();
  }

  // User Authentication Methods
  public validateUser(username: string, password: string) {
    const user = this.db.prepare('SELECT * FROM users WHERE username = ? AND password = ?').get(username, password);
    if (user) {
      // Return user without password
      const { password: _, ...userWithoutPassword } = user as any;
      return userWithoutPassword;
    }
    return null;
  }

  public getUsers() {
    const users = this.db.prepare('SELECT id, username, role, created_at FROM users').all();
    return users;
  }

  public addUser(username: string, password: string, role: 'admin' | 'cashier') {
    try {
      const result = this.db.prepare(`
        INSERT INTO users (username, password, role)
        VALUES (?, ?, ?)
      `).run(username, password, role);
      return result.lastInsertRowid;
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed')) {
        throw new Error('Username already exists');
      }
      throw error;
    }
  }

  public updateUser(id: number, username: string, role: 'admin' | 'cashier') {
    try {
      this.db.prepare(`
        UPDATE users 
        SET username = ?, role = ?
        WHERE id = ?
      `).run(username, role, id);
    } catch (error: any) {
      if (error.message.includes('UNIQUE constraint failed')) {
        throw new Error('Username already exists');
      }
      throw error;
    }
  }

  public deleteUser(id: number) {
    // Prevent deleting the last admin
    const adminCount = this.db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'admin'").get() as { count: number };
    const user = this.db.prepare('SELECT role FROM users WHERE id = ?').get(id) as any;
    
    if (user?.role === 'admin' && adminCount.count <= 1) {
      throw new Error('Cannot delete the last admin user');
    }
    
    this.db.prepare('DELETE FROM users WHERE id = ?').run(id);
  }

  public changePassword(id: number, newPassword: string) {
    this.db.prepare(`
      UPDATE users 
      SET password = ?
      WHERE id = ?
    `).run(newPassword, id);
  }
}
