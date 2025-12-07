import { randomUUID } from "crypto";
import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import { 
  users, addresses, categories, products, orders, orderItems, 
  banners, motoboys, stockLogs, settings
} from "@shared/schema";
import type { 
  User, InsertUser, 
  Address, InsertAddress,
  Category, InsertCategory,
  Product, InsertProduct,
  Order, InsertOrder,
  OrderItem, InsertOrderItem,
  Banner, InsertBanner,
  Motoboy, InsertMotoboy,
  StockLog, InsertStockLog,
  Settings, InsertSettings
} from "@shared/schema";

export interface IStorage {
  getUsers(): Promise<User[]>;
  getUser(id: string): Promise<User | undefined>;
  getUserByWhatsapp(whatsapp: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;

  getAddresses(userId: string): Promise<Address[]>;
  getAddress(id: string): Promise<Address | undefined>;
  createAddress(address: InsertAddress): Promise<Address>;
  updateAddress(id: string, address: Partial<InsertAddress>): Promise<Address | undefined>;
  deleteAddress(id: string): Promise<boolean>;

  getCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<boolean>;

  getProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductsByCategory(categoryId: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;

  getOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrdersByUser(userId: string): Promise<Order[]>;
  getOrdersByStatus(status: string): Promise<Order[]>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, order: Partial<Order>): Promise<Order | undefined>;

  getOrderItems(orderId: string): Promise<OrderItem[]>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;

  getBanners(): Promise<Banner[]>;
  getBanner(id: string): Promise<Banner | undefined>;
  createBanner(banner: InsertBanner): Promise<Banner>;
  updateBanner(id: string, banner: Partial<InsertBanner>): Promise<Banner | undefined>;
  deleteBanner(id: string): Promise<boolean>;

  getMotoboys(): Promise<Motoboy[]>;
  getMotoboy(id: string): Promise<Motoboy | undefined>;
  createMotoboy(motoboy: InsertMotoboy): Promise<Motoboy>;
  updateMotoboy(id: string, motoboy: Partial<InsertMotoboy>): Promise<Motoboy | undefined>;
  deleteMotoboy(id: string): Promise<boolean>;

  getSettings(): Promise<Settings | undefined>;
  updateSettings(settings: Partial<InsertSettings>): Promise<Settings>;

  createStockLog(log: InsertStockLog): Promise<StockLog>;
}

export class DatabaseStorage implements IStorage {
  async getUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByWhatsapp(whatsapp: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.whatsapp, whatsapp));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const [user] = await db.insert(users).values({ 
      id, 
      name: insertUser.name,
      whatsapp: insertUser.whatsapp,
      role: insertUser.role ?? "customer",
      password: insertUser.password ?? null,
      isBlocked: insertUser.isBlocked ?? false,
    }).returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async getAddresses(userId: string): Promise<Address[]> {
    return await db.select().from(addresses).where(eq(addresses.userId, userId));
  }

  async getAddress(id: string): Promise<Address | undefined> {
    const [address] = await db.select().from(addresses).where(eq(addresses.id, id));
    return address || undefined;
  }

  async createAddress(insertAddress: InsertAddress): Promise<Address> {
    const id = randomUUID();
    const [address] = await db.insert(addresses).values({ 
      id, 
      userId: insertAddress.userId,
      street: insertAddress.street,
      number: insertAddress.number,
      complement: insertAddress.complement ?? null,
      neighborhood: insertAddress.neighborhood,
      city: insertAddress.city,
      state: insertAddress.state,
      zipCode: insertAddress.zipCode,
      notes: insertAddress.notes ?? null,
      isDefault: insertAddress.isDefault ?? true 
    }).returning();
    return address;
  }

  async updateAddress(id: string, updates: Partial<InsertAddress>): Promise<Address | undefined> {
    const [address] = await db.update(addresses).set(updates).where(eq(addresses.id, id)).returning();
    return address || undefined;
  }

  async deleteAddress(id: string): Promise<boolean> {
    const result = await db.delete(addresses).where(eq(addresses.id, id));
    return true;
  }

  async getCategories(): Promise<Category[]> {
    const result = await db.select().from(categories).where(eq(categories.isActive, true));
    return result.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = randomUUID();
    const [category] = await db.insert(categories).values({ 
      id, 
      name: insertCategory.name,
      iconUrl: insertCategory.iconUrl ?? null,
      sortOrder: insertCategory.sortOrder ?? 0,
      isActive: insertCategory.isActive ?? true,
    }).returning();
    return category;
  }

