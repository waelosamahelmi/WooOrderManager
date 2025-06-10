import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  woocommerceId: text("woocommerce_id").notNull().unique(),
  status: text("status").notNull(), // pending, processing, completed, refused
  type: text("type").notNull(), // delivery, pickup
  customerName: text("customer_name").notNull(),
  customerPhone: text("customer_phone").notNull(),
  customerEmail: text("customer_email").notNull(),
  total: text("total").notNull(),
  subtotal: text("subtotal").notNull(),
  deliveryFee: text("delivery_fee"),
  items: text("items").notNull(), // JSON string
  notes: text("notes"),
  addressStreet: text("address_street"),
  addressCity: text("address_city"),
  addressInstructions: text("address_instructions"),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
  estimatedTime: text("estimated_time"),
  printedAt: timestamp("printed_at"),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  receivedAt: true,
  printedAt: true,
});

export const insertSettingSchema = createInsertSchema(settings).omit({
  id: true,
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingSchema>;

export const orderStatusOptions = ["pending", "processing", "completed", "refused"] as const;
export const orderTypeOptions = ["delivery", "pickup"] as const;
