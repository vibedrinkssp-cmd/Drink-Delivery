import type { Express, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import multer from "multer";
import { uploadFile, deleteFile, getStorageUrl } from "./supabase";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

const uploadCSV = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for CSV
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
});

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
  dispatched: ['arrived', 'delivered', 'cancelled'],
  arrived: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: []
};

const COUNTER_ORDER_TRANSITIONS: Record<string, string[]> = {
  pending: ['accepted', 'cancelled'],
  accepted: ['preparing', 'delivered', 'cancelled'],
  preparing: ['ready', 'delivered', 'cancelled'],
  ready: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: []
};

function isValidStatusTransition(currentStatus: string, newStatus: string, orderType?: string): boolean {
  const transitions = orderType === 'counter' ? COUNTER_ORDER_TRANSITIONS : VALID_STATUS_TRANSITIONS;
  const allowed = transitions[currentStatus];
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

  app.delete("/api/users/:id", async (req, res) => {
    const user = await storage.getUser(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    await storage.deleteUser(req.params.id);
    res.status(204).send();
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
    try {
      const products = await storage.getProductsByCategory(req.params.id);
      if (products.length > 0) {
        return res.status(400).json({ 
          error: `Nao e possivel excluir categoria com ${products.length} produto(s) vinculado(s). Remova ou mova os produtos primeiro.` 
        });
      }
      const deleted = await storage.deleteCategory(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Category not found" });
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting category:", error);
      if (error.code === '23503') {
        return res.status(400).json({ error: "Categoria possui produtos vinculados" });
      }
      res.status(500).json({ error: "Erro ao excluir categoria" });
    }
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

  app.get("/api/products/trending", async (req, res) => {
    const limit = parseInt(req.query.limit as string) || 10;
    const trendingProducts = await storage.getTrendingProducts(limit);
    res.json(trendingProducts);
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

  // Import products from CSV
  app.post("/api/products/import-csv", uploadCSV.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }

      const csvContent = req.file.buffer.toString('utf-8');
      const lines = csvContent.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        return res.status(400).json({ error: "CSV vazio ou sem dados" });
      }

      // Parse header to understand column positions
      const header = lines[0].split(',').map(h => h.trim().toLowerCase());
      const produtoIdx = header.findIndex(h => h === 'produto' || h === 'nome' || h === 'name');
      const categoriaIdx = header.findIndex(h => h === 'categoria' || h === 'category');
      const precoCompraIdx = header.findIndex(h => h === 'precocompra' || h === 'costprice' || h === 'custo');
      const precoVendaIdx = header.findIndex(h => h === 'precovenda' || h === 'saleprice' || h === 'preco');
      const estoqueIdx = header.findIndex(h => h === 'quantidadeestoque' || h === 'estoque' || h === 'stock');

      if (produtoIdx === -1) {
        return res.status(400).json({ error: "Coluna 'Produto' nao encontrada no CSV" });
      }

      // Get existing categories
      const existingCategories = await storage.getCategories();
      const categoryMap = new Map(existingCategories.map(c => [c.name.toLowerCase(), c.id]));

      let imported = 0;
      let errors: string[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Parse CSV line handling commas in quotes
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        
        const productName = values[produtoIdx];
        if (!productName) {
          errors.push(`Linha ${i + 1}: Nome do produto vazio`);
          continue;
        }

        // Handle category
        let categoryId: string | null = null;
        if (categoriaIdx !== -1 && values[categoriaIdx]) {
          const categoryName = values[categoriaIdx];
          const existingCategoryId = categoryMap.get(categoryName.toLowerCase());
          
          if (existingCategoryId) {
            categoryId = existingCategoryId;
          } else {
            // Create new category
            const newCategory = await storage.createCategory({
              name: categoryName,
              iconUrl: null,
              isActive: true,
            });
            categoryMap.set(categoryName.toLowerCase(), newCategory.id);
            categoryId = newCategory.id;
          }
        }

        // Parse prices and stock
        const costPrice = precoCompraIdx !== -1 ? parseFloat(values[precoCompraIdx]) || 0 : 0;
        const salePrice = precoVendaIdx !== -1 ? parseFloat(values[precoVendaIdx]) || 0 : 0;
        const stock = estoqueIdx !== -1 ? parseInt(values[estoqueIdx]) || 0 : 0;
        
        // Calculate profit margin
        const profitMargin = costPrice > 0 ? ((salePrice - costPrice) / costPrice) * 100 : 0;

        try {
          const productData: any = {
            name: productName,
            description: null,
            costPrice: costPrice.toString(),
            salePrice: salePrice.toString(),
            profitMargin: profitMargin.toFixed(2),
            stock,
            imageUrl: null,
            productType: null,
            isActive: true,
          };
          if (categoryId) {
            productData.categoryId = categoryId;
          }
          await storage.createProduct(productData);
          imported++;
        } catch (err) {
          errors.push(`Linha ${i + 1}: Erro ao criar produto "${productName}"`);
        }
      }

      res.json({ 
        success: true, 
        imported, 
        errors: errors.length > 0 ? errors : undefined,
        message: `${imported} produtos importados com sucesso${errors.length > 0 ? `, ${errors.length} erros` : ''}`
      });
    } catch (error: any) {
      console.error("Error importing CSV:", error);
      res.status(500).json({ error: "Erro ao processar CSV: " + error.message });
    }
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

  // Secure endpoint for motoboy - returns only orders assigned to them
  app.get("/api/motoboy/:motoboyId/orders", async (req, res) => {
    const { motoboyId } = req.params;
    
    // Verify motoboy exists
    const motoboy = await storage.getMotoboy(motoboyId);
    if (!motoboy) {
      return res.status(404).json({ error: "Motoboy not found" });
    }
    
    // Get all orders and filter by motoboyId (include dispatched and arrived)
    const allOrders = await storage.getOrders();
    const motoboyOrders = allOrders.filter(order => 
      order.motoboyId === motoboyId && (order.status === 'dispatched' || order.status === 'arrived')
    );
    
    res.json(motoboyOrders);
  });

  app.post("/api/orders", async (req, res) => {
    try {
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
          
          // Deduct stock for each item
          const product = await storage.getProduct(item.productId);
          if (product) {
            const previousStock = product.stock;
            const newStock = Math.max(0, previousStock - item.quantity);
            await storage.updateProduct(item.productId, { stock: newStock });
            
            // Log the stock change
            await storage.createStockLog({
              productId: item.productId,
              previousStock,
              newStock,
              change: -item.quantity,
              reason: `Pedido #${order.id.slice(0, 8)}`,
            });
          }
        }
      }
      
      // Broadcast new order to all connected clients
      broadcastOrderUpdate('order_created', { orderId: order.id, status: order.status });
      
      res.status(201).json(order);
    } catch (error: any) {
      console.error("Error creating order:", error);
      if (error.code === '23503') {
        res.status(400).json({ error: "Dados invalidos. Faca login novamente e cadastre um endereco." });
      } else {
        res.status(500).json({ error: "Erro ao criar pedido" });
      }
    }
  });

  app.patch("/api/orders/:id/status", async (req, res) => {
    const { status } = req.body;
    const order = await storage.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });

    const transitions = order.orderType === 'counter' ? COUNTER_ORDER_TRANSITIONS : VALID_STATUS_TRANSITIONS;
    if (!isValidStatusTransition(order.status, status, order.orderType)) {
      return res.status(400).json({ 
        error: `Transicao invalida: ${order.status} -> ${status}`,
        currentStatus: order.status,
        allowedTransitions: transitions[order.status] || []
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
      case "arrived":
        updates.arrivedAt = now;
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

  app.delete("/api/orders/:id", async (req, res) => {
    const order = await storage.getOrder(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    
    await storage.deleteOrder(req.params.id);
    
    broadcastOrderUpdate('order_deleted', { orderId: req.params.id });
    
    res.status(204).send();
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

  // Get orders by motoboy for reports (admin)
  app.get("/api/motoboys/:id/orders", async (req, res) => {
    const { id } = req.params;
    const { startDate, endDate } = req.query;
    
    const motoboy = await storage.getMotoboy(id);
    if (!motoboy) {
      return res.status(404).json({ error: "Motoboy not found" });
    }
    
    let start: Date | undefined;
    let end: Date | undefined;
    
    if (startDate && typeof startDate === 'string') {
      start = new Date(startDate);
    }
    if (endDate && typeof endDate === 'string') {
      end = new Date(endDate);
    }
    
    const orders = await storage.getOrdersByMotoboy(id, start, end);
    res.json(orders);
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

  // Batch update sort orders for categories
  app.patch("/api/categories/reorder", async (req, res) => {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "items array required" });
    }
    
    try {
      for (const item of items) {
        if (item.id && typeof item.sortOrder === 'number') {
          await storage.updateCategory(item.id, { sortOrder: item.sortOrder });
        }
      }
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (error) {
      console.error("Error reordering categories:", error);
      res.status(500).json({ error: "Failed to reorder categories" });
    }
  });

  // Batch update sort orders for products
  app.patch("/api/products/reorder", async (req, res) => {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: "items array required" });
    }
    
    try {
      for (const item of items) {
        if (item.id && typeof item.sortOrder === 'number') {
          await storage.updateProduct(item.id, { sortOrder: item.sortOrder });
        }
      }
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      console.error("Error reordering products:", error);
      res.status(500).json({ error: "Failed to reorder products" });
    }
  });

  app.get("/api/settings", async (_req, res) => {
    const settings = await storage.getSettings();
    res.json(settings || {});
  });

  app.patch("/api/settings", async (req, res) => {
    const settings = await storage.updateSettings(req.body);
    res.json(settings);
  });

  // Supabase Storage Routes
  // Direct file upload endpoint using server-side Supabase service role
  // Requires admin or pdv role for security
  app.post("/api/storage/upload", upload.single('file'), async (req, res) => {
    const userId = req.headers['x-user-id'] as string | undefined;
    const { folder = 'products' } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: User ID required" });
    }
    
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized: User not found" });
    }
    
    if (user.role !== 'admin' && user.role !== 'pdv') {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: "No file provided" });
    }
    
    try {
      const result = await uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        folder
      );
      res.json(result);
    } catch (error) {
      console.error("Error uploading file:", error);
      return res.status(500).json({ error: "Failed to upload file" });
    }
  });

  // Delete file from storage (requires admin role)
  app.delete("/api/storage/delete", async (req, res) => {
    const userId = req.headers['x-user-id'] as string | undefined;
    const { path } = req.body;
    
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized: User ID required" });
    }
    
    const user = await storage.getUser(userId);
    if (!user || (user.role !== 'admin' && user.role !== 'pdv')) {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }
    
    if (!path) {
      return res.status(400).json({ error: "Path is required" });
    }
    
    try {
      await deleteFile(path);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting file:", error);
      return res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // Update product image after upload
  app.put("/api/products/:id/image", async (req, res) => {
    const { imageUrl } = req.body;
    if (!imageUrl) {
      return res.status(400).json({ error: "imageUrl is required" });
    }
    try {
      const product = await storage.updateProduct(req.params.id, { imageUrl });
      if (!product) return res.status(404).json({ error: "Product not found" });
      res.json(product);
    } catch (error) {
      console.error("Error updating product image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Stock Report - Complete inventory report with values, profits, and projections
  app.get("/api/stock/report", async (req, res) => {
    try {
      const allProducts = await storage.getAllProducts();
      const categories = await storage.getCategories();
      
      const categoryMap = new Map(categories.map(c => [c.id, c.name]));
      
      const productDetails = allProducts.map(product => {
        const costPrice = parseFloat(product.costPrice);
        const salePrice = parseFloat(product.salePrice);
        const profitMargin = parseFloat(product.profitMargin);
        const stock = product.stock;
        
        const totalCostValue = costPrice * stock;
        const totalSaleValue = salePrice * stock;
        const profitPerUnit = salePrice - costPrice;
        const totalPotentialProfit = profitPerUnit * stock;
        
        return {
          id: product.id,
          name: product.name,
          categoryId: product.categoryId,
          categoryName: categoryMap.get(product.categoryId) || 'Sem categoria',
          stock,
          costPrice,
          salePrice,
          profitMargin,
          profitPerUnit,
          totalCostValue,
          totalSaleValue,
          totalPotentialProfit,
          isActive: product.isActive,
        };
      });
      
      const summary = {
        totalProducts: allProducts.length,
        activeProducts: allProducts.filter(p => p.isActive).length,
        totalUnitsInStock: productDetails.reduce((sum, p) => sum + p.stock, 0),
        totalCostValue: productDetails.reduce((sum, p) => sum + p.totalCostValue, 0),
        totalSaleValue: productDetails.reduce((sum, p) => sum + p.totalSaleValue, 0),
        totalPotentialProfit: productDetails.reduce((sum, p) => sum + p.totalPotentialProfit, 0),
        lowStockCount: productDetails.filter(p => p.stock < 10 && p.isActive).length,
        outOfStockCount: productDetails.filter(p => p.stock === 0 && p.isActive).length,
      };
      
      res.json({ summary, products: productDetails });
    } catch (error) {
      console.error("Error generating stock report:", error);
      res.status(500).json({ error: "Failed to generate stock report" });
    }
  });

  // Low Stock Suggestions - Products with stock below threshold
  app.get("/api/stock/low-stock", async (req, res) => {
    try {
      const threshold = parseInt(req.query.threshold as string) || 10;
      const allProducts = await storage.getAllProducts();
      const categories = await storage.getCategories();
      
      const categoryMap = new Map(categories.map(c => [c.id, c.name]));
      
      const lowStockProducts = allProducts
        .filter(p => p.isActive && p.stock < threshold)
        .map(product => ({
          id: product.id,
          name: product.name,
          categoryId: product.categoryId,
          categoryName: categoryMap.get(product.categoryId) || 'Sem categoria',
          currentStock: product.stock,
          suggestedPurchase: Math.max(10 - product.stock, 5), // Suggest at least 5 units or enough to reach 10
          costPrice: parseFloat(product.costPrice),
          estimatedPurchaseCost: parseFloat(product.costPrice) * Math.max(10 - product.stock, 5),
        }))
        .sort((a, b) => a.currentStock - b.currentStock);
      
      const summary = {
        totalLowStockItems: lowStockProducts.length,
        totalEstimatedPurchaseCost: lowStockProducts.reduce((sum, p) => sum + p.estimatedPurchaseCost, 0),
        threshold,
      };
      
      res.json({ summary, products: lowStockProducts });
    } catch (error) {
      console.error("Error getting low stock suggestions:", error);
      res.status(500).json({ error: "Failed to get low stock suggestions" });
    }
  });

  // =============================================
  // Delivery Zones API
  // =============================================
  app.get("/api/delivery-zones", async (_req, res) => {
    const zones = await storage.getDeliveryZones();
    res.json(zones);
  });

  app.get("/api/delivery-zones/:id", async (req, res) => {
    const zone = await storage.getDeliveryZone(req.params.id);
    if (!zone) return res.status(404).json({ error: "Zone not found" });
    res.json(zone);
  });

  app.post("/api/delivery-zones", async (req, res) => {
    try {
      const zone = await storage.createDeliveryZone(req.body);
      res.status(201).json(zone);
    } catch (error: any) {
      console.error("Error creating delivery zone:", error);
      if (error.code === '23505') {
        return res.status(400).json({ error: "Codigo de zona ja existe" });
      }
      res.status(500).json({ error: "Erro ao criar zona" });
    }
  });

  app.patch("/api/delivery-zones/:id", async (req, res) => {
    try {
      const zone = await storage.updateDeliveryZone(req.params.id, req.body);
      if (!zone) return res.status(404).json({ error: "Zone not found" });
      res.json(zone);
    } catch (error: any) {
      console.error("Error updating delivery zone:", error);
      if (error.code === '23505') {
        return res.status(400).json({ error: "Codigo de zona ja existe" });
      }
      res.status(500).json({ error: "Erro ao atualizar zona" });
    }
  });

  app.delete("/api/delivery-zones/:id", async (req, res) => {
    try {
      // Check if zone has neighborhoods
      const neighborhoods = await storage.getNeighborhoodsByZone(req.params.id);
      if (neighborhoods.length > 0) {
        return res.status(400).json({ 
          error: `Nao e possivel excluir zona com ${neighborhoods.length} bairro(s) vinculado(s). Remova os bairros primeiro.` 
        });
      }
      const deleted = await storage.deleteDeliveryZone(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Zone not found" });
      res.status(204).send();
    } catch (error: any) {
      console.error("Error deleting delivery zone:", error);
      res.status(500).json({ error: "Erro ao excluir zona" });
    }
  });

  // =============================================
  // Neighborhoods API
  // =============================================
  app.get("/api/neighborhoods", async (_req, res) => {
    const neighborhoods = await storage.getNeighborhoods();
    res.json(neighborhoods);
  });

  app.get("/api/neighborhoods/zone/:zoneId", async (req, res) => {
    const neighborhoods = await storage.getNeighborhoodsByZone(req.params.zoneId);
    res.json(neighborhoods);
  });

  app.get("/api/neighborhoods/:id", async (req, res) => {
    const neighborhood = await storage.getNeighborhood(req.params.id);
    if (!neighborhood) return res.status(404).json({ error: "Neighborhood not found" });
    res.json(neighborhood);
  });

  app.post("/api/neighborhoods", async (req, res) => {
    try {
      // Verify zone exists
      const zone = await storage.getDeliveryZone(req.body.zoneId);
      if (!zone) {
        return res.status(400).json({ error: "Zona nao encontrada" });
      }
      const neighborhood = await storage.createNeighborhood(req.body);
      res.status(201).json(neighborhood);
    } catch (error: any) {
      console.error("Error creating neighborhood:", error);
      res.status(500).json({ error: "Erro ao criar bairro" });
    }
  });

  app.patch("/api/neighborhoods/:id", async (req, res) => {
    try {
      // If changing zone, verify new zone exists
      if (req.body.zoneId) {
        const zone = await storage.getDeliveryZone(req.body.zoneId);
        if (!zone) {
          return res.status(400).json({ error: "Zona nao encontrada" });
        }
      }
      const neighborhood = await storage.updateNeighborhood(req.params.id, req.body);
      if (!neighborhood) return res.status(404).json({ error: "Neighborhood not found" });
      res.json(neighborhood);
    } catch (error: any) {
      console.error("Error updating neighborhood:", error);
      res.status(500).json({ error: "Erro ao atualizar bairro" });
    }
  });

  app.delete("/api/neighborhoods/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteNeighborhood(req.params.id);
      if (!deleted) return res.status(404).json({ error: "Neighborhood not found" });
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting neighborhood:", error);
      res.status(500).json({ error: "Erro ao excluir bairro" });
    }
  });

  // =============================================
  // Order Delivery Fee Adjustment
  // =============================================
  app.patch("/api/orders/:id/delivery-fee", async (req, res) => {
    try {
      const { deliveryFee } = req.body;
      if (deliveryFee === undefined || isNaN(parseFloat(deliveryFee))) {
        return res.status(400).json({ error: "Taxa de entrega invalida" });
      }

      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ error: "Pedido nao encontrado" });
      }

      // Store original fee if not already stored
      const originalFee = order.originalDeliveryFee || order.deliveryFee;
      const newFee = parseFloat(deliveryFee).toFixed(2);
      const newTotal = (parseFloat(order.subtotal) - parseFloat(order.discount || "0") + parseFloat(newFee)).toFixed(2);

      const updatedOrder = await storage.updateOrder(req.params.id, {
        deliveryFee: newFee,
        originalDeliveryFee: originalFee,
        deliveryFeeAdjusted: true,
        deliveryFeeAdjustedAt: new Date(),
        total: newTotal,
      });

      // Broadcast update via SSE
      broadcastOrderUpdate('order_fee_updated', {
        orderId: order.id,
        userId: order.userId,
        originalFee: parseFloat(originalFee),
        newFee: parseFloat(newFee),
        newTotal: parseFloat(newTotal),
      });

      res.json(updatedOrder);
    } catch (error) {
      console.error("Error updating delivery fee:", error);
      res.status(500).json({ error: "Erro ao atualizar taxa de entrega" });
    }
  });

  return httpServer;
}
