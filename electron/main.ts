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
    win.webContents.openDevTools()
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

  ipcMain.handle('get-printers', async (event) => {
    const printers = await event.sender.getPrintersAsync()
    return printers
  })

  ipcMain.handle('print-receipt', async (_event, receiptData) => {
    try {
      // Create a hidden window for printing
      const printWindow = new BrowserWindow({
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true
        }
      })

      // Create receipt HTML
      const receiptHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body { 
              font-family: 'Courier New', monospace; 
              width: 80mm;
              padding: 10mm;
              font-size: 12px;
              line-height: 1.4;
            }
            .center { text-align: center; }
            .bold { font-weight: bold; }
            .line { 
              border-top: 1px dashed #000; 
              margin: 8px 0; 
            }
            table { 
              width: 100%; 
              border-collapse: collapse;
            }
            td { 
              padding: 3px 0; 
              vertical-align: top;
            }
            .right { text-align: right; }
            .item-name { font-weight: bold; }
            .item-details { 
              font-size: 10px; 
              color: #666;
              padding-left: 10px;
            }
            .total-row td {
              padding-top: 8px;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="center bold" style="font-size: 16px; margin-bottom: 5px;">${receiptData.storeName || 'Clothing POS'}</div>
          <div class="center" style="margin-bottom: 3px;">Receipt #${receiptData.receiptNumber}</div>
          <div class="center" style="font-size: 10px; margin-bottom: 8px;">${new Date(receiptData.timestamp).toLocaleString()}</div>
          <div class="line"></div>
          <table>
            ${receiptData.items.map((item: any) => `
              <tr>
                <td class="item-name">${item.name}</td>
                <td class="right">GH₵${(item.price * item.qty).toFixed(2)}</td>
              </tr>
              <tr>
                <td class="item-details" colspan="2">${item.size}/${item.color} × ${item.qty} @ GH₵${item.price.toFixed(2)}</td>
              </tr>
            `).join('')}
          </table>
          <div class="line"></div>
          <table>
            <tr class="total-row">
              <td class="bold">TOTAL</td>
              <td class="right bold">GH₵${receiptData.total.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Payment</td>
              <td class="right">${receiptData.paymentMethod.toUpperCase()}</td>
            </tr>
          </table>
          <div class="line"></div>
          <div class="center" style="margin-top: 10px; font-size: 11px;">Thank you for your purchase!</div>
          <div class="center" style="font-size: 10px; margin-top: 5px;">Please come again</div>
        </body>
        </html>
      `

      // Load the HTML content
      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(receiptHTML)}`)

      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 500))

      // Print options
      const printOptions: Electron.WebContentsPrintOptions = {
        silent: true, // Don't show print dialog
        printBackground: true,
        margins: {
          marginType: 'none'
        }
      }

      // Add printer name if specified
      if (receiptData.printerName) {
        printOptions.deviceName = receiptData.printerName
      }

      // Print the receipt
      return new Promise((resolve) => {
        printWindow.webContents.print(printOptions, (success, errorType) => {
          printWindow.close()
          if (success) {
            console.log('Receipt printed successfully')
            resolve(true)
          } else {
            console.error('Print failed:', errorType)
            resolve(false)
          }
        })
      })
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

  createWindow()
})
