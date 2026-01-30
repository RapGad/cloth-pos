import escpos from 'escpos';
import USB from 'escpos-usb';
import { BrowserWindow } from 'electron';
import bwipjs from 'bwip-js';

escpos.USB = USB;

interface PrinterSettings {
  printer_device_name: string;
  printer_type: 'usb' | 'system';
  printer_paper_width: '80mm' | '58mm';
  store_name: string;
  store_address?: string;
  store_phone?: string;
  currency_symbol: string;
  receipt_footer?: string;
}

interface SaleItem {
  name: string;
  size?: string;
  color?: string;
  quantity: number;
  qty?: number;
  price: number;
  price_at_sale?: number;
}

interface SaleData {
  receipt_number: string;
  created_at?: string;
  timestamp?: string;
  customer_name?: string;
  payment_method: string;
  total_amount?: number;
  total?: number;
  items: SaleItem[];
}

// Get available USB printers
export const getUSBPrinters = () => {
  try {
    const devices = USB.findPrinter();
    return devices.map((d: any) => ({
      name: `USB Printer (VID:${d.deviceDescriptor.idVendor.toString(16)} PID:${d.deviceDescriptor.idProduct.toString(16)})`,
      displayName: 'USB Thermal Printer',
      description: 'Direct USB Connection',
      deviceDescriptor: {
        idVendor: d.deviceDescriptor.idVendor,
        idProduct: d.deviceDescriptor.idProduct
      },
      isUSB: true
    }));
  } catch (error: any) {
    console.warn('USB Printer discovery failed (ignore if using system printer):', error.message || error);
    return [];
  }
};

// Get system printers
export const getSystemPrinters = async () => {
  try {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) return [];
    
    const printers = await win.webContents.getPrintersAsync();
    return printers.map((p: any) => ({
      name: p.name,
      displayName: p.displayName,
      description: p.description,
      status: p.status,
      isDefault: p.isDefault,
      isSystem: true
    }));
  } catch (error) {
    console.error('Error getting system printers:', error);
    return [];
  }
};

// Get all printers (USB + System)
export const getAllPrinters = async () => {
  const [usbPrinters, systemPrinters] = await Promise.all([
    Promise.resolve(getUSBPrinters()),
    getSystemPrinters()
  ]);
  return [...usbPrinters, ...systemPrinters];
};

// Generate barcode as base64
const generateBarcodeBase64 = async (text: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    bwipjs.toBuffer({
      bcid: 'code128',
      text: text,
      scale: 3,
      height: 10,
      includetext: true,
      textxalign: 'center',
    }, (err: any, png: Buffer) => {
      if (err) {
        reject(err);
      } else {
        resolve(`data:image/png;base64,${png.toString('base64')}`);
      }
    });
  });
};

// Helper to format date/time safely
const formatReceiptDate = (dateStr: string | undefined): { date: string, time: string, full: string } => {
  try {
    const date = dateStr ? new Date(dateStr) : new Date();
    if (isNaN(date.getTime())) {
      const now = new Date();
      return {
        date: now.toLocaleDateString(),
        time: now.toLocaleTimeString(),
        full: now.toLocaleString()
      };
    }
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString(),
      full: date.toLocaleString()
    };
  } catch (e) {
    const now = new Date();
    return {
      date: now.toLocaleDateString(),
      time: now.toLocaleTimeString(),
      full: now.toLocaleString()
    };
  }
};

