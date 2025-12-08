import type { Express, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

// SSE clients for real-time order updates
const orderClients: Set<Response> = new Set();

// Broadcast order updates to all connected SSE clients
function broadcastOrderUpdate(event: string, data?: any) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data || {})}\n\n`;
  orderClients.forEach(client => {
    try {
      client.write(message);
    } catch (error) {
      orderClients.delete(client);
    }
  });
}

const VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
  pending: ['accepted', 'cancelled'],
  accepted: ['preparing', 'cancelled'],
  preparing: ['ready', 'cancelled'],
  ready: ['dispatched', 'cancelled'],
  dispatched: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: []
};

function isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
  const allowed = VALID_STATUS_TRANSITIONS[currentStatus];
  return allowed ? allowed.includes(newStatus) : false;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // SSE endpoint for real-time order updates
  app.get("/api/orders/sse", (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    // Send initial connection message
    res.write(`event: connected\ndata: ${JSON.stringify({ message: 'Connected to order updates' })}\n\n`);

    // Add client to the set
    orderClients.add(res);

    // Send heartbeat every 30 seconds to keep connection alive
    const heartbeat = setInterval(() => {
      try {
        res.write(`event: heartbeat\ndata: ${JSON.stringify({ timestamp: Date.now() })}\n\n`);
      } catch (error) {
        clearInterval(heartbeat);
        orderClients.delete(res);
      }
    }, 30000);

    // Remove client on disconnect
    req.on('close', () => {
      clearInterval(heartbeat);
      orderClients.delete(res);
    });
  });

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
    const userData = { ...req.body };
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, SALT_ROUNDS);
    }
    const user = await storage.createUser(userData);
    res.status(201).json(user);
  });

  app.patch("/api/users/:id", async (req, res) => {
    const userData = { ...req.body };
    if (userData.password) {
      userData.password = await bcrypt.hash(userData.password, SALT_ROUNDS);
    }
    const user = await storage.updateUser(req.params.id, userData);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  });

  app.post("/api/auth/login", async (req, res) => {
    const { username, password, role } = req.body;
    const users = await storage.getUsers();
    
    let candidates;
    if (role) {
      candidates = users.filter(u => 
        u.name.toLowerCase() === username.toLowerCase() && 
        u.role === role
      );
    } else {
      candidates = users.filter(u => 
        u.name.toLowerCase() === username.toLowerCase() && 
        (u.role === 'admin' || u.role === 'kitchen' || u.role === 'motoboy' || u.role === 'pdv')
      );
    }
    
    let user = null;
    for (const candidate of candidates) {
      if (!candidate.password) continue;
      const isValid = await bcrypt.compare(password, candidate.password);
      if (isValid) {
        user = candidate;
        break;
      }
    }
    
    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid credentials" });
    }
    const { password: _, ...safeUser } = user;
    res.json({ success: true, user: safeUser, role: user.role });
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
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  app.post("/api/auth/check-phone", async (req, res) => {
    const { whatsapp } = req.body;
    const motoboy = await storage.getMotoboyByWhatsapp(whatsapp);
    if (motoboy) {
      res.json({ exists: true, userName: motoboy.name, isMotoboy: true });
      return;
    }
    const user = await storage.getUserByWhatsapp(whatsapp);
    if (user) {
      res.json({ exists: true, userName: user.name, isMotoboy: false });
    } else {
      res.json({ exists: false, isMotoboy: false });
    }
  });

  app.post("/api/auth/customer-login", async (req, res) => {
    const { whatsapp, password } = req.body;
    
    if (!password || !/^\d{6}$/.test(password)) {
      return res.status(400).json({ success: false, error: "Senha deve ter exatamente 6 digitos" });
    }
    
    const motoboy = await storage.getMotoboyByWhatsapp(whatsapp);
    if (motoboy) {
      return res.status(403).json({ 
        success: false, 
        error: "Motoboys devem usar o login de funcionarios",
        isMotoboy: true
      });
    }
    
    const user = await storage.getUserByWhatsapp(whatsapp);
    if (!user) {
      return res.status(401).json({ success: false, error: "Usuario nao encontrado" });
    }
    
    if (user.isBlocked) {
      return res.status(403).json({ success: false, error: "Usuario bloqueado" });
    }
    
    if (!user.password) {
      return res.status(401).json({ success: false, error: "Senha nao cadastrada" });
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ success: false, error: "Senha incorreta" });
    }
    
    const addresses = await storage.getAddresses(user.id);
    const defaultAddress = addresses.find(a => a.isDefault) || addresses[0];
    
    const { password: _, ...safeUser } = user;
    res.json({ success: true, user: safeUser, address: defaultAddress || null });
  });

  app.post("/api/auth/motoboy-login", async (req, res) => {
    const { whatsapp, password } = req.body;
    
    if (!password || !/^\d{6}$/.test(password)) {
      return res.status(400).json({ success: false, error: "Senha deve ter exatamente 6 digitos" });
    }
    
    const motoboy = await storage.getMotoboyByWhatsapp(whatsapp);
    if (!motoboy) {
      return res.status(401).json({ success: false, error: "Motoboy nao encontrado" });
    }
    
    if (!motoboy.isActive) {
      return res.status(403).json({ success: false, error: "Motoboy desativado" });
    }
    
    const user = await storage.getUserByWhatsapp(whatsapp);
    if (!user) {
      return res.status(401).json({ success: false, error: "Usuario do motoboy nao encontrado" });
    }
    
    if (!user.password) {
      return res.status(401).json({ success: false, error: "Senha nao cadastrada pelo administrador" });
    }
    
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ success: false, error: "Senha incorreta" });
    }
    
    const { password: _, ...safeUser } = user;
    res.json({ 
      success: true, 
      user: { ...safeUser, role: 'motoboy' }, 
      role: 'motoboy',
      motoboy: motoboy
    });
  });

  app.post("/api/auth/register", async (req, res) => {
    const { user: userData, address: addressData } = req.body;
    
    if (!userData.password || !/^\d{6}$/.test(userData.password)) {
      return res.status(400).json({ error: "Senha deve ter exatamente 6 digitos" });
    }
    
    const motoboy = await storage.getMotoboyByWhatsapp(userData.whatsapp);
    if (motoboy) {
      return res.status(400).json({ error: "Este numero pertence a um motoboy. Use o login de funcionarios." });
    }
    
    const existingUser = await storage.getUserByWhatsapp(userData.whatsapp);
    if (existingUser) {
      return res.status(400).json({ error: "Usuario ja cadastrado com este WhatsApp" });
    }
    
    const hashedPassword = await bcrypt.hash(userData.password, SALT_ROUNDS);
    
    const user = await storage.createUser({
      name: userData.name,
      whatsapp: userData.whatsapp,
      role: "customer",
      password: hashedPassword,
      isBlocked: false
    });
    
    const address = await storage.createAddress({
      userId: user.id,
      street: addressData.street,
      number: addressData.number,
      complement: addressData.complement || null,
      neighborhood: addressData.neighborhood,
      city: addressData.city,
      state: addressData.state,
      zipCode: addressData.zipCode,
      notes: addressData.notes || null,
      isDefault: true
    });
    
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser, address });
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
    const existingAddress = await storage.getAddress(req.params.id);
    if (!existingAddress) return res.status(404).json({ error: "Address not found" });
    
    // If setting this address as default, clear the default from other addresses
    if (req.body.isDefault === true && existingAddress.userId) {
      const userAddresses = await storage.getAddresses(existingAddress.userId);
      for (const addr of userAddresses) {
        if (addr.id !== req.params.id && addr.isDefault) {
          await storage.updateAddress(addr.id, { isDefault: false });
        }
      }
    }
    
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

  app.get("/api/order-items", async (req, res) => {
    const orderIdsParam = req.query.orderIds;
    if (orderIdsParam) {
      const orderIds = typeof orderIdsParam === 'string' 
        ? orderIdsParam.split(',').map(id => id.trim()).filter(id => id)
        : Array.isArray(orderIdsParam) 
          ? (orderIdsParam as string[]).map(id => id.trim()).filter(id => id)
          : [];
      if (orderIds.length === 0) {
        return res.json([]);
      }
      const items = await storage.getOrderItemsByOrderIds(orderIds);
      return res.json(items);
    }
    return res.json([]);
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
    
    // Broadcast new order to all connected clients
    broadcastOrderUpdate('order_created', { orderId: order.id, status: order.status });
    
    res.status(201).json(order);
  });

  app.patch("/api/orders/:id/status", async (req, res) => {
    const { status } = req.body;
    const order = await storage.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (!isValidStatusTransition(order.status, status)) {
      return res.status(400).json({ 
        error: `Transicao invalida: ${order.status} -> ${status}`,
        currentStatus: order.status,
        allowedTransitions: VALID_STATUS_TRANSITIONS[order.status] || []
      });
    }

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
    
    // Broadcast status change to all connected clients
    broadcastOrderUpdate('order_status_changed', { orderId: req.params.id, status, previousStatus: order.status });
    
    res.json(updated);
  });

  app.patch("/api/orders/:id/assign", async (req, res) => {
    const { motoboyId } = req.body;
    const order = await storage.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    if (order.status !== 'ready') {
      return res.status(400).json({ 
        error: `Pedido deve estar com status 'pronto' para atribuir motoboy. Status atual: ${order.status}` 
      });
    }

    const updated = await storage.updateOrder(req.params.id, { 
      motoboyId, 
      status: "dispatched",
      dispatchedAt: new Date()
    });
    
    // Broadcast motoboy assignment to all connected clients
    broadcastOrderUpdate('order_assigned', { orderId: req.params.id, motoboyId, status: 'dispatched' });
    
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

  // Get motoboy with linked user data (for admin view)
  app.get("/api/motoboys/:id/details", async (req, res) => {
    const motoboy = await storage.getMotoboy(req.params.id);
    if (!motoboy) return res.status(404).json({ error: "Motoboy not found" });
    
    const user = await storage.getUserByWhatsapp(motoboy.whatsapp);
    const hasPassword = user?.password ? true : false;
    
    res.json({
      ...motoboy,
      hasPassword,
      userId: user?.id || null,
    });
  });

  app.post("/api/motoboys", async (req, res) => {
    const { name, whatsapp, photoUrl, isActive, password } = req.body;
    
    // Validate password if provided (must be 6 digits)
    if (password && !/^\d{6}$/.test(password)) {
      return res.status(400).json({ error: "Senha deve ter exatamente 6 digitos numericos" });
    }
    
    // Check if whatsapp already exists in motoboys table
    const existingMotoboy = await storage.getMotoboyByWhatsapp(whatsapp);
    if (existingMotoboy) {
      return res.status(400).json({ error: "Ja existe um motoboy com este WhatsApp" });
    }
    
    // Create the motoboy record
    const motoboy = await storage.createMotoboy({ name, whatsapp, photoUrl, isActive });
    
    // Create or update user record for motoboy authentication
    let user = await storage.getUserByWhatsapp(whatsapp);
    if (!user) {
      // Create new user with motoboy role
      const hashedPassword = password ? await bcrypt.hash(password, SALT_ROUNDS) : null;
      user = await storage.createUser({
        name,
        whatsapp,
        role: "motoboy",
        password: hashedPassword,
      });
    } else if (password) {
      // Update existing user with new password and role
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      await storage.updateUser(user.id, { 
        password: hashedPassword,
        role: "motoboy",
        name,
      });
    }
    
    res.status(201).json(motoboy);
  });

  app.patch("/api/motoboys/:id", async (req, res) => {
    const { name, whatsapp, photoUrl, isActive, password } = req.body;
    
    // Validate password if provided (must be 6 digits)
    if (password && !/^\d{6}$/.test(password)) {
      return res.status(400).json({ error: "Senha deve ter exatamente 6 digitos numericos" });
    }
    
    const existingMotoboy = await storage.getMotoboy(req.params.id);
    if (!existingMotoboy) {
      return res.status(404).json({ error: "Motoboy not found" });
    }
    
    // If changing whatsapp, check if new whatsapp is already used by another motoboy
    if (whatsapp && whatsapp !== existingMotoboy.whatsapp) {
      const motoboyWithWhatsapp = await storage.getMotoboyByWhatsapp(whatsapp);
      if (motoboyWithWhatsapp && motoboyWithWhatsapp.id !== req.params.id) {
        return res.status(400).json({ error: "Ja existe outro motoboy com este WhatsApp" });
      }
    }
    
    // Update motoboy record
    const motoboyData: Partial<{ name: string; whatsapp: string; photoUrl: string | null; isActive: boolean }> = {};
    if (name !== undefined) motoboyData.name = name;
    if (whatsapp !== undefined) motoboyData.whatsapp = whatsapp;
    if (photoUrl !== undefined) motoboyData.photoUrl = photoUrl;
    if (isActive !== undefined) motoboyData.isActive = isActive;
    
    const motoboy = await storage.updateMotoboy(req.params.id, motoboyData);
    
    // Update linked user record
    const oldUser = await storage.getUserByWhatsapp(existingMotoboy.whatsapp);
    if (oldUser) {
      const userUpdates: Partial<{ name: string; whatsapp: string; password: string }> = {};
      if (name !== undefined) userUpdates.name = name;
      if (whatsapp !== undefined) userUpdates.whatsapp = whatsapp;
      if (password) {
        userUpdates.password = await bcrypt.hash(password, SALT_ROUNDS);
      }
      
      if (Object.keys(userUpdates).length > 0) {
        await storage.updateUser(oldUser.id, userUpdates);
      }
    } else if (password || whatsapp) {
      // Create user if doesn't exist and we have data to create
      const hashedPassword = password ? await bcrypt.hash(password, SALT_ROUNDS) : null;
      await storage.createUser({
        name: name || existingMotoboy.name,
        whatsapp: whatsapp || existingMotoboy.whatsapp,
        role: "motoboy",
        password: hashedPassword,
      });
    }
    
    res.json(motoboy);
  });

  app.delete("/api/motoboys/:id", async (req, res) => {
    const motoboy = await storage.getMotoboy(req.params.id);
    if (!motoboy) {
      return res.status(404).json({ error: "Motoboy not found" });
    }
    
    // Delete the motoboy record
    const deleted = await storage.deleteMotoboy(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Motoboy not found" });
    
    // Note: We don't delete the user record as it may have order history
    // Just update the user's role to 'customer' if desired
    const user = await storage.getUserByWhatsapp(motoboy.whatsapp);
    if (user && user.role === 'motoboy') {
      await storage.updateUser(user.id, { role: 'customer' });
    }
    
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
