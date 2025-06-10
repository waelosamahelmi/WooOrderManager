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

  // WooCommerce webhook endpoint
  app.post("/api/webhook/woocommerce", async (req, res) => {
    try {
      const webhookData = req.body;
      
      // Transform WooCommerce order data to our format
      const orderData = {
        woocommerceId: webhookData.id?.toString() || Date.now().toString(),
        status: "pending",
        type: webhookData.meta_data?.find((m: any) => m.key === 'delivery_type')?.value || "delivery",
        customerName: `${webhookData.billing?.first_name || ''} ${webhookData.billing?.last_name || ''}`.trim(),
        customerPhone: webhookData.billing?.phone || '',
        customerEmail: webhookData.billing?.email || '',
        total: `${webhookData.total || '0'}€`,
        subtotal: `${webhookData.subtotal || '0'}€`,
        deliveryFee: webhookData.shipping_total ? `${webhookData.shipping_total}€` : null,
        items: JSON.stringify(webhookData.line_items?.map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          price: `${item.total}€`,
          meta: item.meta_data
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

  return httpServer;
}
