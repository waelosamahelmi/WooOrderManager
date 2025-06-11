import type { Order } from "@shared/schema";

export interface PrinterSettings {
  type: 'network';
  ipAddress: string;
  port: number;
  name: string;
  characterSet?: string;
  codePage?: number;
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
    // ESC/POS formatting commands with enhanced support
    const ESC = '\x1B';
    const GS = '\x1D';
    const LF = '\x0A';
    const FF = '\x0C';
    
    // Initialize printer and set character set
    let receipt = `${ESC}@`; // Initialize printer
    receipt += `${ESC}t\x12`; // Set character code table (CP850)
    receipt += `${ESC}a\x01`; // Center align
    
    // Header with enhanced formatting
    receipt += `${ESC}!\x38`; // Double width and height
    receipt += 'RAVINTOLA TIRVA' + LF;
    receipt += `${ESC}!\x00`; // Normal text
    receipt += `${ESC}!\x08`; // Emphasized
    receipt += 'Keittiötilaus' + LF;
    receipt += `${ESC}!\x00`; // Normal text
    receipt += '================================' + LF;
    
    // Order details with better formatting
    receipt += `${ESC}a\x00`; // Left align
    receipt += `${ESC}!\x01`; // Small text
    receipt += `Tilaus: #${order.woocommerceId}` + LF;
    receipt += `Asiakas: ${order.customerName}` + LF;
    if (order.customerPhone && order.customerPhone !== 'Ei numeroa') {
      receipt += `Puh: ${order.customerPhone}` + LF;
    }
    receipt += `Tyyppi: ${order.type === 'delivery' ? 'Kotiinkuljetus' : 'Nouto'}` + LF;
    
    // Address information for deliveries
    if (order.type === 'delivery') {
      if (order.addressStreet) {
        receipt += `Katu: ${order.addressStreet}` + LF;
      }
      if (order.addressCity) {
        receipt += `Kaupunki: ${order.addressCity}` + LF;
      }
      if (order.addressInstructions) {
        receipt += `Ohjeet: ${order.addressInstructions}` + LF;
      }
    }
    
    receipt += `Aika: ${new Date().toLocaleString('fi-FI')}` + LF;
    receipt += `${ESC}!\x00`; // Normal text
    receipt += '--------------------------------' + LF;
    
    // Items section with better formatting
    receipt += `${ESC}!\x08`; // Emphasized
    receipt += 'TUOTTEET:' + LF;
    receipt += `${ESC}!\x00`; // Normal text
    
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    items.forEach((item: any) => {
      // Item name and quantity
      receipt += `${item.quantity}x ${item.name}` + LF;
      
      // Variations/modifications
      if (item.variations && item.variations.length > 0) {
        item.variations.forEach((variation: string) => {
          receipt += `  + ${variation}` + LF;
        });
      }
      
      // Meta data (from WooCommerce)
      if (item.meta && item.meta.length > 0) {
        item.meta.forEach((meta: any) => {
          if (meta.key && meta.value) {
            receipt += `  ${meta.key}: ${meta.value}` + LF;
          }
        });
      }
      
      // Price with right alignment
      const priceStr = item.price || '';
      const spaces = ' '.repeat(Math.max(0, 32 - priceStr.length));
      receipt += spaces + priceStr + LF;
    });
    
    receipt += '--------------------------------' + LF;
    
    // Total with large text
    receipt += `${ESC}!\x18`; // Large text
    receipt += `YHTEENSÄ: ${order.total || order.subtotal}` + LF;
    receipt += `${ESC}!\x00`; // Normal text
    
    // Additional fees
    if (order.deliveryFee && order.deliveryFee !== '0 €') {
      receipt += `Toimitusmaksu: ${order.deliveryFee}` + LF;
    }
    
    // Special instructions
    if (order.notes) {
      receipt += '--------------------------------' + LF;
      receipt += `${ESC}!\x08`; // Emphasized
      receipt += 'ERITYISOHJEET:' + LF;
      receipt += `${ESC}!\x00`; // Normal text
      receipt += `${order.notes}` + LF;
    }
    
    // Timeline information
    receipt += '================================' + LF;
    receipt += `${ESC}a\x01`; // Center align
    receipt += `Vastaanotettu: ${new Date(order.receivedAt).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })}` + LF;
    if (order.estimatedTime) {
      receipt += `Arvioitu valmis: ${order.estimatedTime}` + LF;
    }
    
    // Footer
    receipt += '================================' + LF;
    receipt += `${ESC}!\x08`; // Emphasized
    receipt += 'Kiitos tilauksesta!' + LF;
    receipt += `${ESC}!\x00`; // Normal text
    receipt += 'www.ravintolatirva.fi' + LF;
    receipt += LF + LF + LF; // Extra spacing
    
    // Cut paper
    receipt += `${GS}V\x41\x03`; // Partial cut
    
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