import * as XLSX from 'xlsx';

export interface BulkUploadProduct {
  product: {
    name: string;
    category: string;
    cost_price: number;
    selling_price: number;
    tax_rate: number;
  };
  variants: {
    size: string;
    color: string;
    stock_qty: number;
  }[];
}

const parseCSVRaw = (text: string): any[] => {
  const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
  if (lines.length === 0) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  
  return lines.slice(1).map(line => {
    // Simple CSV parser that handles quotes
    const values: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());
    
    const obj: any = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });
    return obj;
  });
};

const parseXLSXRaw = async (file: File): Promise<any[]> => {
  const data = await file.arrayBuffer();
  const workbook = XLSX.read(data);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const jsonData = XLSX.utils.sheet_to_json(worksheet);
  
  // Normalize keys to lowercase underscore
  return jsonData.map((row: any) => {
    const normalized: any = {};
    Object.keys(row).forEach(key => {
      const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_');
      normalized[normalizedKey] = row[key];
    });
    return normalized;
  });
};

export const parseFile = async (file: File): Promise<BulkUploadProduct[]> => {
  let rawData: any[] = [];
  
  if (file.name.endsWith('.csv')) {
    const text = await file.text();
    rawData = parseCSVRaw(text);
  } else {
    rawData = await parseXLSXRaw(file);
  }

  // Header mapping (common variations)
  const mapHeader = (obj: any, keys: string[]) => {
    for (const key of keys) {
      const normalizedKey = key.toLowerCase().replace(/\s+/g, '_');
      if (obj[normalizedKey] !== undefined) return obj[normalizedKey];
    }
    return undefined;
  };

  const productsMap = new Map<string, BulkUploadProduct>();

  rawData.forEach(row => {
    const name = mapHeader(row, ['name', 'product_name', 'product']);
    if (!name) return;

    const category = mapHeader(row, ['category']) || 'General';
    const costPrice = parseFloat(mapHeader(row, ['cost_price', 'cost', 'buying_price'])) || 0;
    const sellingPrice = parseFloat(mapHeader(row, ['selling_price', 'price', 'sell_price'])) || 0;
    const stock = parseInt(mapHeader(row, ['stock', 'qty', 'quantity', 'stock_qty'])) || 0;
    const size = mapHeader(row, ['size']) || 'Standard';
    const color = mapHeader(row, ['color']) || 'Default';

    if (!productsMap.has(name)) {
      productsMap.set(name, {
        product: {
          name,
          category,
          cost_price: costPrice,
          selling_price: sellingPrice,
          tax_rate: 0
        },
        variants: []
      });
    }

    const productEntry = productsMap.get(name)!;
    productEntry.variants.push({
      size,
      color,
      stock_qty: stock
    });
  });

  return Array.from(productsMap.values());
};
