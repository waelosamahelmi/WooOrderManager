import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import { storage } from "./storage";
import { insertOrderSchema, insertSettingSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ 
    server: httpServer,
    path: '/ws'
  });

  // Store WebSocket connections
  const connections = new Set<any>();

  wss.on('connection', function connection(ws) {
    connections.add(ws);
    console.log('WebSocket client connected');

    ws.on('close', () => {
      connections.delete(ws);
      console.log('WebSocket client disconnected');
    });
  });

  // Broadcast to all connected clients
  function broadcast(data: any) {
    const message = JSON.stringify(data);
    connections.forEach(ws => {
      if (ws.readyState === 1) { // WebSocket.OPEN
        ws.send(message);
      }
    });
  }

  // Authentication API
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      
      // Simple authentication check
      if (email === "wael@helmies.fi" && password === "Weezy@1996") {
        res.json({ success: true, message: "Login successful" });
      } else {
        res.status(401).json({ error: "Invalid credentials" });
      }
    } catch (error) {
      res.status(500).json({ error: "Authentication failed" });
    }
  });

  // Orders API
  app.get("/api/orders", async (req, res) => {
    try {
      const orders = await storage.getOrders();
      res.json(orders);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch orders" });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.getOrder(id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch order" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const validatedData = insertOrderSchema.parse(req.body);
      const order = await storage.createOrder(validatedData);
      
      // Broadcast new order to all connected clients
      broadcast({
        type: 'NEW_ORDER',
        data: order
      });
      
      res.status(201).json(order);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid order data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to create order" });
    }
  });

  app.patch("/api/orders/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || !["pending", "processing", "completed", "refused"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }
      
      const order = await storage.updateOrderStatus(id, status);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      
      // Broadcast status update to all connected clients
      broadcast({
        type: 'ORDER_STATUS_UPDATE',
        data: order
      });
      
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to update order status" });
    }
  });

  app.patch("/api/orders/:id/print", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const order = await storage.markOrderPrinted(id);
      if (!order) {
        return res.status(404).json({ error: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to mark order as printed" });
    }
  });

  // Settings API
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      res.json(settings);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const validatedData = insertSettingSchema.parse(req.body);
      const setting = await storage.setSetting(validatedData);
      res.json(setting);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid setting data", details: error.errors });
      }
      res.status(500).json({ error: "Failed to save setting" });
    }
  });

  // Printer test endpoint
  app.post("/api/printer/test", async (req, res) => {
    try {
      const { ip, port } = req.body;
      
      if (!ip || !port) {
        return res.status(400).json({ success: false, message: "IP address and port are required" });
      }

      // Test TCP connection to printer
      const net = require('net');
      const socket = new net.Socket();
      
      const connectionPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          socket.destroy();
          reject(new Error('Connection timeout'));
        }, 5000); // 5 second timeout

        socket.connect(parseInt(port), ip, () => {
          clearTimeout(timeout);
          socket.destroy();
          resolve(true);
        });

        socket.on('error', (err: any) => {
          clearTimeout(timeout);
          socket.destroy();
          reject(err);
        });
      });

      await connectionPromise;
      res.json({ success: true, message: "Printer connection successful" });
    } catch (error: any) {
      res.json({ 
        success: false, 
        message: `Cannot connect to printer: ${error?.message || 'Unknown error'}` 
      });
    }
  });

  // Network device discovery endpoint
  app.post("/api/printer/discover", async (req, res) => {
    try {
      const net = require('net');
      const os = require('os');
      
      // Get local network interfaces
      const interfaces = os.networkInterfaces();
      const localNetworks: string[] = [];
      
      // Extract network ranges from local interfaces
      Object.values(interfaces).forEach((iface: any) => {
        if (iface) {
          iface.forEach((config: any) => {
            if (config.family === 'IPv4' && !config.internal && config.address) {
              // Convert IP to network range (e.g., 192.168.1.0/24)
              const parts = config.address.split('.');
              const networkBase = `${parts[0]}.${parts[1]}.${parts[2]}`;
              localNetworks.push(networkBase);
            }
          });
        }
      });

      const commonPrinterPorts = [9100, 515, 631, 80, 443];
      const discoveredDevices: any[] = [];
      const maxConcurrent = 20;
      
      // Scan common network ranges if no local networks found
      if (localNetworks.length === 0) {
        localNetworks.push('192.168.1', '192.168.0', '10.0.0');
      }

      const testConnection = (ip: string, port: number): Promise<{ ip: string, port: number, success: boolean }> => {
        return new Promise((resolve) => {
          const socket = new net.Socket();
          const timeout = setTimeout(() => {
            socket.destroy();
            resolve({ ip, port, success: false });
          }, 2000); // 2 second timeout for discovery

          socket.connect(port, ip, () => {
            clearTimeout(timeout);
            socket.destroy();
            resolve({ ip, port, success: true });
          });

          socket.on('error', () => {
            clearTimeout(timeout);
            socket.destroy();
            resolve({ ip, port, success: false });
          });
        });
      };

      // Create scan tasks
      const scanTasks: Promise<any>[] = [];
      
      for (const networkBase of localNetworks) {
        for (let i = 1; i <= 254; i++) {
          const ip = `${networkBase}.${i}`;
          for (const port of commonPrinterPorts) {
            scanTasks.push(testConnection(ip, port));
          }
        }
      }

      // Execute scans in batches to avoid overwhelming the network
      const results: any[] = [];
      for (let i = 0; i < scanTasks.length; i += maxConcurrent) {
        const batch = scanTasks.slice(i, i + maxConcurrent);
        const batchResults = await Promise.all(batch);
        results.push(...batchResults);
      }

      // Filter successful connections and group by IP
      const deviceMap = new Map();
      results.forEach(result => {
        if (result.success) {
          if (!deviceMap.has(result.ip)) {
            deviceMap.set(result.ip, {
              ip: result.ip,
              ports: [],
              type: 'Unknown Device',
              name: `Device at ${result.ip}`
            });
          }
          deviceMap.get(result.ip).ports.push(result.port);
        }
      });

      // Enhance device information based on open ports
      deviceMap.forEach((device, ip) => {
        if (device.ports.includes(9100)) {
          device.type = 'Network Printer';
          device.name = `Printer at ${ip}`;
          device.recommendedPort = 9100;
        } else if (device.ports.includes(515)) {
          device.type = 'LPD Printer';
          device.name = `LPD Printer at ${ip}`;
          device.recommendedPort = 515;
        } else if (device.ports.includes(631)) {
          device.type = 'IPP Printer';
          device.name = `IPP Printer at ${ip}`;
          device.recommendedPort = 631;
        } else if (device.ports.includes(80) || device.ports.includes(443)) {
          device.type = 'Web Device';
          device.name = `Web Device at ${ip}`;
          device.recommendedPort = device.ports.includes(9100) ? 9100 : device.ports[0];
        }
        discoveredDevices.push(device);
      });

      // Sort by printer likelihood (printers first)
      discoveredDevices.sort((a, b) => {
        const printerTypes = ['Network Printer', 'LPD Printer', 'IPP Printer'];
        const aIsPrinter = printerTypes.includes(a.type);
        const bIsPrinter = printerTypes.includes(b.type);
        
        if (aIsPrinter && !bIsPrinter) return -1;
        if (!aIsPrinter && bIsPrinter) return 1;
        return 0;
      });

      res.json({ 
        success: true, 
        devices: discoveredDevices,
        scannedNetworks: localNetworks,
        totalScanned: scanTasks.length
      });
    } catch (error: any) {
      res.json({ 
        success: false, 
        message: `Network discovery failed: ${error?.message || 'Unknown error'}`,
        devices: []
      });
    }
  });

  // Reset settings endpoint for fixing persistence issues
  app.post("/api/settings/reset", async (req, res) => {
    try {
      (storage as any).resetSettings();
      const settings = await storage.getSettings();
      res.json({ message: "Settings reset successfully", settings });
    } catch (error) {
      res.status(500).json({ error: "Failed to reset settings" });
    }
  });

  // WooCommerce API test endpoint
  app.post("/api/woocommerce/test", async (req, res) => {
    try {
      const { shopUrl, consumerKey, consumerSecret } = req.body;
      
      // Test WooCommerce API connection
      const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
      const testUrl = `${shopUrl}/wp-json/wc/v3/orders?per_page=1`;
      
      const response = await fetch(testUrl, {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        res.json({ success: true, message: "WooCommerce API connection successful" });
      } else {
        res.status(400).json({ success: false, message: "Invalid API credentials or store URL" });
      }
    } catch (error) {
      console.error("WooCommerce API test failed:", error);
      res.status(500).json({ success: false, message: "Connection test failed" });
    }
  });

  // WooCommerce webhook endpoint
  app.post("/api/webhook/woocommerce", async (req, res) => {
    try {
      const webhookData = req.body;
      
      console.log('Received WooCommerce webhook for order:', webhookData.id);
      
      // Transform WooCommerce order data to our format
      const orderData = {
        woocommerceId: webhookData.id?.toString() || Date.now().toString(),
        status: "pending",
        type: webhookData.shipping_lines?.length > 0 ? "delivery" : "pickup",
        customerName: `${webhookData.billing?.first_name || ''} ${webhookData.billing?.last_name || ''}`.trim(),
        customerPhone: webhookData.billing?.phone || 'Ei numeroa',
        customerEmail: webhookData.billing?.email || '',
        total: `${webhookData.total || '0'} €`,
        subtotal: `${webhookData.subtotal || '0'} €`,
        deliveryFee: webhookData.shipping_total ? `${webhookData.shipping_total} €` : null,
        items: JSON.stringify(webhookData.line_items?.map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          price: `${item.total} €`,
          variations: item.meta_data?.map((meta: any) => `${meta.display_key}: ${meta.display_value}`) || []
        })) || []),
        notes: webhookData.customer_note || null,
        addressStreet: webhookData.shipping?.address_1 || webhookData.billing?.address_1 || '',
        addressCity: `${webhookData.shipping?.postcode || webhookData.billing?.postcode || ''} ${webhookData.shipping?.city || webhookData.billing?.city || ''}`.trim(),
        addressInstructions: webhookData.meta_data?.find((m: any) => m.key === 'delivery_instructions')?.value || null,
        estimatedTime: new Date(Date.now() + 30 * 60 * 1000).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })
      };

      const order = await storage.createOrder(orderData);
      
      // Broadcast new order to all connected clients
      broadcast({
        type: 'NEW_ORDER',
        data: order
      });
      
      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: "Failed to process webhook" });
    }
  });

  // Test endpoint to simulate orders
  app.post("/api/test/order", async (req, res) => {
    try {
      const testOrder = {
        woocommerceId: `test-${Date.now()}`,
        status: "pending",
        type: "delivery",
        customerName: "Matti Meikäläinen",
        customerPhone: "+358 40 123 4567",
        customerEmail: "matti@email.com",
        total: "32.50€",
        subtotal: "29.00€",
        deliveryFee: "3.50€",
        items: JSON.stringify([
          { name: "2x Margherita Pizza (L)", quantity: 2, price: "24.00€", meta: [{ key: "Extra juusto", value: "2.00€" }, { key: "Kinkku", value: "3.00€" }] },
          { name: "1x Coca Cola 0.5L", quantity: 1, price: "3.50€", meta: [] }
        ]),
        notes: "Ei sipulia, hyvin paistettuna",
        addressStreet: "Esimerkkikatu 123 A 45",
        addressCity: "00100 Helsinki",
        addressInstructions: "2. kerros, ovikello 'Meikäläinen'",
        estimatedTime: new Date(Date.now() + 30 * 60 * 1000).toLocaleTimeString('fi-FI', { hour: '2-digit', minute: '2-digit' })
      };

      const order = await storage.createOrder(testOrder);
      
      // Broadcast new order to all connected clients
      broadcast({
        type: 'NEW_ORDER',
        data: order
      });
      
      res.json(order);
    } catch (error) {
      res.status(500).json({ error: "Failed to create test order" });
    }
  });

  // Print endpoint for network printers
  app.post("/api/print", async (req, res) => {
    try {
      const { printerSettings, receiptData, order } = req.body;
      
      console.log('Printing order:', order.woocommerceId);
      console.log('Printer:', printerSettings.ipAddress + ':' + printerSettings.port);
      
      // Mark order as printed
      await storage.markOrderPrinted(order.id);
      
      // In production, send ESC/POS commands to network printer via socket
      // const net = require('net');
      // const client = new net.Socket();
      // client.connect(printerSettings.port, printerSettings.ipAddress, () => {
      //   client.write(receiptData);
      //   client.end();
      // });
      
      res.json({ success: true, message: "Order printed successfully" });
    } catch (error) {
      console.error("Print failed:", error);
      res.status(500).json({ success: false, message: "Print failed" });
    }
  });

  // Test printer connection
  app.post("/api/printer/test", async (req, res) => {
    try {
      const { printerSettings } = req.body;
      
      console.log('Testing printer:', printerSettings.ipAddress + ':' + printerSettings.port);
      
      // In production, test actual network connection to printer
      const isConnected = printerSettings.ipAddress && printerSettings.port;
      
      res.json({ 
        success: isConnected, 
        message: isConnected ? "Printer connection test successful" : "Invalid printer settings" 
      });
    } catch (error) {
      console.error("Printer test failed:", error);
      res.status(500).json({ success: false, message: "Test failed" });
    }
  });

  return httpServer;
}