  async updateCategory(id: string, updates: Partial<InsertCategory>): Promise<Category | undefined> {
    const [category] = await db.update(categories).set(updates).where(eq(categories.id, id)).returning();
    return category || undefined;
  }

  async deleteCategory(id: string): Promise<boolean> {
    await db.delete(categories).where(eq(categories.id, id));
    return true;
  }

  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.isActive, true));
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    return await db.select().from(products)
      .where(eq(products.categoryId, categoryId));
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const [product] = await db.insert(products).values({ 
      id, 
      categoryId: insertProduct.categoryId,
      name: insertProduct.name,
      description: insertProduct.description ?? null,
      imageUrl: insertProduct.imageUrl ?? null,
      costPrice: insertProduct.costPrice,
      profitMargin: insertProduct.profitMargin,
      salePrice: insertProduct.salePrice,
      stock: insertProduct.stock ?? 0,
      isActive: insertProduct.isActive ?? true,
      productType: insertProduct.productType ?? null,
    }).returning();
    return product;
  }

  async updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    const [product] = await db.update(products).set(updates).where(eq(products.id, id)).returning();
    return product || undefined;
  }

  async deleteProduct(id: string): Promise<boolean> {
    await db.update(products).set({ isActive: false }).where(eq(products.id, id));
    return true;
  }

  async getOrders(): Promise<Order[]> {
    return await db.select().from(orders).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrdersByUser(userId: string): Promise<Order[]> {
    return await db.select().from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));
  }

  async getOrdersByStatus(status: string): Promise<Order[]> {
    return await db.select().from(orders)
      .where(eq(orders.status, status))
      .orderBy(desc(orders.createdAt));
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const [order] = await db.insert(orders).values({ 
      id, 
      userId: insertOrder.userId,
      addressId: insertOrder.addressId ?? null,
      orderType: insertOrder.orderType ?? "delivery",
      status: insertOrder.status ?? "pending",
      subtotal: insertOrder.subtotal,
      deliveryFee: insertOrder.deliveryFee,
      deliveryDistance: insertOrder.deliveryDistance ?? null,
      discount: insertOrder.discount ?? "0",
      total: insertOrder.total,
      paymentMethod: insertOrder.paymentMethod,
      changeFor: insertOrder.changeFor ?? null,
      notes: insertOrder.notes ?? null,
      customerName: insertOrder.customerName ?? null,
      motoboyId: insertOrder.motoboyId ?? null,
    }).returning();
    return order;
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
    const [order] = await db.update(orders).set(updates).where(eq(orders.id, id)).returning();
    return order || undefined;
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async createOrderItem(insertItem: InsertOrderItem): Promise<OrderItem> {
    const id = randomUUID();
    const [item] = await db.insert(orderItems).values({ id, ...insertItem }).returning();
    return item;
  }

  async getBanners(): Promise<Banner[]> {
    const result = await db.select().from(banners).where(eq(banners.isActive, true));
    return result.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  async getBanner(id: string): Promise<Banner | undefined> {
    const [banner] = await db.select().from(banners).where(eq(banners.id, id));
    return banner || undefined;
  }

  async createBanner(insertBanner: InsertBanner): Promise<Banner> {
    const id = randomUUID();
    const [banner] = await db.insert(banners).values({ 
      id, 
      title: insertBanner.title,
      description: insertBanner.description ?? null,
      imageUrl: insertBanner.imageUrl,
      linkUrl: insertBanner.linkUrl ?? null,
      sortOrder: insertBanner.sortOrder ?? 0,
      isActive: insertBanner.isActive ?? true,
    }).returning();
    return banner;
  }

  async updateBanner(id: string, updates: Partial<InsertBanner>): Promise<Banner | undefined> {
    const [banner] = await db.update(banners).set(updates).where(eq(banners.id, id)).returning();
    return banner || undefined;
  }

  async deleteBanner(id: string): Promise<boolean> {
    await db.delete(banners).where(eq(banners.id, id));
    return true;
  }

  async getMotoboys(): Promise<Motoboy[]> {
    return await db.select().from(motoboys);
  }

  async getMotoboy(id: string): Promise<Motoboy | undefined> {
    const [motoboy] = await db.select().from(motoboys).where(eq(motoboys.id, id));
    return motoboy || undefined;
  }

  async createMotoboy(insertMotoboy: InsertMotoboy): Promise<Motoboy> {
    const id = randomUUID();
    const [motoboy] = await db.insert(motoboys).values({ 
      id, 
      name: insertMotoboy.name,
      whatsapp: insertMotoboy.whatsapp,
      photoUrl: insertMotoboy.photoUrl ?? null,
      isActive: insertMotoboy.isActive ?? true,
    }).returning();
    return motoboy;
  }

  async updateMotoboy(id: string, updates: Partial<InsertMotoboy>): Promise<Motoboy | undefined> {
    const [motoboy] = await db.update(motoboys).set(updates).where(eq(motoboys.id, id)).returning();
    return motoboy || undefined;
  }

  async deleteMotoboy(id: string): Promise<boolean> {
    await db.delete(motoboys).where(eq(motoboys.id, id));
    return true;
  }

  async getSettings(): Promise<Settings | undefined> {
    const [setting] = await db.select().from(settings);
    return setting || undefined;
  }

  async updateSettings(updates: Partial<InsertSettings>): Promise<Settings> {
    const existing = await this.getSettings();
    if (!existing) {
      const id = randomUUID();
      const [setting] = await db.insert(settings).values({
        id,
        storeAddress: null,
        storeLat: null,
        storeLng: null,
        deliveryRatePerKm: "1.25",
        minDeliveryFee: "5.00",
        maxDeliveryDistance: "15",
        pixKey: null,
        openingHours: null,
        isOpen: true,
        ...updates,
      }).returning();
      return setting;
    }
    const [setting] = await db.update(settings).set(updates).where(eq(settings.id, existing.id)).returning();
    return setting;
  }

  async createStockLog(insertLog: InsertStockLog): Promise<StockLog> {
    const id = randomUUID();
    const [log] = await db.insert(stockLogs).values({ id, ...insertLog }).returning();
    return log;
  }
}

export const storage = new DatabaseStorage();

export async function seedDatabase() {
  const existingUsers = await db.select().from(users);
  if (existingUsers.length > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  console.log("Seeding database with initial data...");

  const adminId = randomUUID();
  const kitchenId = randomUUID();
  const pdvId = randomUUID();

  await db.insert(users).values([
    { id: adminId, name: "Admin", whatsapp: "00000000000", role: "admin", password: "939393", isBlocked: false },
    { id: kitchenId, name: "Cozinha", whatsapp: "00000000001", role: "kitchen", password: "939393", isBlocked: false },
    { id: pdvId, name: "Balcao", whatsapp: "00000000002", role: "pdv", password: "939393", isBlocked: false },
  ]);

  const catDestiladosId = randomUUID();
  const catCervejasId = randomUUID();
  const catVinhosId = randomUUID();
  const catGelosId = randomUUID();
  const catEnergeticosId = randomUUID();
  const catMisturaId = randomUUID();
  const catPetiscosId = randomUUID();
  const catAguasId = randomUUID();

  await db.insert(categories).values([
    { id: catDestiladosId, name: "Destilados", iconUrl: "wine", sortOrder: 1, isActive: true },
    { id: catCervejasId, name: "Cervejas", iconUrl: "beer", sortOrder: 2, isActive: true },
    { id: catVinhosId, name: "Vinhos", iconUrl: "grape", sortOrder: 3, isActive: true },
    { id: catGelosId, name: "Gelos", iconUrl: "snowflake", sortOrder: 4, isActive: true },
    { id: catEnergeticosId, name: "Energeticos", iconUrl: "zap", sortOrder: 5, isActive: true },
    { id: catMisturaId, name: "Misturas", iconUrl: "glass-water", sortOrder: 6, isActive: true },
    { id: catPetiscosId, name: "Petiscos", iconUrl: "utensils", sortOrder: 7, isActive: true },
    { id: catAguasId, name: "Aguas e Sucos", iconUrl: "droplets", sortOrder: 8, isActive: true },
  ]);

  const productsList = [
    { categoryId: catDestiladosId, name: "Vodka Absolut 1L", description: "Vodka premium sueca", costPrice: "45.00", profitMargin: "50.00", salePrice: "89.90", stock: 20, productType: "destilado" },
    { categoryId: catDestiladosId, name: "Whisky Jack Daniels 1L", description: "Whisky americano Tennessee", costPrice: "85.00", profitMargin: "45.00", salePrice: "159.90", stock: 15, productType: "destilado" },
    { categoryId: catDestiladosId, name: "Gin Tanqueray 750ml", description: "Gin britanico premium", costPrice: "55.00", profitMargin: "50.00", salePrice: "109.90", stock: 18, productType: "destilado" },
    { categoryId: catDestiladosId, name: "Vodka Smirnoff 1L", description: "Vodka classica", costPrice: "28.00", profitMargin: "60.00", salePrice: "59.90", stock: 30, productType: "destilado" },
    { categoryId: catCervejasId, name: "Heineken Long Neck 330ml", description: "Cerveja premium lager", costPrice: "3.50", profitMargin: "70.00", salePrice: "7.90", stock: 120, productType: null },
    { categoryId: catCervejasId, name: "Budweiser Long Neck 330ml", description: "Cerveja lager refrescante", costPrice: "3.00", profitMargin: "70.00", salePrice: "6.90", stock: 100, productType: null },
    { categoryId: catCervejasId, name: "Brahma Lata 350ml", description: "Cerveja brasileira tradicional", costPrice: "2.00", profitMargin: "80.00", salePrice: "4.90", stock: 200, productType: null },
    { categoryId: catVinhosId, name: "Vinho Casillero del Diablo 750ml", description: "Vinho tinto chileno", costPrice: "35.00", profitMargin: "50.00", salePrice: "69.90", stock: 20, productType: null },
    { categoryId: catGelosId, name: "Gelo Premium 2kg", description: "Gelo cristalino de alta qualidade", costPrice: "3.00", profitMargin: "100.00", salePrice: "8.00", stock: 150, productType: "gelo" },
    { categoryId: catGelosId, name: "Gelo Triturado 2kg", description: "Gelo triturado para drinks", costPrice: "4.00", profitMargin: "90.00", salePrice: "10.00", stock: 100, productType: "gelo" },
    { categoryId: catEnergeticosId, name: "Red Bull 250ml", description: "Energetico classico", costPrice: "5.00", profitMargin: "60.00", salePrice: "9.90", stock: 80, productType: "energetico" },
    { categoryId: catEnergeticosId, name: "Monster Energy 473ml", description: "Energetico potente", costPrice: "6.00", profitMargin: "55.00", salePrice: "11.90", stock: 60, productType: "energetico" },
    { categoryId: catMisturaId, name: "Agua Tonica Schweppes 350ml", description: "Agua tonica para drinks", costPrice: "2.50", profitMargin: "80.00", salePrice: "5.90", stock: 100, productType: null },
    { categoryId: catMisturaId, name: "Refrigerante Cola 350ml", description: "Refrigerante cola", costPrice: "2.00", profitMargin: "80.00", salePrice: "4.90", stock: 120, productType: null },
    { categoryId: catPetiscosId, name: "Amendoim Japones 200g", description: "Amendoim crocante", costPrice: "4.00", profitMargin: "75.00", salePrice: "8.90", stock: 60, productType: null },
    { categoryId: catAguasId, name: "Agua Mineral 500ml", description: "Agua mineral sem gas", costPrice: "1.00", profitMargin: "100.00", salePrice: "3.00", stock: 200, productType: null },
  ];

  for (const prod of productsList) {
    await db.insert(products).values({
      id: randomUUID(),
      categoryId: prod.categoryId,
      name: prod.name,
      description: prod.description,
      imageUrl: null,
      costPrice: prod.costPrice,
      profitMargin: prod.profitMargin,
      salePrice: prod.salePrice,
      stock: prod.stock,
      isActive: true,
      productType: prod.productType,
    });
  }

  await db.insert(settings).values({
    id: randomUUID(),
    storeAddress: "Rua das Bebidas, 123 - Centro",
    storeLat: null,
    storeLng: null,
    deliveryRatePerKm: "1.25",
    minDeliveryFee: "5.00",
    maxDeliveryDistance: "15",
    pixKey: "vibedrinks@pix.com",
    openingHours: null,
    isOpen: true,
  });

  console.log("Database seeded successfully!");
}
