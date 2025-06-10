import { orders, settings, type Order, type InsertOrder, type Setting, type InsertSetting } from "@shared/schema";

export interface IStorage {
  // Orders
  getOrders(): Promise<Order[]>;
  getOrder(id: number): Promise<Order | undefined>;
  getOrderByWooCommerceId(woocommerceId: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: number, status: string): Promise<Order | undefined>;
  markOrderPrinted(id: number): Promise<Order | undefined>;
  
  // Settings
  getSettings(): Promise<Setting[]>;
  getSetting(key: string): Promise<Setting | undefined>;
  setSetting(setting: InsertSetting): Promise<Setting>;
}

export class MemStorage implements IStorage {
  private orders: Map<number, Order>;
  private settings: Map<string, Setting>;
  private currentOrderId: number;
  private currentSettingId: number;

  constructor() {
    this.orders = new Map();
    this.settings = new Map();
    this.currentOrderId = 1;
    this.currentSettingId = 1;
    
    // Initialize with default settings
    this.initializeDefaultSettings();
  }

  // Method to reset settings (useful for development)
  resetSettings() {
    this.settings.clear();
    this.currentSettingId = 1;
    this.initializeDefaultSettings();
  }

  private initializeDefaultSettings() {
    const defaultSettings = [
      { key: 'printerType', value: 'network' },
      { key: 'printerIp', value: '192.168.1.100' },
      { key: 'printerPort', value: '9100' },
      { key: 'printerName', value: 'Kitchen Printer' },
      { key: 'audioEnabled', value: 'true' },
      { key: 'audioVolume', value: '80' },
      { key: 'woocommerceUrl', value: 'https://mediumorchid-yak-784527.hostingersite.com' },
      { key: 'woocommerceKey', value: 'ck_edfde45d123a01595797228ecacea44181d05ea4' },
      { key: 'woocommerceSecret', value: 'cs_650879cb1fd02f1331bed8bc948852d4d2b6c701' },
      { key: 'webhookSecret', value: '' },
    ];

    defaultSettings.forEach(setting => {
      // Only set if not already exists (prevents overwriting user changes)
      if (!this.settings.has(setting.key)) {
        const settingWithId: Setting = {
          id: this.currentSettingId++,
          key: setting.key,
          value: setting.value,
        };
        this.settings.set(setting.key, settingWithId);
      }
    });
  }

  async getOrders(): Promise<Order[]> {
    return Array.from(this.orders.values()).sort((a, b) => 
      new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()
    );
  }

  async getOrder(id: number): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrderByWooCommerceId(woocommerceId: string): Promise<Order | undefined> {
    return Array.from(this.orders.values()).find(
      order => order.woocommerceId === woocommerceId
    );
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = this.currentOrderId++;
    const order: Order = {
      ...insertOrder,
      id,
      receivedAt: new Date(),
      printedAt: null,
      deliveryFee: insertOrder.deliveryFee || null,
      notes: insertOrder.notes || null,
      addressStreet: insertOrder.addressStreet || null,
      addressCity: insertOrder.addressCity || null,
      addressInstructions: insertOrder.addressInstructions || null,
      estimatedTime: insertOrder.estimatedTime || null,
    };
    this.orders.set(id, order);
    return order;
  }

  async updateOrderStatus(id: number, status: string): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    
    const updatedOrder = { ...order, status };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  async markOrderPrinted(id: number): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    
    const updatedOrder = { ...order, printedAt: new Date() };
    this.orders.set(id, updatedOrder);
    return updatedOrder;
  }

  async getSettings(): Promise<Setting[]> {
    return Array.from(this.settings.values());
  }

  async getSetting(key: string): Promise<Setting | undefined> {
    return this.settings.get(key);
  }

  async setSetting(insertSetting: InsertSetting): Promise<Setting> {
    const existing = this.settings.get(insertSetting.key);
    if (existing) {
      const updated = { ...existing, value: insertSetting.value };
      this.settings.set(insertSetting.key, updated);
      return updated;
    } else {
      const id = this.currentSettingId++;
      const setting: Setting = { ...insertSetting, id };
      this.settings.set(insertSetting.key, setting);
      return setting;
    }
  }
}

export const storage = new MemStorage();
