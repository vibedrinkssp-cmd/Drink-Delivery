import { pgTable, text, varchar, integer, decimal, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: text("name").notNull(),
  whatsapp: text("whatsapp").notNull().unique(),
  role: text("role").notNull().default("customer"),
  password: text("password"),
  isBlocked: boolean("is_blocked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const addresses = pgTable("addresses", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  street: text("street").notNull(),
  number: text("number").notNull(),
  complement: text("complement"),
  neighborhood: text("neighborhood").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  notes: text("notes"),
  isDefault: boolean("is_default").default(true),
});

export const categories = pgTable("categories", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: text("name").notNull(),
  iconUrl: text("icon_url"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const products = pgTable("products", {
  id: varchar("id", { length: 36 }).primaryKey(),
  categoryId: varchar("category_id", { length: 36 }).notNull().references(() => categories.id),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  costPrice: decimal("cost_price", { precision: 10, scale: 2 }).notNull(),
  profitMargin: decimal("profit_margin", { precision: 5, scale: 2 }).notNull(),
  salePrice: decimal("sale_price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").notNull().default(0),
  isActive: boolean("is_active").default(true),
  productType: text("product_type"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const orders = pgTable("orders", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  addressId: varchar("address_id", { length: 36 }).references(() => addresses.id),
  orderType: text("order_type").notNull().default("delivery"),
  status: text("status").notNull().default("pending"),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  deliveryFee: decimal("delivery_fee", { precision: 10, scale: 2 }).notNull(),
  deliveryDistance: decimal("delivery_distance", { precision: 10, scale: 2 }),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0"),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  changeFor: decimal("change_for", { precision: 10, scale: 2 }),
  notes: text("notes"),
  customerName: text("customer_name"),
  motoboyId: varchar("motoboy_id", { length: 36 }).references(() => motoboys.id),
  createdAt: timestamp("created_at").defaultNow(),
  acceptedAt: timestamp("accepted_at"),
  preparingAt: timestamp("preparing_at"),
  readyAt: timestamp("ready_at"),
  dispatchedAt: timestamp("dispatched_at"),
  deliveredAt: timestamp("delivered_at"),
});

export const orderItems = pgTable("order_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  orderId: varchar("order_id", { length: 36 }).notNull().references(() => orders.id),
  productId: varchar("product_id", { length: 36 }).notNull().references(() => products.id),
  productName: text("product_name").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  totalPrice: decimal("total_price", { precision: 10, scale: 2 }).notNull(),
});

export const banners = pgTable("banners", {
  id: varchar("id", { length: 36 }).primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  imageUrl: text("image_url").notNull(),
  linkUrl: text("link_url"),
  sortOrder: integer("sort_order").default(0),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const motoboys = pgTable("motoboys", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: text("name").notNull(),
  whatsapp: text("whatsapp").notNull().unique(),
  photoUrl: text("photo_url"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const stockLogs = pgTable("stock_logs", {
  id: varchar("id", { length: 36 }).primaryKey(),
  productId: varchar("product_id", { length: 36 }).notNull().references(() => products.id),
  previousStock: integer("previous_stock").notNull(),
  newStock: integer("new_stock").notNull(),
  change: integer("change").notNull(),
  reason: text("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: varchar("id", { length: 36 }).primaryKey(),
  storeAddress: text("store_address"),
  storeLat: decimal("store_lat", { precision: 10, scale: 7 }),
  storeLng: decimal("store_lng", { precision: 10, scale: 7 }),
  deliveryRatePerKm: decimal("delivery_rate_per_km", { precision: 10, scale: 2 }).default("1.25"),
  minDeliveryFee: decimal("min_delivery_fee", { precision: 10, scale: 2 }).default("5.00"),
  maxDeliveryDistance: decimal("max_delivery_distance", { precision: 10, scale: 2 }).default("15"),
  pixKey: text("pix_key"),
  openingHours: jsonb("opening_hours"),
  isOpen: boolean("is_open").default(true),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertAddressSchema = createInsertSchema(addresses).omit({ id: true });
export const insertCategorySchema = createInsertSchema(categories).omit({ id: true, createdAt: true });
export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, acceptedAt: true, preparingAt: true, readyAt: true, dispatchedAt: true, deliveredAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export const insertBannerSchema = createInsertSchema(banners).omit({ id: true, createdAt: true });
export const insertMotoboySchema = createInsertSchema(motoboys).omit({ id: true, createdAt: true });
export const insertStockLogSchema = createInsertSchema(stockLogs).omit({ id: true, createdAt: true });
export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true });

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertAddress = z.infer<typeof insertAddressSchema>;
export type Address = typeof addresses.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categories.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertBanner = z.infer<typeof insertBannerSchema>;
export type Banner = typeof banners.$inferSelect;
export type InsertMotoboy = z.infer<typeof insertMotoboySchema>;
export type Motoboy = typeof motoboys.$inferSelect;
export type InsertStockLog = z.infer<typeof insertStockLogSchema>;
export type StockLog = typeof stockLogs.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settings.$inferSelect;

export type CartItem = {
  productId: string;
  product: Product;
  quantity: number;
};

export type OrderStatus = "pending" | "accepted" | "preparing" | "ready" | "dispatched" | "delivered" | "cancelled";

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Aguardando",
  accepted: "Aceito",
  preparing: "Em produção",
  ready: "Pronto",
  dispatched: "Despachado",
  delivered: "Entregue",
  cancelled: "Cancelado",
};

export type PaymentMethod = "cash" | "pix" | "card_pos" | "card_credit" | "card_debit";

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: "Dinheiro",
  pix: "PIX",
  card_pos: "Cartao (POS)",
  card_credit: "Credito",
  card_debit: "Debito",
};

export type OrderType = "delivery" | "counter";

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  delivery: "Delivery",
  counter: "Balcao",
};
