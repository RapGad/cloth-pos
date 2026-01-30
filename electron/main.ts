import { app, BrowserWindow, ipcMain } from 'electron'

app.commandLine.appendSwitch('disable-features', 'Autofill,PasswordManager,AutofillServerCommunication,AutofillAddressEnabled,AutofillCreditCardEnabled')
app.commandLine.appendSwitch('disable-autofill')
console.log('Autofill features disabled via command line switches')
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DBManager } from './db'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    // win.webContents.openDevTools()
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  createWindow() // Create window first for perceived speed

  const db = new DBManager()

  ipcMain.handle('get-products', () => {
    return db.getProducts()
  })

  ipcMain.handle('add-product', (_event, product, variants) => {
    return db.addProduct(product, variants)
  })

  ipcMain.handle('update-product', (_event, product, variants) => {
    return db.updateProduct(product, variants)
  })

  ipcMain.handle('delete-product', (_event, id) => {
    return db.deleteProduct(id)
  })

  ipcMain.handle('process-sale', (_event, sale) => {
    return db.processSale(sale)
  })

  ipcMain.handle('get-settings', () => {
    return db.getSettings()
  })

  ipcMain.handle('update-setting', (_event, key, value) => {
    return db.updateSetting(key, value)
  })

  ipcMain.handle('get-profit-report', (_event, startDate, endDate) => {
    return db.getProfitReport(startDate, endDate)
  })

  ipcMain.handle('get-sales-trend', (_event, startDate, endDate) => {
    return db.getSalesTrend(startDate, endDate)
  })

  ipcMain.handle('get-sales', (_event, search) => {
    return db.getSales(search)
  })

  ipcMain.handle('get-sale-details', (_event, saleId) => {
    return db.getSaleDetails(saleId)
  })

  ipcMain.handle('check-printer-status', async (event) => {
    const printers = await event.sender.getPrintersAsync()
    return printers.length > 0
  })

  ipcMain.handle('get-printers', async () => {
    const { getAllPrinters } = await import('./printer')
    return await getAllPrinters()
  })

  ipcMain.handle('print-receipt', async (_event, receiptData) => {
    try {
      const { printReceipt } = await import('./printer')
      
      // Get settings from database
      const settingsData = db.getSettings()
      const settingsMap: any = {}
      settingsData.forEach((s: any) => {
        settingsMap[s.key] = s.value
      })
      
      // Prepare printer settings
      const printerSettings = {
        printer_device_name: settingsMap.printerName || '',
        printer_type: (settingsMap.printerType || 'system') as 'usb' | 'system',
        printer_paper_width: (settingsMap.printerPaperWidth || '80mm') as '80mm' | '58mm',
        store_name: settingsMap.storeName || 'Clothing POS',
        store_address: settingsMap.storeAddress || '',
        store_phone: settingsMap.storePhone || '',
        currency_symbol: settingsMap.currency || 'GH₵',
        receipt_footer: settingsMap.receiptFooter || 'Thank you for your purchase!'
      }
      
      // Convert receipt data to expected format
      const saleData = {
        receipt_number: receiptData.receiptNumber,
        timestamp: receiptData.timestamp,
        customer_name: receiptData.customerName,
        payment_method: receiptData.paymentMethod,
        total: receiptData.total * 100, // Convert to cents
        items: receiptData.items.map((item: any) => ({
          name: item.name,
          size: item.size,
          color: item.color,
          quantity: item.qty,
          price: item.price * 100 // Convert to cents
        }))
      }
      
      console.log(`Print receipt request: ${receiptData.receiptNumber}, Printer: ${printerSettings.printer_device_name}, Type: ${printerSettings.printer_type}`);
      await printReceipt(saleData, printerSettings)
      return true
    } catch (error) {
      console.error('Print error:', error)
      return false
    }
  })

  // User Authentication Handlers
  ipcMain.handle('db:validateUser', (_event, username, password) => {
    return db.validateUser(username, password)
  })

  ipcMain.handle('db:getUsers', () => {
    return db.getUsers()
  })

  ipcMain.handle('db:addUser', (_event, username, password, role) => {
    return db.addUser(username, password, role)
  })

  ipcMain.handle('db:updateUser', (_event, id, username, role) => {
    return db.updateUser(id, username, role)
  })

  ipcMain.handle('db:deleteUser', (_event, id) => {
    return db.deleteUser(id)
  })

  ipcMain.handle('db:changePassword', (_event, id, newPassword) => {
    return db.changePassword(id, newPassword)
  })
})
