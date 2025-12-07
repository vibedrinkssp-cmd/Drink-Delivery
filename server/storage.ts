import { randomUUID } from "crypto";
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

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private addresses: Map<string, Address>;
  private categories: Map<string, Category>;
  private products: Map<string, Product>;
  private orders: Map<string, Order>;
  private orderItems: Map<string, OrderItem>;
  private banners: Map<string, Banner>;
  private motoboys: Map<string, Motoboy>;
  private stockLogs: Map<string, StockLog>;
  private settings: Settings | undefined;

  constructor() {
    this.users = new Map();
    this.addresses = new Map();
    this.categories = new Map();
    this.products = new Map();
    this.orders = new Map();
    this.orderItems = new Map();
    this.banners = new Map();
    this.motoboys = new Map();
    this.stockLogs = new Map();

    this.seedData();
  }

  private seedData() {
    const adminId = randomUUID();
    this.users.set(adminId, {
      id: adminId,
      name: "Admin",
      whatsapp: "00000000000",
      role: "admin",
      password: "939393",
      isBlocked: false,
      createdAt: new Date(),
    });

    const kitchenId = randomUUID();
    this.users.set(kitchenId, {
      id: kitchenId,
      name: "Cozinha",
      whatsapp: "00000000001",
      role: "kitchen",
      password: "939393",
      isBlocked: false,
      createdAt: new Date(),
    });

    const pdvId = randomUUID();
    this.users.set(pdvId, {
      id: pdvId,
      name: "Balcao",
      whatsapp: "00000000002",
      role: "pdv",
      password: "939393",
      isBlocked: false,
      createdAt: new Date(),
    });

    const cat1Id = randomUUID();
    const cat2Id = randomUUID();
    const cat3Id = randomUUID();
    
    this.categories.set(cat1Id, {
      id: cat1Id,
      name: "Destilados",
      iconUrl: null,
      sortOrder: 1,
      isActive: true,
      createdAt: new Date(),
    });
    this.categories.set(cat2Id, {
      id: cat2Id,
      name: "Gelos",
      iconUrl: null,
      sortOrder: 2,
      isActive: true,
      createdAt: new Date(),
    });
    this.categories.set(cat3Id, {
      id: cat3Id,
      name: "Energeticos",
      iconUrl: null,
      sortOrder: 3,
      isActive: true,
      createdAt: new Date(),
    });

    const prod1Id = randomUUID();
    const prod2Id = randomUUID();
    const prod3Id = randomUUID();

    this.products.set(prod1Id, {
      id: prod1Id,
      categoryId: cat1Id,
      name: "Vodka Absolut 1L",
      description: "Vodka premium sueca",
      imageUrl: null,
      costPrice: "45.00",
      profitMargin: "50.00",
      salePrice: "89.90",
      stock: 20,
      isActive: true,
      productType: "destilado",
      createdAt: new Date(),
    });

    this.products.set(prod2Id, {
      id: prod2Id,
      categoryId: cat2Id,
      name: "Gelo Premium 2kg",
      description: "Gelo cristalino de alta qualidade",
      imageUrl: null,
      costPrice: "3.00",
      profitMargin: "100.00",
      salePrice: "6.00",
      stock: 100,
      isActive: true,
      productType: "gelo",
      createdAt: new Date(),
    });

    this.products.set(prod3Id, {
      id: prod3Id,
      categoryId: cat3Id,
      name: "Red Bull 250ml",
      description: "Energetico classico",
      imageUrl: null,
      costPrice: "5.00",
      profitMargin: "60.00",
      salePrice: "9.90",
      stock: 50,
      isActive: true,
      productType: "energetico",
      createdAt: new Date(),
    });

    this.settings = {
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
    };
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByWhatsapp(whatsapp: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.whatsapp === whatsapp);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      id, 
      name: insertUser.name,
      whatsapp: insertUser.whatsapp,
      role: insertUser.role ?? "customer",
      password: insertUser.password ?? null,
      isBlocked: insertUser.isBlocked ?? false,
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  async getAddresses(userId: string): Promise<Address[]> {
    return Array.from(this.addresses.values()).filter(a => a.userId === userId);
  }

  async getAddress(id: string): Promise<Address | undefined> {
    return this.addresses.get(id);
  }

  async createAddress(insertAddress: InsertAddress): Promise<Address> {
    const id = randomUUID();
    const address: Address = { 
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
    };
    this.addresses.set(id, address);
    return address;
  }

  async updateAddress(id: string, updates: Partial<InsertAddress>): Promise<Address | undefined> {
    const address = this.addresses.get(id);
    if (!address) return undefined;
    const updated = { ...address, ...updates };
    this.addresses.set(id, updated);
    return updated;
  }

  async deleteAddress(id: string): Promise<boolean> {
    return this.addresses.delete(id);
  }

  async getCategories(): Promise<Category[]> {
    return Array.from(this.categories.values())
      .filter(c => c.isActive)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  async getCategory(id: string): Promise<Category | undefined> {
    return this.categories.get(id);
  }

  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const id = randomUUID();
    const category: Category = { 
      id, 
      name: insertCategory.name,
      iconUrl: insertCategory.iconUrl ?? null,
      sortOrder: insertCategory.sortOrder ?? 0,
      isActive: insertCategory.isActive ?? true,
      createdAt: new Date() 
    };
    this.categories.set(id, category);
    return category;
  }

  async updateCategory(id: string, updates: Partial<InsertCategory>): Promise<Category | undefined> {
    const category = this.categories.get(id);
    if (!category) return undefined;
    const updated = { ...category, ...updates };
    this.categories.set(id, updated);
    return updated;
  }

  async deleteCategory(id: string): Promise<boolean> {
    return this.categories.delete(id);
  }

  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values()).filter(p => p.isActive);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    return this.products.get(id);
  }

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    return Array.from(this.products.values())
      .filter(p => p.categoryId === categoryId && p.isActive);
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const product: Product = { 
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
      createdAt: new Date() 
    };
    this.products.set(id, product);
    return product;
  }

  async updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (!product) return undefined;
    const updated = { ...product, ...updates };
    this.products.set(id, updated);
    return updated;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const product = this.products.get(id);
    if (product) {
      this.products.set(id, { ...product, isActive: false });
      return true;
    }
    return false;
  }

  async getOrders(): Promise<Order[]> {
    return Array.from(this.orders.values())
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getOrder(id: string): Promise<Order | undefined> {
    return this.orders.get(id);
  }

  async getOrdersByUser(userId: string): Promise<Order[]> {
    return Array.from(this.orders.values())
      .filter(o => o.userId === userId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async getOrdersByStatus(status: string): Promise<Order[]> {
    return Array.from(this.orders.values())
      .filter(o => o.status === status)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const order: Order = { 
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
      createdAt: new Date(),
      acceptedAt: null,
      preparingAt: null,
      readyAt: null,
      dispatchedAt: null,
      deliveredAt: null,
    };
    this.orders.set(id, order);
    return order;
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<Order | undefined> {
    const order = this.orders.get(id);
    if (!order) return undefined;
    const updated = { ...order, ...updates };
    this.orders.set(id, updated);
    return updated;
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return Array.from(this.orderItems.values()).filter(i => i.orderId === orderId);
  }

  async createOrderItem(insertItem: InsertOrderItem): Promise<OrderItem> {
    const id = randomUUID();
    const item: OrderItem = { id, ...insertItem };
    this.orderItems.set(id, item);
    return item;
  }

  async getBanners(): Promise<Banner[]> {
    return Array.from(this.banners.values())
      .filter(b => b.isActive)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }

  async getBanner(id: string): Promise<Banner | undefined> {
    return this.banners.get(id);
  }

  async createBanner(insertBanner: InsertBanner): Promise<Banner> {
    const id = randomUUID();
    const banner: Banner = { 
      id, 
      title: insertBanner.title,
      description: insertBanner.description ?? null,
      imageUrl: insertBanner.imageUrl,
      linkUrl: insertBanner.linkUrl ?? null,
      sortOrder: insertBanner.sortOrder ?? 0,
      isActive: insertBanner.isActive ?? true,
      createdAt: new Date() 
    };
    this.banners.set(id, banner);
    return banner;
  }

  async updateBanner(id: string, updates: Partial<InsertBanner>): Promise<Banner | undefined> {
    const banner = this.banners.get(id);
    if (!banner) return undefined;
    const updated = { ...banner, ...updates };
    this.banners.set(id, updated);
    return updated;
  }

  async deleteBanner(id: string): Promise<boolean> {
    return this.banners.delete(id);
  }

  async getMotoboys(): Promise<Motoboy[]> {
    return Array.from(this.motoboys.values());
  }

  async getMotoboy(id: string): Promise<Motoboy | undefined> {
    return this.motoboys.get(id);
  }

  async createMotoboy(insertMotoboy: InsertMotoboy): Promise<Motoboy> {
    const id = randomUUID();
    const motoboy: Motoboy = { 
      id, 
      name: insertMotoboy.name,
      whatsapp: insertMotoboy.whatsapp,
      photoUrl: insertMotoboy.photoUrl ?? null,
      isActive: insertMotoboy.isActive ?? true,
      createdAt: new Date() 
    };
    this.motoboys.set(id, motoboy);
    return motoboy;
  }

  async updateMotoboy(id: string, updates: Partial<InsertMotoboy>): Promise<Motoboy | undefined> {
    const motoboy = this.motoboys.get(id);
    if (!motoboy) return undefined;
    const updated = { ...motoboy, ...updates };
    this.motoboys.set(id, updated);
    return updated;
  }

  async deleteMotoboy(id: string): Promise<boolean> {
    return this.motoboys.delete(id);
  }

  async getSettings(): Promise<Settings | undefined> {
    return this.settings;
  }

  async updateSettings(updates: Partial<InsertSettings>): Promise<Settings> {
    if (!this.settings) {
      this.settings = {
        id: randomUUID(),
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
      };
    } else {
      this.settings = { ...this.settings, ...updates };
    }
    return this.settings;
  }

  async createStockLog(insertLog: InsertStockLog): Promise<StockLog> {
    const id = randomUUID();
    const log: StockLog = { id, ...insertLog, createdAt: new Date() };
    this.stockLogs.set(id, log);
    return log;
  }
}

export const storage = new MemStorage();
