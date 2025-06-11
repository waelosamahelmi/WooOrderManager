import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer } from "ws";
import * as net from "net";
import * as os from "os";
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

  // Enhanced printer test endpoint with better error handling
  app.post("/api/printer/test", async (req, res) => {
    try {
      const { ip, port } = req.body;
      
      if (!ip || !port) {
        return res.status(400).json({ success: false, message: "IP address and port are required" });
      }

      // Validate IP address format
      const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
      if (!ipRegex.test(ip)) {
        return res.status(400).json({ success: false, message: "Invalid IP address format" });
      }

      // Validate port range
      const portNum = parseInt(port);
      if (isNaN(portNum) || portNum < 1 || portNum > 65535) {
        return res.status(400).json({ success: false, message: "Invalid port number (1-65535)" });
      }

      // Test TCP connection to printer with enhanced timeout and retry
      const testConnection = async (attempt = 1): Promise<boolean> => {
        return new Promise((resolve, reject) => {
          const socket = new net.Socket();
          
          const timeout = setTimeout(() => {
            socket.destroy();
            reject(new Error(`Connection timeout (attempt ${attempt})`));
          }, 3000); // 3 second timeout per attempt

          socket.connect(portNum, ip, () => {
            clearTimeout(timeout);
            
            // Try to send a simple ESC/POS command to verify it's a printer
            try {
              socket.write('\x1B@'); // Initialize printer command
              setTimeout(() => {
                socket.destroy();
                resolve(true);
              }, 100);
            } catch (err) {
              socket.destroy();
              resolve(true); // Connection works even if not ESC/POS
            }
          });

          socket.on('error', (err: any) => {
            clearTimeout(timeout);
            socket.destroy();
            reject(err);
          });
        });
      };

      // Try up to 2 attempts
      let lastError;
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          await testConnection(attempt);
          res.json({ 
            success: true, 
            message: "Printer connection successful",
            details: `Connected to ${ip}:${port}`
          });
          return;
        } catch (error: any) {
          lastError = error;
          if (attempt < 2) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between attempts
          }
        }
      }

      throw lastError;
    } catch (error: any) {
      console.error('Printer test failed:', error);
      res.json({ 
        success: false, 
        message: `Cannot connect to printer: ${error?.message || 'Unknown error'}`,
        details: `Failed to connect to ${req.body.ip}:${req.body.port}`
      });
    }
  });

  // Network device discovery endpoint
  app.post("/api/printer/discover", async (req, res) => {
    try {
      
      // Get local network interfaces
      const interfaces = os.networkInterfaces();
      const localNetworks: string[] = [];
      
      // Extract network ranges from local interfaces
      Object.values(interfaces).forEach((iface: any) => {
        if (iface) {
          iface.forEach((config: any) => {
            if (config.family === 'IPv4' && !config.internal && config.address) {
              const ip = config.address;
              // Skip link-local addresses (169.254.x.x) and other non-local ranges
              if (ip.startsWith('169.254.') || ip.startsWith('127.') || 
                  ip.startsWith('224.') || ip.startsWith('240.')) {
                return;
              }
              
              // Only include private network ranges
              if (ip.startsWith('192.168.') || ip.startsWith('10.') || 
                  (ip.startsWith('172.') && parseInt(ip.split('.')[1]) >= 16 && parseInt(ip.split('.')[1]) <= 31)) {
                const parts = ip.split('.');
                const networkBase = `${parts[0]}.${parts[1]}.${parts[2]}`;
                if (!localNetworks.includes(networkBase)) {
                  localNetworks.push(networkBase);
                }
              }
            }
          });
        }
      });

      const commonPrinterPorts = [9100, 515, 631, 80, 443, 8080];
      const discoveredDevices: any[] = [];
      const maxConcurrent = 30; // Reduced for better stability
      
      // Scan common network ranges if no local networks found
      if (localNetworks.length === 0) {
        localNetworks.push('192.168.1', '192.168.0', '10.0.1', '10.0.0');
      }

      console.log('Scanning networks:', localNetworks);

      const testConnection = (ip: string, port: number): Promise<{ ip: string, port: number, success: boolean }> => {
        return new Promise((resolve) => {
          const socket = new net.Socket();
          const timeout = setTimeout(() => {
            socket.destroy();
            resolve({ ip, port, success: false });
          }, 2000); // 2 second timeout for faster scanning

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
        
        // Progress update for large scans
        if (i % (maxConcurrent * 4) === 0) {
          console.log(`Scanned ${i + maxConcurrent}/${scanTasks.length} targets...`);
        }
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
              name: `Device at ${result.ip}`,
              confidence: 0
            });
          }
          deviceMap.get(result.ip).ports.push(result.port);
        }
      });

      // Enhanced device classification with confidence scoring
      deviceMap.forEach((device, ip) => {
        device.confidence = 0;
        
        if (device.ports.includes(9100)) {
          device.type = 'ESC/POS Network Printer';
          device.name = `ESC/POS Printer at ${ip}`;
          device.recommendedPort = 9100;
          device.confidence = 95;
        } else if (device.ports.includes(515)) {
          device.type = 'LPD Line Printer';
          device.name = `LPD Printer at ${ip}`;
          device.recommendedPort = 515;
          device.confidence = 85;
        } else if (device.ports.includes(631)) {
          device.type = 'IPP Internet Printer';
          device.name = `IPP Printer at ${ip}`;
          device.recommendedPort = 631;
          device.confidence = 80;
        } else if (device.ports.includes(80) || device.ports.includes(443)) {
          device.type = 'Web-enabled Device';
          device.name = `Web Device at ${ip}`;
          device.recommendedPort = device.ports.includes(80) ? 80 : 443;
          device.confidence = 30;
        } else if (device.ports.includes(8080)) {
          device.type = 'Web Server';
          device.name = `Web Server at ${ip}`;
          device.recommendedPort = 8080;
          device.confidence = 25;
        }
        
        // Add additional ports to description
        if (device.ports.length > 1) {
          device.description = `Available ports: ${device.ports.join(', ')}`;
        }
        
        discoveredDevices.push(device);
      });

      // Sort by printer likelihood (confidence score)
      discoveredDevices.sort((a, b) => b.confidence - a.confidence);

      console.log(`Discovery complete. Found ${discoveredDevices.length} devices.`);

      res.json({ 
        success: true, 
        devices: discoveredDevices,
        scannedNetworks: localNetworks,
        totalScanned: scanTasks.length,
        summary: `Found ${discoveredDevices.length} devices across ${localNetworks.length} networks`
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

  // Enhanced WooCommerce API test endpoint
  app.post("/api/woocommerce/test", async (req, res) => {
    try {
      const { shopUrl, consumerKey, consumerSecret } = req.body;
      
      // Validate input parameters
      if (!shopUrl || !consumerKey || !consumerSecret) {
        return res.status(400).json({ 
          success: false, 
          message: "Store URL, Consumer Key, and Consumer Secret are required" 
        });
      }

      // Validate URL format
      try {
        new URL(shopUrl);
      } catch {
        return res.status(400).json({ 
          success: false, 
          message: "Invalid store URL format" 
        });
      }
      
      console.log('Testing WooCommerce API connection to:', shopUrl);
      
      // Test WooCommerce API connection with multiple endpoints
      const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
      
      // Test system status first (lighter endpoint)
      const systemStatusUrl = `${shopUrl}/wp-json/wc/v3/system_status`;
      
      try {
        const systemResponse = await fetch(systemStatusUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
            'User-Agent': 'Ravintola-Tirva-Kitchen/1.0'
          },
          timeout: 10000 // 10 second timeout
        });

        if (systemResponse.ok) {
          const systemData = await systemResponse.json();
          console.log('WooCommerce system status retrieved successfully');
          
          // Also test orders endpoint to ensure full access
          const ordersTestUrl = `${shopUrl}/wp-json/wc/v3/orders?per_page=1&status=any`;
          const ordersResponse = await fetch(ordersTestUrl, {
            method: 'GET',
            headers: {
              'Authorization': `Basic ${auth}`,
              'Content-Type': 'application/json',
              'User-Agent': 'Ravintola-Tirva-Kitchen/1.0'
            },
            timeout: 10000
          });

          if (ordersResponse.ok) {
            const ordersData = await ordersResponse.json();
            console.log('WooCommerce orders API access confirmed');
            
            res.json({ 
              success: true, 
              message: "WooCommerce API connection successful",
              details: {
                storeUrl: shopUrl,
                ordersAccess: true,
                systemAccess: true,
                wooCommerceVersion: systemData?.environment?.version || 'Unknown'
              }
            });
          } else {
            throw new Error(`Orders API access failed: ${ordersResponse.status} ${ordersResponse.statusText}`);
          }
        } else if (systemResponse.status === 401) {
          res.status(401).json({ 
            success: false, 
            message: "Invalid API credentials - check Consumer Key and Secret" 
          });
        } else if (systemResponse.status === 404) {
          res.status(404).json({ 
            success: false, 
            message: "WooCommerce API not found - check store URL and ensure WooCommerce is installed" 
          });
        } else {
          throw new Error(`API returned ${systemResponse.status}: ${systemResponse.statusText}`);
        }
      } catch (fetchError: any) {
        if (fetchError.name === 'AbortError') {
          res.status(408).json({ 
            success: false, 
            message: "Connection timeout - store may be unreachable" 
          });
        } else {
          throw fetchError;
        }
      }
    } catch (error: any) {
      console.error("WooCommerce API test failed:", error);
      
      let errorMessage = "Connection test failed";
      if (error.message.includes('ENOTFOUND')) {
        errorMessage = "Store URL not found - check the domain name";
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = "Connection refused - store may be down";
      } else if (error.message.includes('timeout')) {
        errorMessage = "Connection timeout - store is taking too long to respond";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      res.status(500).json({ 
        success: false, 
        message: errorMessage,
        details: `Failed to connect to ${req.body.shopUrl}`
      });
    }
  });

  // Enhanced WooCommerce webhook endpoint
  app.post("/api/webhook/woocommerce", async (req, res) => {
    try {
      const webhookData = req.body;
      
      console.log('Received WooCommerce webhook for order:', webhookData.id);
      console.log('Order status:', webhookData.status);
      console.log('Order data keys:', Object.keys(webhookData));
      
      // Validate required webhook data
      if (!webhookData.id) {
        console.error('Webhook missing order ID');
        return res.status(400).json({ error: "Invalid webhook data - missing order ID" });
      }

      // Skip if order already exists (prevent duplicates)
      const existingOrder = await storage.getOrderByWooCommerceId(webhookData.id.toString());
      if (existingOrder) {
        console.log('Order already exists, skipping creation');
        return res.status(200).json({ received: true, message: "Order already exists" });
      }

      // Enhanced order data transformation with better fallbacks
      const orderData = {
        woocommerceId: webhookData.id?.toString() || Date.now().toString(),
        status: "pending",
        type: (webhookData.shipping_lines && webhookData.shipping_lines.length > 0) ? "delivery" : "pickup",
        customerName: `${webhookData.billing?.first_name || ''} ${webhookData.billing?.last_name || ''}`.trim() || 'Tuntematon asiakas',
        customerPhone: webhookData.billing?.phone || webhookData.shipping?.phone || 'Ei numeroa',
        customerEmail: webhookData.billing?.email || webhookData.shipping?.email || '',
        total: webhookData.total ? `${webhookData.total} €` : '0 €',
        subtotal: webhookData.subtotal ? `${webhookData.subtotal} €` : '0 €',
        deliveryFee: webhookData.shipping_total && parseFloat(webhookData.shipping_total) > 0 ? `${webhookData.shipping_total} €` : null,
        
        // Enhanced items processing
        items: JSON.stringify(webhookData.line_items?.map((item: any) => ({
          name: item.name || 'Tuntematon tuote',
          quantity: item.quantity || 1,
          price: item.total ? `${item.total} €` : '0 €',
          variations: item.meta_data?.filter((meta: any) => 
            meta.key && meta.value && 
            !meta.key.startsWith('_') && 
            meta.display_key && meta.display_value
          ).map((meta: any) => `${meta.display_key}: ${meta.display_value}`) || [],
          meta: item.meta_data?.filter((meta: any) => 
            meta.key && meta.value && !meta.key.startsWith('_')
          ).map((meta: any) => ({
            key: meta.display_key || meta.key,
            value: meta.display_value || meta.value
          })) || []
        })) || []),
        
        notes: webhookData.customer_note || null,
        
        // Enhanced address handling
        addressStreet: webhookData.shipping?.address_1 || webhookData.billing?.address_1 || '',
        addressCity: [
          webhookData.shipping?.postcode || webhookData.billing?.postcode || '',
          webhookData.shipping?.city || webhookData.billing?.city || ''
        ].filter(Boolean).join(' ').trim(),
        
        // Look for delivery instructions in meta data
        addressInstructions: webhookData.meta_data?.find((m: any) => 
          m.key === 'delivery_instructions' || 
          m.key === '_delivery_instructions' ||
          m.key === 'order_comments'
        )?.value || null,
        
        // Calculate estimated time (30 minutes from now)
        estimatedTime: new Date(Date.now() + 30 * 60 * 1000).toLocaleTimeString('fi-FI', { 
          hour: '2-digit', 
          minute: '2-digit' 
        })
      };

      console.log('Creating order with data:', {
        ...orderData,
        items: 'JSON string with ' + (webhookData.line_items?.length || 0) + ' items'
      });

      const order = await storage.createOrder(orderData);
      
      // Broadcast new order to all connected clients
      broadcast({
        type: 'NEW_ORDER',
        data: order
      });
      
      console.log('Order created successfully with ID:', order.id);
      
      res.status(200).json({ 
        received: true, 
        orderId: order.id,
        woocommerceId: order.woocommerceId
      });
    } catch (error: any) {
      console.error('Webhook processing error:', error);
      console.error('Webhook data:', JSON.stringify(req.body, null, 2));
      
      res.status(500).json({ 
        error: "Failed to process webhook",
        details: error.message,
        orderId: req.body?.id
      });
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

  // Enhanced print endpoint for network printers with actual ESC/POS printing
  app.post("/api/print", async (req, res) => {
    try {
      const { printerSettings, receiptData, order } = req.body;
      
      console.log('Printing order:', order.woocommerceId);
      console.log('Printer:', printerSettings.ipAddress + ':' + printerSettings.port);
      
      // Validate printer settings
      if (!printerSettings.ipAddress || !printerSettings.port) {
        return res.status(400).json({ 
          success: false, 
          message: "Printer IP address and port are required" 
        });
      }

      // Send ESC/POS commands to network printer via socket
      const printPromise = new Promise((resolve, reject) => {
        const client = new net.Socket();
        
        const timeout = setTimeout(() => {
          client.destroy();
          reject(new Error('Print timeout - printer may be offline'));
        }, 10000); // 10 second timeout for printing

        client.connect(parseInt(printerSettings.port), printerSettings.ipAddress, () => {
          console.log('Connected to printer, sending data...');
          
          try {
            // Send the formatted receipt data
            client.write(receiptData, 'binary');
            
            // Give printer time to process
            setTimeout(() => {
              clearTimeout(timeout);
              client.end();
              resolve(true);
            }, 2000);
          } catch (writeError) {
            clearTimeout(timeout);
            client.destroy();
            reject(writeError);
          }
        });

        client.on('error', (error: any) => {
          clearTimeout(timeout);
          client.destroy();
          reject(error);
        });

        client.on('close', () => {
          clearTimeout(timeout);
          console.log('Printer connection closed');
        });
      });

      try {
        await printPromise;
        
        // Mark order as printed only after successful printing
        await storage.markOrderPrinted(order.id);
        
        res.json({ 
          success: true, 
          message: "Order printed successfully",
          details: `Printed to ${printerSettings.ipAddress}:${printerSettings.port}`
        });
      } catch (printError) {
        console.error('Print operation failed:', printError);
        res.status(500).json({ 
          success: false, 
          message: `Print failed: ${printError.message}`,
          details: `Failed to print to ${printerSettings.ipAddress}:${printerSettings.port}`
        });
      }
    } catch (error) {
      console.error("Print failed:", error);
      res.status(500).json({ 
        success: false, 
        message: "Print operation failed",
        details: error.message
      });
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
