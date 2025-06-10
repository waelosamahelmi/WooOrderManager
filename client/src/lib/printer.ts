import type { Order } from "@shared/schema";

export interface PrinterSettings {
  type: 'network';
  ipAddress: string;
  port: number;
  name: string;
}

// Network printer integration using ESC/POS commands
export class NetworkPrinter {
  private settings: PrinterSettings;

  constructor(settings: PrinterSettings) {
    this.settings = settings;
  }

  async print(order: Order): Promise<boolean> {
    try {
      const receipt = this.formatReceipt(order);
      
      // Send to network printer using fetch API to backend
      const response = await fetch('/api/print', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          printerSettings: this.settings,
          receiptData: receipt,
          order
        })
      });

      if (!response.ok) {
        throw new Error(`Print failed: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Printing failed:', error);
      throw error;
    }
  }

  private formatReceipt(order: Order): string {
    // ESC/POS formatting commands
    const ESC = '\x1B';
    const GS = '\x1D';
    
    // Initialize printer
    let receipt = `${ESC}@`; // Initialize
    receipt += `${ESC}a\x01`; // Center align
    
    // Header
    receipt += `${ESC}!\x18`; // Large text
    receipt += 'RAVINTOLA TIRVA\n';
    receipt += `${ESC}!\x00`; // Normal text
    receipt += 'Keittiötilaus\n';
    receipt += '================================\n';
    
    // Order details
    receipt += `${ESC}a\x00`; // Left align
    receipt += `Tilaus: #${order.woocommerceId}\n`;
    receipt += `Asiakas: ${order.customerName}\n`;
    receipt += `Puh: ${order.customerPhone}\n`;
    receipt += `Tyyppi: ${order.type === 'delivery' ? 'Kotiinkuljetus' : 'Nouto'}\n`;
    
    if (order.type === 'delivery' && order.shippingAddress) {
      receipt += `Osoite: ${order.shippingAddress}\n`;
    }
    
    receipt += `Aika: ${new Date().toLocaleString('fi-FI')}\n`;
    receipt += '--------------------------------\n';
    
    // Items
    receipt += 'TUOTTEET:\n';
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    items.forEach((item: any) => {
      receipt += `${item.quantity}x ${item.name}\n`;
      if (item.variations && item.variations.length > 0) {
        item.variations.forEach((variation: string) => {
          receipt += `  + ${variation}\n`;
        });
      }
      receipt += `  ${item.price}\n`;
    });
    
    receipt += '--------------------------------\n';
    receipt += `${ESC}!\x18`; // Large text
    receipt += `YHTEENSÄ: ${order.total}\n`;
    receipt += `${ESC}!\x00`; // Normal text
    
    if (order.notes) {
      receipt += '--------------------------------\n';
      receipt += 'ERITYISOHJEET:\n';
      receipt += `${order.notes}\n`;
    }
    
    receipt += '================================\n';
    receipt += `${ESC}a\x01`; // Center align
    receipt += 'Kiitos tilauksesta!\n';
    receipt += '\n\n\n';
    receipt += `${GS}V\x41\x03`; // Cut paper
    
    return receipt;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch('/api/printer/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ printerSettings: this.settings })
      });

      return response.ok;
    } catch (error) {
      console.error('Printer test failed:', error);
      return false;
    }
  }
}

export async function printOrder(order: Order, settings: PrinterSettings): Promise<boolean> {
  const printer = new NetworkPrinter(settings);
  return await printer.print(order);
}

export async function testPrinter(settings: PrinterSettings): Promise<boolean> {
  const printer = new NetworkPrinter(settings);
  return await printer.testConnection();
}