// Generate HTML receipt
export const generateReceiptHTML = async (sale: SaleData, settings: PrinterSettings): Promise<string> => {
  const is58mm = settings.printer_paper_width === '58mm';
  const width = is58mm ? '48mm' : '72mm';
  const barcode = await generateBarcodeBase64(sale.receipt_number);
  
  const total = (sale.total_amount || sale.total || 0) / 100;
  const currencySymbol = settings.currency_symbol || 'GH₵';
  const timestamp = sale.created_at || sale.timestamp;
  const formattedDates = formatReceiptDate(timestamp);

  console.log(`Generating HTML Receipt: ${sale.receipt_number}, Raw Timestamp: ${timestamp}, Formatted: ${formattedDates.full}`);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      size: ${settings.printer_paper_width} auto;
      margin: 0;
    }
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      width: ${width};
      font-size: 9pt;
      line-height: 1.3;
      padding: 2mm;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: bold; }
    .divider {
      border-top: 1px dashed #000;
      margin: 2mm 0;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    td {
      padding: 1px 0;
      vertical-align: top;
    }
    .header {
      margin-bottom: 2mm;
    }
    .header h1 {
      font-size: 12pt;
      margin-bottom: 1mm;
    }
    .item-name {
      font-weight: bold;
      font-size: 9pt;
    }
    .item-details {
      font-size: 8pt;
      color: #333;
    }
    .total-section {
      margin-top: 2mm;
      font-size: 10pt;
    }
    img {
      max-width: 100%;
      height: auto;
    }
  </style>
</head>
<body>
  <div class="header center">
    <h1>${settings.store_name}</h1>
    ${settings.store_address ? `<div>${settings.store_address}</div>` : ''}
    ${settings.store_phone ? `<div>${settings.store_phone}</div>` : ''}
  </div>
  
  <div class="divider"></div>
  
  <table>
    <tr>
      <td>Date:</td>
      <td class="right">${formattedDates.date}</td>
    </tr>
    <tr>
      <td>Time:</td>
      <td class="right">${formattedDates.time}</td>
    </tr>
    <tr>
      <td colspan="2">Receipt: ${sale.receipt_number}</td>
    </tr>
    ${sale.customer_name ? `<tr><td colspan="2">Customer: ${sale.customer_name}</td></tr>` : ''}
  </table>
  
  <div class="divider"></div>
  
  <table>
    ${sale.items.map((item) => {
      const qty = item.quantity || item.qty || 0;
      const price = (item.price_at_sale || item.price || 0) / 100;
      const total = (price * qty).toFixed(2);
      const variant = item.size && item.color ? ` (${item.size}/${item.color})` : '';
      
      return `
        <tr>
          <td colspan="2" class="item-name">${item.name}${variant}</td>
        </tr>
        <tr class="item-details">
          <td>${qty} × ${currencySymbol}${price.toFixed(2)}</td>
          <td class="right">${currencySymbol}${total}</td>
        </tr>
      `;
    }).join('')}
  </table>
  
  <div class="divider"></div>
  
  <table class="total-section">
    <tr class="bold">
      <td>TOTAL</td>
      <td class="right">${currencySymbol}${total.toFixed(2)}</td>
    </tr>
    <tr>
      <td>Payment</td>
      <td class="right">${sale.payment_method.toUpperCase()}</td>
    </tr>
  </table>
  
  <div class="divider"></div>
  
  <div class="center">
    <img src="${barcode}" alt="Barcode" />
  </div>
  
  ${settings.receipt_footer ? `
    <div class="divider"></div>
    <div class="center" style="font-size: 8pt;">${settings.receipt_footer}</div>
  ` : ''}
  
  <div class="center" style="margin-top: 3mm; font-size: 8pt;">
    Thank you for your purchase!
  </div>
</body>
</html>
  `;
};

// Print via system printer (WebContents)
export const printViaWebContents = async (html: string, printerName: string, settings: PrinterSettings): Promise<boolean> => {
  const is58mm = settings.printer_paper_width === '58mm';
  const widthMicrons = is58mm ? 58000 : 80000;
  const heightMicrons = 300000;

  console.log(`Print attempt - Target Printer: "${printerName || 'Default'}", Width: ${settings.printer_paper_width}`);

  return new Promise((resolve, reject) => {
    const workerWindow = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true
      }
    });

    workerWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));

    workerWindow.webContents.on('did-finish-load', async () => {
      try {
        // Validate printer name
        let finalPrinterName = printerName;
        if (printerName) {
          const availablePrinters = await workerWindow.webContents.getPrintersAsync();
          const printerExists = availablePrinters.some(p => p.name === printerName);
          
          if (!printerExists) {
            console.warn(`Printer "${printerName}" not found. Falling back to default printer.`);
            finalPrinterName = ''; // Empty string lets Electron use the default printer
          }
        }

        setTimeout(() => {
          workerWindow.webContents.print({
            silent: true,
            printBackground: true,
            deviceName: finalPrinterName || undefined,
            margins: { marginType: 'none' },
            pageSize: {
              width: widthMicrons,
              height: heightMicrons
            }
          }, (success, errorType) => {
            workerWindow.close();
            if (!success) {
              console.error(`Print failed. Printer: "${finalPrinterName || 'Default'}", Error: ${errorType}`);
              reject(new Error(`Print failed: ${errorType}`));
            } else {
              console.log('Print job sent successfully');
              resolve(true);
            }
          });
        }, 500);
      } catch (err: any) {
        workerWindow.close();
        console.error('Error during printer validation:', err);
        reject(err);
      }
    });

    workerWindow.webContents.on('did-fail-load', () => {
      workerWindow.close();
      reject(new Error('Failed to load print content'));
    });
  });
};

// Print via USB thermal printer (ESC/POS)
export const printViaUSB = async (sale: SaleData, settings: PrinterSettings): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    try {
      const device = new USB();
      const printer = new escpos.Printer(device);
      
      const is58mm = settings.printer_paper_width === '58mm';
      const width = is58mm ? 32 : 48;
      const currencySymbol = settings.currency_symbol || 'GH₵';
      const timestamp = sale.created_at || sale.timestamp;
      const formattedDates = formatReceiptDate(timestamp);
      const total = (sale.total_amount || sale.total || 0) / 100;

      console.log(`Generating USB Receipt: ${sale.receipt_number}, Raw Timestamp: ${timestamp}, Formatted: ${formattedDates.full}`);

      // Helper function for two-column layout
      const twoColumns = (left: string, right: string) => {
        const spaceNeeded = width - left.length - right.length;
        if (spaceNeeded < 1) {
          const availableForLeft = width - right.length - 1;
          return left.substring(0, availableForLeft) + ' ' + right;
        }
        return left + ' '.repeat(spaceNeeded) + right;
      };

      device.open((error: any) => {
        if (error) {
          reject(error);
          return;
        }

        setTimeout(() => {
          try {
            // Initialize printer
            printer.hardware('INIT');
            printer.align('CT');
            
            // Header
            printer.size(1, 1).text(settings.store_name).size(0, 0);
            if (settings.store_address) printer.text(settings.store_address);
            if (settings.store_phone) printer.text(settings.store_phone);
            printer.text('-'.repeat(width));
            
            // Receipt info
            printer.align('LT');
            printer.text(`Receipt: ${sale.receipt_number}`);
            printer.text(formattedDates.full);
            if (sale.customer_name) printer.text(`Customer: ${sale.customer_name}`);
            printer.text('-'.repeat(width));
            
            // Items
            sale.items.forEach((item) => {
              const qty = item.quantity || item.qty || 0;
              const price = (item.price_at_sale || item.price || 0) / 100;
              const itemTotal = (price * qty).toFixed(2);
              const variant = item.size && item.color ? ` (${item.size}/${item.color})` : '';
              
              printer.text(item.name + variant);
              const detailLine = twoColumns(
                `${qty} x ${currencySymbol}${price.toFixed(2)}`,
                `${currencySymbol}${itemTotal}`
              );
              printer.text(detailLine);
              printer.control('LF');
            });
            
            printer.text('-'.repeat(width));
            
            // Totals
            printer.align('RT');
            printer.size(1, 1);
            printer.text(`TOTAL: ${currencySymbol}${total.toFixed(2)}`);
            printer.size(0, 0);
            printer.text(`Payment: ${sale.payment_method.toUpperCase()}`);
            printer.text('-'.repeat(width));
            
            // Barcode
            printer.align('CT');
            printer.barcode(sale.receipt_number, 'CODE128', { height: 50 });
            
            // Footer
            if (settings.receipt_footer) {
              printer.text(settings.receipt_footer);
            }
            printer.text('Thank you for your purchase!');
            
            // Cut paper
            printer.feed(4);
            printer.cut();
            
            printer.close(() => {
              resolve(true);
            });
          } catch (printError) {
            reject(printError);
          }
        }, 100);
      });
    } catch (error) {
      reject(error);
    }
  });
};

// Main print function
export const printReceipt = async (sale: SaleData, settings: PrinterSettings): Promise<boolean> => {
  try {
    if (settings.printer_type === 'system') {
      const html = await generateReceiptHTML(sale, settings);
      return await printViaWebContents(html, settings.printer_device_name, settings);
    } else {
      return await printViaUSB(sale, settings);
    }
  } catch (error) {
    console.error('Print error:', error);
    throw error;
  }
};
