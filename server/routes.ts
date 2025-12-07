import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get("/api/users", async (_req, res) => {
    const users = await storage.getUsers();
    res.json(users);
  });

  app.get("/api/users/:id", async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  });

  app.post("/api/users", async (req, res) => {
    const user = await storage.createUser(req.body);
    res.status(201).json(user);
  });

  app.patch("/api/users/:id", async (req, res) => {
    const user = await storage.updateUser(req.params.id, req.body);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password, role } = req.body;
    const users = await storage.getUsers();
    
    let user;
    if (role) {
      user = users.find(u => 
        u.name.toLowerCase() === username.toLowerCase() && 
        u.password === password &&
        u.role === role
      );
    } else {
      user = users.find(u => 
        u.name.toLowerCase() === username.toLowerCase() && 
        u.password === password &&
        (u.role === 'admin' || u.role === 'kitchen' || u.role === 'motoboy' || u.role === 'pdv')
      );
    }
    
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }
    res.json({ success: true, user, role: user.role });
  });

  app.post("/api/auth/whatsapp", async (req, res) => {
    const { whatsapp, name } = req.body;
    let user = await storage.getUserByWhatsapp(whatsapp);
    if (!user) {
      user = await storage.createUser({ 
        name, 
        whatsapp, 
        role: "customer",
        password: null,
        isBlocked: false
      });
    }
    res.json(user);
  });

  app.get("/api/addresses/:userId", async (req, res) => {
    const addresses = await storage.getAddresses(req.params.userId);
    res.json(addresses);
  });

  app.post("/api/addresses", async (req, res) => {
    const address = await storage.createAddress(req.body);
    res.status(201).json(address);
  });

  app.patch("/api/addresses/:id", async (req, res) => {
    const address = await storage.updateAddress(req.params.id, req.body);
    if (!address) return res.status(404).json({ error: "Address not found" });
    res.json(address);
  });

  app.delete("/api/addresses/:id", async (req, res) => {
    const deleted = await storage.deleteAddress(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Address not found" });
    res.status(204).send();
  });

  app.get("/api/categories", async (_req, res) => {
    const categories = await storage.getCategories();
    res.json(categories);
  });

  app.get("/api/categories/:id", async (req, res) => {
    const category = await storage.getCategory(req.params.id);
    if (!category) return res.status(404).json({ error: "Category not found" });
    res.json(category);
  });

  app.post("/api/categories", async (req, res) => {
    const category = await storage.createCategory(req.body);
    res.status(201).json(category);
  });

  app.patch("/api/categories/:id", async (req, res) => {
    const category = await storage.updateCategory(req.params.id, req.body);
    if (!category) return res.status(404).json({ error: "Category not found" });
    res.json(category);
  });

  app.delete("/api/categories/:id", async (req, res) => {
    const deleted = await storage.deleteCategory(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Category not found" });
    res.status(204).send();
  });

  app.get("/api/products", async (_req, res) => {
    const products = await storage.getProducts();
    res.json(products);
  });

  app.get("/api/products/:id", async (req, res) => {
    const product = await storage.getProduct(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  });

  app.get("/api/products/category/:categoryId", async (req, res) => {
    const products = await storage.getProductsByCategory(req.params.categoryId);
    res.json(products);
  });

  app.post("/api/products", async (req, res) => {
    const product = await storage.createProduct(req.body);
    res.status(201).json(product);
  });

  app.patch("/api/products/:id", async (req, res) => {
    const product = await storage.updateProduct(req.params.id, req.body);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  });

  app.delete("/api/products/:id", async (req, res) => {
    const deleted = await storage.deleteProduct(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Product not found" });
    res.status(204).send();
  });

  app.get("/api/orders", async (_req, res) => {
    const orders = await storage.getOrders();
    res.json(orders);
  });

  app.get("/api/orders/:id", async (req, res) => {
    const order = await storage.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  });

  app.get("/api/orders/user/:userId", async (req, res) => {
    const orders = await storage.getOrdersByUser(req.params.userId);
    res.json(orders);
  });

  app.get("/api/orders/status/:status", async (req, res) => {
    const orders = await storage.getOrdersByStatus(req.params.status);
    res.json(orders);
  });

  app.post("/api/orders", async (req, res) => {
    const order = await storage.createOrder(req.body);
    
    if (req.body.items && Array.isArray(req.body.items)) {
      for (const item of req.body.items) {
        await storage.createOrderItem({
          orderId: order.id,
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          totalPrice: item.totalPrice,
        });
      }
    }
    
    res.status(201).json(order);
  });

  app.patch("/api/orders/:id/status", async (req, res) => {
    const { status } = req.body;
    const order = await storage.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const updates: Partial<typeof order> = { status };
    const now = new Date();

    switch (status) {
      case "accepted":
        updates.acceptedAt = now;
        break;
      case "preparing":
        updates.preparingAt = now;
        break;
      case "ready":
        updates.readyAt = now;
        break;
      case "dispatched":
        updates.dispatchedAt = now;
        break;
      case "delivered":
        updates.deliveredAt = now;
        break;
    }

    const updated = await storage.updateOrder(req.params.id, updates);
    res.json(updated);
  });

  app.patch("/api/orders/:id/assign", async (req, res) => {
    const { motoboyId } = req.body;
    const order = await storage.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const updated = await storage.updateOrder(req.params.id, { 
      motoboyId, 
      status: "dispatched",
      dispatchedAt: new Date()
    });
    res.json(updated);
  });

  app.get("/api/orders/:id/items", async (req, res) => {
    const items = await storage.getOrderItems(req.params.id);
    res.json(items);
  });

  app.get("/api/banners", async (_req, res) => {
    const banners = await storage.getBanners();
    res.json(banners);
  });

  app.get("/api/banners/:id", async (req, res) => {
    const banner = await storage.getBanner(req.params.id);
    if (!banner) return res.status(404).json({ error: "Banner not found" });
    res.json(banner);
  });

  app.post("/api/banners", async (req, res) => {
    const banner = await storage.createBanner(req.body);
    res.status(201).json(banner);
  });

  app.patch("/api/banners/:id", async (req, res) => {
    const banner = await storage.updateBanner(req.params.id, req.body);
    if (!banner) return res.status(404).json({ error: "Banner not found" });
    res.json(banner);
  });

  app.delete("/api/banners/:id", async (req, res) => {
    const deleted = await storage.deleteBanner(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Banner not found" });
    res.status(204).send();
  });

  app.get("/api/motoboys", async (_req, res) => {
    const motoboys = await storage.getMotoboys();
    res.json(motoboys);
  });

  app.get("/api/motoboys/:id", async (req, res) => {
    const motoboy = await storage.getMotoboy(req.params.id);
    if (!motoboy) return res.status(404).json({ error: "Motoboy not found" });
    res.json(motoboy);
  });

  app.post("/api/motoboys", async (req, res) => {
    const motoboy = await storage.createMotoboy(req.body);
    res.status(201).json(motoboy);
  });

  app.patch("/api/motoboys/:id", async (req, res) => {
    const motoboy = await storage.updateMotoboy(req.params.id, req.body);
    if (!motoboy) return res.status(404).json({ error: "Motoboy not found" });
    res.json(motoboy);
  });

  app.delete("/api/motoboys/:id", async (req, res) => {
    const deleted = await storage.deleteMotoboy(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Motoboy not found" });
    res.status(204).send();
  });

  app.get("/api/settings", async (_req, res) => {
    const settings = await storage.getSettings();
    res.json(settings || {});
  });

  app.patch("/api/settings", async (req, res) => {
    const settings = await storage.updateSettings(req.body);
    res.json(settings);
  });

  return httpServer;
}
