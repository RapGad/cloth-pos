import type { ProductWithVariants } from './shared/types.ts';

export const api = {
  getProducts: (): Promise<ProductWithVariants[]> => {
    return window.ipcRenderer.invoke('get-products');
  },
  addProduct: (product: any, variants: any[]): Promise<number> => {
    return window.ipcRenderer.invoke('add-product', product, variants);
  },
  addProductsBulk: (productsWithVariants: any[]): Promise<number> => {
    return window.ipcRenderer.invoke('add-products-bulk', productsWithVariants);
  },
  updateProduct: (product: any, variants: any[]): Promise<void> => {
    return window.ipcRenderer.invoke('update-product', product, variants);
  },
  deleteProduct: (id: number): Promise<void> => {
    return window.ipcRenderer.invoke('delete-product', id);
  },
  processSale: (sale: any): Promise<{ id: number, receipt_number: string }> => {
    return window.ipcRenderer.invoke('process-sale', sale);
  },
  getSettings: (): Promise<{ key: string, value: string }[]> => {
    return window.ipcRenderer.invoke('get-settings');
  },
  updateSetting: (key: string, value: string): Promise<void> => {
    return window.ipcRenderer.invoke('update-setting', key, value);
  },
  getProfitReport: (startDate: string, endDate: string): Promise<any[]> => {
    return window.ipcRenderer.invoke('get-profit-report', startDate, endDate);
  },
  getSalesTrend: (startDate: string, endDate: string): Promise<any[]> => {
    return window.ipcRenderer.invoke('get-sales-trend', startDate, endDate);
  },
  getSales: (search?: string): Promise<any[]> => {
    return window.ipcRenderer.invoke('get-sales', search);
  },
  getSaleDetails: (saleId: number): Promise<any[]> => {
    return window.ipcRenderer.invoke('get-sale-details', saleId);
  },
  checkPrinterStatus: (): Promise<boolean> => {
    return window.ipcRenderer.invoke('check-printer-status');
  },

  getPrinters: (): Promise<any[]> => {
    return window.ipcRenderer.invoke('get-printers');
  },

  printReceipt: (receiptData: any): Promise<boolean> => {
    return window.ipcRenderer.invoke('print-receipt', receiptData);
  },

  // User Authentication
  login: (username: string, password: string) =>
    window.ipcRenderer.invoke('db:validateUser', username, password),
  
  getUsers: () =>
    window.ipcRenderer.invoke('db:getUsers'),
  
  addUser: (username: string, password: string, role: 'admin' | 'cashier') =>
    window.ipcRenderer.invoke('db:addUser', username, password, role),
  
  updateUser: (id: number, username: string, role: 'admin' | 'cashier') =>
    window.ipcRenderer.invoke('db:updateUser', id, username, role),
  
  deleteUser: (id: number) =>
    window.ipcRenderer.invoke('db:deleteUser', id),
  
  changePassword: (id: number, newPassword: string) =>
    window.ipcRenderer.invoke('db:changePassword', id, newPassword),
};
