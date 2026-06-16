import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { initializeApp as initializeClientApp } from "firebase/app";
import { getAuth as getClientAuth, signInWithCustomToken } from "firebase/auth";
import { getFirestore as getClientFirestore, collection, getDocs, query, limit, addDoc, serverTimestamp, doc, setDoc, getDoc, updateDoc, deleteDoc, where, orderBy, onSnapshot, increment } from "firebase/firestore";
import net from "net";
import axios from "axios";
import crypto from "crypto";
import { MercadoPagoConfig, Payment } from 'mercadopago';

import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read config manually to avoid import caching issues
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "firebase-applet-config.json"), "utf8"));

console.log(`[Firebase] Loading config for project: ${firebaseConfig.projectId}`);

// Initialize Firebase Admin (for Auth, etc.)
let adminApp: admin.app.App;
let adminDb: any;
let clientApp: any;
let clientDb: any;

// Global flag to indicate if we are ready
let db: any;
let isUsingShim = false;
let isBackendAuthReady = true;

const SYSTEM_KEY = process.env.FIRESTORE_SYSTEM_KEY || 'backend_service_key_2024_tupa';

async function initFirebase() {
  try {
    console.log(`[Firebase] Initializing Admin SDK for project: ${firebaseConfig.projectId}`);
    
    // Set environment variable to force project ID
    process.env.GOOGLE_CLOUD_PROJECT = firebaseConfig.projectId;

    if (admin.apps.length > 0) {
      console.log(`[Firebase] Admin App already exists. Cleaning up...`);
      await Promise.all(admin.apps.map(app => app.delete()).filter(Boolean));
    }
    
    // Initialize with explicit project ID and application default credentials
    const adminConfig: any = { 
      projectId: firebaseConfig.projectId
    };

    // Only add credential if we think we might have them, 
    // but usually applicationDefault() is safe to call and returns a placeholder if none.
    try {
      adminConfig.credential = admin.credential.applicationDefault();
    } catch (credError) {
      console.warn("[Firebase] Could not load application default credentials, continuing without them...");
    }
    
    adminApp = admin.initializeApp(adminConfig);
    
    const dbId = firebaseConfig.firestoreDatabaseId || "(default)";
    console.log(`[Firebase] Setting up Firestore for database: ${dbId}`);
    
    adminDb = getFirestore(adminApp, dbId);
    db = createShimDb(adminDb);
    
    // Client SDK setup
    clientApp = initializeClientApp(firebaseConfig);
    clientDb = getClientFirestore(clientApp, dbId);

    // Authenticate backend system for Client SDK fallback as a last resort
    try {
      const customToken = await admin.auth().createCustomToken("backend-system", { admin: true, role: 'admin' });
      await signInWithCustomToken(getClientAuth(clientApp), customToken);
      console.log(`[Firebase] Backend system authenticated successfully for Client SDK fallback.`);
    } catch (authErr: any) {
      console.warn(`[Firebase] Backend system authentication failed (falling back to unauthenticated):`, authErr.message);
    }

    console.log(`[Firebase] Admin SDK initialized successfully.`);
    
    // Non-blocking diagnostic
    runDiagnostic().catch(e => console.error("[Diagnostic] Error during init:", e));
  } catch (e: any) {
    console.error(`[Firebase] Initialization CRITICAL failure:`, e.message);
    // Fallback attempt
    try {
      if (admin.apps.length === 0) {
        adminApp = admin.initializeApp({ projectId: firebaseConfig.projectId });
      } else {
        adminApp = admin.app();
      }
      adminDb = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
      db = createShimDb(adminDb);
    } catch (err2: any) {
      console.error("[Firebase] Total fallback failure:", err2.message);
    }
  }
}

/**
 * Proxy for admin.auth() to ensure we use the correct app context
 */
const adminAuth = () => {
  if (!adminApp) throw new Error("Firebase Admin not initialized");
  return adminApp.auth();
};

/**
 * Firestore Shim to mimic Admin SDK API using Admin SDK itself
 * This ensures the server-side logic always bypasses rules while maintaining a consistent API.
 */
const createShimDb = (baseDb: any) => {
  const isPermissionError = (err: any) => {
    if (!err) return false;
    const msg = (err.message || '').toLowerCase();
    return msg.includes('permission_denied') || 
           msg.includes('permission') || 
           msg.includes('insufficient') || 
           err.code === 7 || 
           err.status === 7;
  };

  const translateData = (data: any) => {
    if (!data || typeof data !== 'object') return data;
    const newData = Array.isArray(data) ? [...data] : { ...data };
    for (const key in newData) {
      const val = (newData as any)[key];
      if (val && typeof val === 'object') {
        const constructorName = val.constructor?.name;
        // Check for Admin SDK FieldValue (ServerTimestamp, Increment, etc.)
        if (constructorName === 'FieldValue' || val._methodName || val.methodName) {
           const method = val._methodName || val.methodName;
           if (method === 'serverTimestamp') (newData as any)[key] = serverTimestamp();
           else if (method === 'increment') (newData as any)[key] = increment(val._operand ?? val.operand);
        } else {
           (newData as any)[key] = translateData(val);
        }
      }
    }
    return newData;
  };

  return {
    collection: (name: string) => {
      const colRef = baseDb.collection(name);
      const createWrapper = (ref: any, queryParts: any[] = []): any => ({
        doc: (id?: string) => {
          const docRef = id ? ref.doc(id) : ref.doc();
          return {
            get: async () => {
              try {
                const s = await docRef.get();
                return { exists: s.exists, data: () => s.data(), id: s.id };
              } catch (e: any) {
                if (isPermissionError(e)) {
                  const { getDoc, doc } = await import("firebase/firestore");
                  const s = await getDoc(doc(clientDb, name, id || docRef.id));
                  return { exists: s.exists(), data: () => s.data(), id: s.id };
                }
                throw e;
              }
            },
            set: async (data: any, options?: any) => {
              try { return await docRef.set(data, options); }
              catch (e: any) {
                if (isPermissionError(e)) {
                  const { setDoc, doc } = await import("firebase/firestore");
                  return await setDoc(doc(clientDb, name, id || docRef.id), translateData(data), options);
                }
                throw e;
              }
            },
            update: async (data: any) => {
              try { return await docRef.update(data); }
              catch (e: any) {
                if (isPermissionError(e)) {
                  const { updateDoc, doc } = await import("firebase/firestore");
                  return await updateDoc(doc(clientDb, name, id || docRef.id), translateData(data));
                }
                throw e;
              }
            },
            delete: async () => {
              try { return await docRef.delete(); }
              catch (e: any) {
                if (isPermissionError(e)) {
                  const { deleteDoc, doc } = await import("firebase/firestore");
                  return await deleteDoc(doc(clientDb, name, id || docRef.id));
                }
                throw e;
              }
            },
            onSnapshot: (onNext: any, onError: any) => {
              return docRef.onSnapshot(onNext, async (err: any) => {
                if (isPermissionError(err)) {
                  try {
                    const { onSnapshot: clientOnSnapshot, doc: clientDocRef } = await import("firebase/firestore");
                    return clientOnSnapshot(clientDocRef(clientDb, name, id || docRef.id), (s: any) => onNext({ exists: s.exists(), data: () => s.data(), id: s.id }), onError);
                  } catch (fallbackErr) {
                    onError(err);
                  }
                } else {
                  onError(err);
                }
              });
            },
            id: docRef.id
          };
        },
        add: async (data: any) => {
          try { const r = await ref.add(data); return { id: r.id }; }
          catch (e: any) {
            if (isPermissionError(e)) {
              const { addDoc, collection } = await import("firebase/firestore");
              const r = await addDoc(collection(clientDb, name), translateData(data));
              return { id: r.id };
            }
            throw e;
          }
        },
        where: (field: string, op: string, value: any) => createWrapper(ref.where(field, op, value), [...queryParts, { type: 'where', field, op, value }]),
        orderBy: (field: string, dir?: string) => createWrapper(ref.orderBy(field, dir || 'asc'), [...queryParts, { type: 'orderBy', field, dir: dir || 'asc' }]),
        limit: (n: number) => createWrapper(ref.limit(n), [...queryParts, { type: 'limit', n }]),
        get: async () => {
          try {
            const s = await ref.get();
            return {
              size: s.size, empty: s.empty,
              docs: s.docs.map((d: any) => ({ exists: d.exists, data: () => d.data(), id: d.id, ref: d.ref })),
              forEach: (cb: any) => s.docs.forEach((d: any) => cb({ exists: d.exists, data: () => d.data(), id: d.id, ref: d.ref })),
              docChanges: () => s.docChanges().map((c: any) => ({ type: c.type, doc: { id: c.doc.id, data: () => c.doc.data() } }))
            };
          } catch (e: any) {
            if (isPermissionError(e)) {
              try {
                const { getDocs, collection, query, where, orderBy, limit } = await import("firebase/firestore");
                let cRef: any = collection(clientDb, name);
                for (const p of queryParts) {
                  if (p.type === 'where') cRef = query(cRef, where(p.field, p.op, p.value));
                  else if (p.type === 'orderBy') cRef = query(cRef, orderBy(p.field, p.dir));
                  else if (p.type === 'limit') cRef = query(cRef, limit(p.n));
                }
                const s = await getDocs(cRef);
                return {
                  size: s.size, empty: s.empty,
                  docs: s.docs.map((d: any) => ({ exists: d.exists(), data: () => d.data(), id: d.id, ref: d.ref })),
                  forEach: (cb: any) => s.docs.forEach((d: any) => cb({ exists: d.exists(), data: () => d.data(), id: d.id, ref: d.ref })),
                  docChanges: () => s.docChanges().map((c: any) => ({ type: c.type, doc: { id: c.doc.id, data: () => c.doc.data() } }))
                };
              } catch (fallbackErr) {
                throw e;
              }
            }
            throw e;
          }
        },
        onSnapshot: (onNext: any, onError: any) => {
          return ref.onSnapshot(async (snapshot: any) => {
             onNext({
               size: snapshot.size, empty: snapshot.empty,
               docs: snapshot.docs.map((d: any) => ({ exists: d.exists, data: () => d.data(), id: d.id, ref: d.ref })),
               docChanges: () => snapshot.docChanges().map((c: any) => ({ type: c.type, doc: { id: c.doc.id, data: () => c.doc.data() } }))
             });
          }, async (err: any) => {
            if (isPermissionError(err)) {
              try {
                const { onSnapshot: cOnSnapshot, collection, query, where, orderBy, limit } = await import("firebase/firestore");
                let cRef: any = collection(clientDb, name);
                for (const p of queryParts) {
                  if (p.type === 'where') cRef = query(cRef, where(p.field, p.op, p.value));
                  else if (p.type === 'orderBy') cRef = query(cRef, orderBy(p.field, p.dir));
                  else if (p.type === 'limit') cRef = query(cRef, limit(p.n));
                }
                return cOnSnapshot(cRef, (s: any) => onNext({
                  size: s.size, empty: s.empty,
                  docs: s.docs.map((d: any) => ({ exists: d.exists(), data: () => d.data(), id: d.id, ref: d.ref })),
                  docChanges: () => s.docChanges().map((c: any) => ({ type: c.type, doc: { id: c.doc.id, data: () => c.doc.data() } }))
                }), onError);
              } catch (fallbackErr) {
                onError(err);
              }
            } else {
              onError(err);
            }
          });
        }
      });
      return createWrapper(colRef);
    },
    batch: () => baseDb.batch()
  };
};

/**
 * Force a re-authentication of the Client SDK shim (Deprecated - using Admin SDK directly)
 */
async function reAuthenticateShim() {
  console.log(`[Firebase] reAuthenticateShim called but we are using Admin SDK directly.`);
  return true;
}

/**
 * Helper to get a Firestore instance. (Simplified to use Admin SDK)
 */
async function getFirestoreDb(targetDatabaseId?: string): Promise<any> {
  return db || createShimDb(adminDb);
}

const databaseId = firebaseConfig.firestoreDatabaseId || undefined;

// Diagnostic check at startup
async function runDiagnostic() {
  try {
    if (!db) db = await getFirestoreDb(databaseId);
    console.log(`[Diagnostic] Global Database ID: ${databaseId || '(default)'}`);
    
    console.log(`[Diagnostic] Testing write to collection "admin_logs"...`);
    // Note: serverTimestamp() comes from the Admin SDK via our shim or direct import
    const logRef = await db.collection("admin_logs").add({
      action: "server_startup_verified",
      timestamp: new Date(),
      message: "Server initialized using Admin SDK (Rules Bypassed)",
      projectId: firebaseConfig.projectId,
      _systemKey: SYSTEM_KEY
    });
    console.log("[Diagnostic] Diagnostic successful. Log ID:", logRef.id);
    
    // Seed database after successful auth
    runInitialSeeds().catch(e => console.error("[Init] runInitialSeeds failed:", e));
  } catch (err: any) {
    console.error("[Diagnostic] Firestore diagnostic FAILED:", err.message);
    db = createShimDb(adminDb);
  }
}

// Ensure diagnostic runs without blocking startup (Moved to startServer)

console.log("Firestore initialized with Database ID:", databaseId || "(default)");

// Helper to send ESC/POS commands to a network printer
async function sendToPrinter(ip: string, port: number, data: Buffer): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    client.setTimeout(5000);

    client.connect(port, ip, () => {
      client.write(data, () => {
        client.end();
        resolve();
      });
    });

    client.on("error", (err) => {
      client.destroy();
      reject(err);
    });

    client.on("timeout", () => {
      client.destroy();
      reject(new Error("Printer connection timeout"));
    });
  });
}

// Helper to calculate distance
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

/**
 * Validates if coordinates are within real ranges.
 */
function isValidCoordinate(lat: any, lng: any): boolean {
  const latitude = Number(lat);
  const longitude = Number(lng);
  return (
    !isNaN(latitude) &&
    !isNaN(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180 &&
    latitude !== 0 &&
    longitude !== 0
  );
}

/**
 * Resolves address to coordinates using Google Geocoding API.
 */
async function geocodeAddress(address: string): Promise<{ lat: number, lng: number } | null> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error("[Geocoding] GOOGLE_MAPS_API_KEY non-existent. Check environment setup.");
    return null;
  }

  try {
    const response = await axios.get('https://maps.googleapis.com/maps/api/geocode/json', {
      params: { address, key: apiKey, language: 'pt-BR', region: 'br' },
      timeout: 5000
    });

    if (response.data.status === 'OK' && response.data.results?.length > 0) {
      const loc = response.data.results[0].geometry.location;
      return { lat: loc.lat, lng: loc.lng };
    }
    console.warn(`[Geocoding] API Status: ${response.data.status} for: ${address}`);
    return null;
  } catch (err: any) {
    console.error("[Geocoding] Request error:", err.message);
    return null;
  }
}

// Background Monitors Management
let orderSplitterInterval: NodeJS.Timeout | null = null;
let walletMonitorInterval: NodeJS.Timeout | null = null;
let rideMonitorInterval: NodeJS.Timeout | null = null;
let activityMonitorInterval: NodeJS.Timeout | null = null;

async function startBackgroundServices() {
  console.log("[Server] Starting background services with quota-conscious logic...");
  
  // 1. Order Splitter
  try {
    startOrderSplitter().catch(e => console.error("[OrderSplitter] Runtime error:", e));
  } catch (e) {
    console.error("[OrderSplitter] Start error:", e);
  }

  // 2. Wallet & Restaurant Sync
  try {
    startWalletMonitor().catch(e => console.error("[WalletMonitor] Runtime error:", e));
  } catch (e) {
    console.error("[WalletMonitor] Start error:", e);
  }

  // 3. Ride Industry Status
  try {
    startRideMonitor().catch(e => console.error("[RideMonitor] Runtime error:", e));
  } catch (e) {
    console.error("[RideMonitor] Start error:", e);
  }

  // 4. Activity Monitor
  try {
    startActivityMonitor().catch(e => console.error("[ActivityMonitor] Runtime error:", e));
  } catch (e) {
    console.error("[ActivityMonitor] Start error:", e);
  }

  // 5. Data Integrity Monitor
  try {
    startDataIntegrityMonitor().catch(e => console.error("[IntegrityMonitor] Runtime error:", e));
  } catch (e) {
    console.error("[IntegrityMonitor] Start error:", e);
  }
}

// Order Splitter Logic (Bypassing Rules using Admin SDK)
async function startOrderSplitter() {
  console.log(`[OrderSplitter] Initializing Splitter Service (Admin SDK Only)...`);
  
  let unsubscribe: (() => void) | null = null;
  let retryCount = 0;
  const maxRetries = 10;
  let isPolling = false;
  
  const setupListener = async () => {
    try {
      if (unsubscribe) {
        try { unsubscribe(); } catch (e) {}
        unsubscribe = null;
      }
      
      console.log("[OrderSplitter] Setting up direct listener on 'orders' using Shim DB...");
      
      const q = db.collection("orders").where("status", "==", "pending");

      unsubscribe = q.onSnapshot(async (snapshot: any) => {
        try {
          const changes = snapshot.docChanges();
          for (const change of changes) {
            if (change.type === "added" || change.type === "modified") {
              const order = { id: change.doc.id, ...change.doc.data() } as any;
              await processOrder(order);
            }
          }
        } catch (snErr: any) {
          console.error("[OrderSplitter] Snapshot processing error:", snErr.message);
        }
      }, async (error: any) => {
        console.error("[OrderSplitter] Admin SDK listener error (CRITICAL):", error.message || error);
        
        // If it's a permission error even in Admin SDK, something is very wrong with the SDK initialization
        if (error.message?.includes('PERMISSION_DENIED') || error.message?.includes('status 7')) {
           console.error("[OrderSplitter] Permission Denied in Admin SDK. Retrying with project ID check...");
        }

        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(setupListener, 1000 * retryCount * 5);
        }
      });
    } catch (error) {
      console.error("Error setting up Order Splitter listener:", error);
      setTimeout(setupListener, 10000);
    }
  };

// Process a single order
  async function processOrder(order: any) {
    const firestore = db;
    if (!firestore) {
       console.error("[OrderSplitter] Database not initialized yet");
       return;
    }
    // Skip if already processed or already split
    if (order.isSplit === true) return;
    if (order.status === "split_parent" || order.status === "processed_split") return;
    if (order.status !== "pending") return;

    try {
      const items = order.items || [];
      const restaurantIds = [...new Set(items.map((i: any) => i.restaurantId))];

      // If items from multiple restaurants are found
      if (restaurantIds.length > 1) {
        console.log(`[OrderSplitter] Splitting mixed order #${order.id} for customer ${order.customerUid}`);
        
        // Group items by restaurant
        const itemsByRestaurant: Record<string, any[]> = {};
        items.forEach((item: any) => {
          if (!itemsByRestaurant[item.restaurantId]) {
            itemsByRestaurant[item.restaurantId] = [];
          }
          itemsByRestaurant[item.restaurantId].push(item);
        });

        // Create sub-orders
        for (const restaurantIdRaw of restaurantIds) {
          const restaurantId = restaurantIdRaw as string;
          const restaurantSnap = await firestore.collection("restaurants").doc(restaurantId).get();
          if (!restaurantSnap.exists) continue;
          const restaurant = restaurantSnap.data() as any;

          const subItems = itemsByRestaurant[restaurantId];
          const itemsTotal = subItems.reduce((acc: number, item: any) => acc + (item.price * item.quantity), 0);
          
          // Calculate delivery fee for this specific restaurant
          let deliveryFee = 0;
          if (order.deliveryOption !== 'pickup') {
            if (order.deliveryOption === 'fast') {
              deliveryFee = 7.00;
            } else if (!restaurant.isDeliveryFree) {
              if (restaurant.deliveryFeeType === 'fixed') {
                deliveryFee = restaurant.deliveryFeePerKm || 0;
              } else if (restaurant.deliveryFeeType === 'km' && order.customerLocation && restaurant.latitude && restaurant.longitude) {
                const dist = calculateDistance(order.customerLocation.latitude, order.customerLocation.longitude, restaurant.latitude, restaurant.longitude);
                if (restaurant.freeDeliveryKm && dist <= restaurant.freeDeliveryKm) {
                  deliveryFee = 0;
                } else {
                  deliveryFee = dist * (restaurant.deliveryFeePerKm || 0);
                }
              }
            }
          }

          const subTotal = itemsTotal + deliveryFee;

          // Create the sub-order
          const subOrderData = {
            ...order,
            id: undefined, // Let Firestore generate ID
            restaurantId: restaurantId,
            restaurantName: restaurant.name,
            restaurantLogo: restaurant.imageUrl,
            items: subItems,
            total: subTotal,
            deliveryFee: deliveryFee,
            parentOrderId: order.id,
            isSplit: true,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          };

          await firestore.collection("orders").add(subOrderData);
          console.log(`[OrderSplitter] Sub-order created for restaurant ${restaurant.name} (Total: R$${subTotal.toFixed(2)})`);
        }

        await firestore.collection("orders").doc(order.id).update({
          status: "split_parent",
          originalCustomerUid: order.customerUid,
          customerUid: order.customerUid + "_split", // Hide from user's active orders
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        console.log(`[OrderSplitter] Parent order #${order.id} marked as split_parent and hidden.`);
      }
    } catch (error) {
      console.error(`[OrderSplitter] Error processing order #${order.id}:`, error);
    }
  }

  // Fallback polling mechanism (every 5 minutes to stay within Spark plan quota)
  const startPolling = () => {
    setInterval(async () => {
      if (isPolling) return;
      isPolling = true;
      try {
        // Only run polling if the listener is inactive or on manual trigger
        // This dramatically reduces read operations
        const firestorePoll = db;
        const snapshot = await firestorePoll.collection("orders")
          .where("status", "==", "pending")
          .limit(10)
          .get();
        
        if (!snapshot.empty) {
          console.log(`[OrderSplitter] Polling found ${snapshot.size} pending orders.`);
          for (const doc of snapshot.docs) {
            await processOrder({ id: doc.id, ...doc.data() });
          }
        }
      } catch (e: any) {
        if (e.message?.includes('RESOURCE_EXHAUSTED')) {
           console.warn("[OrderSplitter] Spark plan quota limit reached. Waiting for reset...");
        } else {
           console.error("[OrderSplitter] Polling error:", e);
        }
      } finally {
        isPolling = false;
      }
    }, 300000); // 5 minutes
  };

  setupListener();
  startPolling();
}

// ESC/POS Command Generator
function generateEscPosOrder(order: any, paperSize: string = "80mm"): Buffer {
  const esc = "\x1B";
  const gs = "\x1D";
  const lineFeed = "\n";
  
  const commands: any[] = [];
  
  // Initialize
  commands.push(Buffer.from(esc + "@"));
  
  // Center alignment
  commands.push(Buffer.from(esc + "a" + "\x01"));
  
  // Double height and width for title
  commands.push(Buffer.from(gs + "!" + "\x11"));
  commands.push(Buffer.from(`PEDIDO #${order.id.slice(-6).toUpperCase()}${lineFeed}`));
  
  // Reset text size
  commands.push(Buffer.from(gs + "!" + "\x00"));
  commands.push(Buffer.from(`--------------------------------${lineFeed}`));
  
  // Left alignment
  commands.push(Buffer.from(esc + "a" + "\x00"));
  
  commands.push(Buffer.from(`Cliente: ${order.customerName || "Nao informado"}${lineFeed}`));
  if (order.customerPhone) {
    commands.push(Buffer.from(`Tel: ${order.customerPhone}${lineFeed}`));
  }
  commands.push(Buffer.from(`Data: ${new Date().toLocaleString("pt-BR")}${lineFeed}`));
  commands.push(Buffer.from(`--------------------------------${lineFeed}`));
  
  commands.push(Buffer.from(`ITENS DO PEDIDO:${lineFeed}`));
  order.items.forEach((item: any) => {
    const qty = item.quantity.toString().padStart(2, "0");
    commands.push(Buffer.from(`${qty}x ${item.name}${lineFeed}`));
    if (item.notes) {
      commands.push(Buffer.from(`   Obs: ${item.notes}${lineFeed}`));
    }
    if (item.addOns && item.addOns.length > 0) {
      item.addOns.forEach((addon: any) => {
        commands.push(Buffer.from(`   + ${addon.name}${lineFeed}`));
      });
    }
  });
  
  commands.push(Buffer.from(`--------------------------------${lineFeed}`));
  
  if (order.notes) {
    commands.push(Buffer.from(`OBSERVACOES:${lineFeed}`));
    commands.push(Buffer.from(`${order.notes}${lineFeed}`));
    commands.push(Buffer.from(`--------------------------------${lineFeed}`));
  }
  
  commands.push(Buffer.from(`ENDERECO DE ENTREGA:${lineFeed}`));
  commands.push(Buffer.from(`${order.deliveryAddress}${lineFeed}`));
  commands.push(Buffer.from(`--------------------------------${lineFeed}`));
  
  commands.push(Buffer.from(`PAGAMENTO: ${order.paymentMethod?.toUpperCase() || "PIX"}${lineFeed}`));
  commands.push(Buffer.from(`TOTAL: R$ ${order.total.toFixed(2)}${lineFeed}`));
  
  commands.push(Buffer.from(`--------------------------------${lineFeed}`));
  commands.push(Buffer.from(lineFeed + lineFeed + lineFeed));
  
  // Cut paper
  commands.push(Buffer.from(gs + "V" + "\x41" + "\x03"));
  
  return Buffer.concat(commands);
}

async function triggerPrinting(orderId: string, restaurantId: string, isAuto: boolean = false) {
  console.log(`Triggering printing for Order: ${orderId}, Restaurant: ${restaurantId}, isAuto: ${isAuto}`);
  try {
    console.log(`Attempting to fetch order ${orderId} from Firestore...`);
    const orderSnap = await db.collection("orders").doc(orderId).get();
    if (!orderSnap.exists) {
      console.warn(`Order ${orderId} not found for printing`);
      return;
    }
    const order = { id: orderSnap.id, ...orderSnap.data() };

    console.log(`Attempting to fetch active printers for restaurant ${restaurantId}...`);
    let printersQuery = db.collection("printers")
      .where("restaurantId", "==", restaurantId)
      .where("active", "==", true);
    
    if (isAuto) {
      printersQuery = printersQuery.where("autoPrint", "==", true);
    }

    const printersSnap = await printersQuery.get();

    console.log(`Found ${printersSnap.size} active printers`);

    for (const doc of printersSnap.docs) {
      const printer = doc.data();
      if (printer.connection === "network" && printer.ip) {
        try {
          const buffer = generateEscPosOrder(order, printer.paperSize);
          await sendToPrinter(printer.ip, printer.port || 9100, buffer);
          console.log(`Order ${orderId} printed on ${printer.name}`);
        } catch (e) {
          console.error(`Failed to print on ${printer.name}:`, e);
        }
      }
    }
  } catch (error) {
    console.error("Trigger printing error:", error);
  }
}

async function startServer() {
  // Initialize Firebase in background to avoid blocking server responsiveness
  initFirebase().catch(e => console.error("[Firebase] Fatal Init Error:", e));
  
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to Test Firestore Connectivity
  app.get("/api/health/firestore", async (req, res) => {
    const logs: string[] = [];
    try {
      logs.push(`Testing Firestore connectivity...`);
      
      const tryConnect = async (pid: string | undefined, dbid: string | undefined, label: string) => {
        try {
          logs.push(`Attempting ${label}: PID=${pid || 'default'}, DB=${dbid || '(default)'}`);
          const appName = `test-${label}-${Date.now()}`;
          const testApp = admin.initializeApp({ projectId: pid }, appName);
          const testDb = getFirestore(testApp, dbid);
          
          // Try a write instead of a read
          const testRef = testDb.collection("health_checks").doc("test");
          await testRef.set({ lastCheck: serverTimestamp() });
          logs.push(`${label} write successful!`);
          
          await testDb.collection("settings").limit(1).get();
          logs.push(`${label} read successful!`);
          
          await testApp.delete();
          return true;
        } catch (e: any) {
          logs.push(`${label} failed: ${e.code} - ${e.message}`);
          return false;
        }
      };

      const tryRest = async () => {
        try {
          const apiKey = firebaseConfig.apiKey;
          const pid = firebaseConfig.projectId;
          const dbid = firebaseConfig.firestoreDatabaseId;
          const url = `https://firestore.googleapis.com/v1/projects/${pid}/databases/${dbid}/documents/settings?key=${apiKey}`;
          
          logs.push(`Attempting REST API: ${url.replace(apiKey, 'REDACTED')}`);
          const res = await axios.get(url);
          logs.push(`REST API successful!`);
          return true;
        } catch (e: any) {
          logs.push(`REST API failed: ${e.response?.status} - ${JSON.stringify(e.response?.data)}`);
          return false;
        }
      };

      await tryRest();
      
      res.json({ 
        status: "ok", 
        logs,
        projectId: adminApp.options.projectId,
        databaseId: databaseId || "(default)"
      });
    } catch (error: any) {
      logs.push(`Final error: ${error.code} - ${error.message}`);
      res.status(500).json({ 
        status: "error", 
        logs,
        error: error.message
      });
    }
  });

  // Webhook for Mercado Pago
  app.post("/api/webhook/mercadopago", async (req, res) => {
    const { action, data, type } = req.body;

    console.log(`Webhook received: ${type} - ${action}`, data);

    if (type === "payment" && (action === "payment.created" || action === "payment.updated")) {
      const paymentId = data.id;
      
      try {
        // Use the robust db getter
        const currentDb = await getFirestoreDb(databaseId);
        
        console.log("Fetching settings from Firestore for webhook...");
        const settingsSnap = await currentDb.collection("settings").limit(1).get();
        if (settingsSnap.empty) {
          console.error("No settings found for Mercado Pago Access Token");
          return res.status(400).send("Settings not found");
        }
        console.log("Settings fetched successfully");
        
        const settings = settingsSnap.docs[0].data();
        const accessToken = settings.mercadoPagoAccessToken?.trim();

        if (!accessToken) {
          console.error("Mercado Pago Access Token not found in settings");
          return res.status(400).send("Access Token not found");
        }

        // Fetch payment details
        const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        const paymentData = await response.json();

        // 3. Store in Payments collection for Dashboard (Always update status)
        const orderId = paymentData.external_reference;
        let restaurantData = null;
        if (orderId) {
          try {
            const orderSnap = await currentDb.collection("orders").doc(orderId).get();
            if (orderSnap.exists) {
              const order = orderSnap.data();
              const restaurantSnap = await currentDb.collection("restaurants").doc(order?.restaurantId).get();
              restaurantData = restaurantSnap.exists ? restaurantSnap.data() : null;
            }
          } catch (fetchError) {
            console.error("Error fetching order/restaurant data for payment record:", fetchError);
          }
        }

        try {
          console.log(`Recording webhook payment ${paymentId} in Firestore...`);
          await currentDb.collection("payments").doc(String(paymentId)).set({
            paymentId: String(paymentId),
            orderId: orderId || "N/A",
            amount: paymentData.transaction_amount,
            status: paymentData.status, // approved, pending, rejected, etc.
            statusDetail: paymentData.status_detail,
            method: paymentData.payment_method_id || "pix",
            payerEmail: paymentData.payer?.email,
            city: restaurantData?.city || "Não Informada",
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
            date: new Date().toISOString().split('T')[0]
          }, { merge: true });
          console.log(`Successfully recorded webhook payment ${paymentId}.`);
        } catch (paymentStoreError: any) {
          console.error(`Failed to record webhook payment ${paymentId} in Firestore:`, paymentStoreError.message);
        }

        if (paymentData.status === "approved") {
          const externalRef = paymentData.external_reference;
          console.log(`Payment approved for Ref: ${externalRef}`);

          if (externalRef) {
            // Handle Wallet Recharge or Subscription
            if (externalRef.startsWith("RECHARGE_") || externalRef.startsWith("SUB_")) {
              console.log(`Processing System Payment (Recharge/Sub): ${externalRef}`);
              
              const pixPaymentsSnap = await currentDb.collection("pix_payments")
                .where("paymentId", "==", String(paymentId))
                .where("status", "==", "pending")
                .limit(1)
                .get();

              if (!pixPaymentsSnap.empty) {
                const pixDoc = pixPaymentsSnap.docs[0];
                const pixData = pixDoc.data();
                const ownerUid = pixData.ownerUid;
                const amount = pixData.amount;
                const isSubscription = pixData.isSubscription;

                console.log(`Found pending pix_payment. Processing ${isSubscription ? 'Subscription' : 'Recharge'} for user ${ownerUid}`);

                // 1. Update Pix Payment Status
                await pixDoc.ref.update({ 
                  status: "approved", 
                  updatedAt: serverTimestamp() 
                });

                if (isSubscription) {
                  // Update User Subscription
                  const userRef = currentDb.collection("users").doc(ownerUid);
                  const duration = settings.subscriptionDurationDays || 30;
                  const nextDueDate = new Date();
                  nextDueDate.setDate(nextDueDate.getDate() + duration);

                  await userRef.update({
                    subscriptionStatus: 'active',
                    subscriptionDueDate: nextDueDate.toISOString()
                  });
                  console.log(`Subscription activated for user ${ownerUid}`);
                } else {
                  // Update Wallet
                  const walletSnap = await currentDb.collection("wallets")
                    .where("ownerUid", "==", ownerUid)
                    .limit(1)
                    .get();

                  if (!walletSnap.empty) {
                    const walletDoc = walletSnap.docs[0];
                    await walletDoc.ref.update({
                      balance: increment(amount),
                      updatedAt: serverTimestamp()
                    });

                    // Record Transaction
                    await currentDb.collection("wallet_transactions").add({
                      walletId: walletDoc.id,
                      ownerUid: ownerUid,
                      type: 'recharge',
                      method: 'pix',
                      amount: amount,
                      description: 'Recarga Pix Mercado Pago (Instantânea)',
                      createdAt: serverTimestamp(),
                      timestamp: serverTimestamp(),
                      date: new Date().toISOString().split('T')[0]
                    });
                    console.log(`Wallet updated for user ${ownerUid}. Amount: R$ ${amount}`);
                  } else {
                    console.warn(`Wallet not found for user ${ownerUid}`);
                  }
                }
              } else {
                console.log(`Pix payment ${paymentId} already processed or not found.`);
              }
            } else {
              // Handle Normal Orders
              const orderId = externalRef;
              const orderRef = currentDb.collection("orders").doc(orderId);
              const orderSnap = await orderRef.get();

              if (orderSnap.exists) {
                const order = orderSnap.data();

                // Only process if not already processed
                if (order?.status === "pending" || order?.status === "split_parent") {
                  // 1. Update Order Status
                  await orderRef.update({
                    status: order?.status === "split_parent" ? "split_parent" : "preparing",
                    paymentStatus: "paid",
                    updatedAt: serverTimestamp()
                  });

                  // If it's a split parent, also update all sub-orders
                  if (order?.status === "split_parent") {
                    console.log(`Propagating payment to sub-orders of #${orderId}`);
                    const subOrdersSnap = await currentDb.collection("orders").where("parentOrderId", "==", orderId).get();
                    for (const subDoc of subOrdersSnap.docs) {
                      await subDoc.ref.update({
                        status: "preparing",
                        paymentStatus: "paid",
                        updatedAt: serverTimestamp()
                      });
                      
                      // Trigger printing for each sub-order
                      const subOrder = subDoc.data();
                      if (subOrder.restaurantId) {
                        triggerPrinting(subDoc.id, subOrder.restaurantId);
                      }
                    }
                  } else {
                    // Trigger Printing for normal order
                    if (order?.restaurantId) {
                      triggerPrinting(orderId, order.restaurantId);
                    }
                  }

                  // 2. Automatic Payout (Split)
                  if (settings.splitPayEnabled) {
                    const restaurantId = order?.restaurantId;
                    const restaurantSnap = await db.collection("restaurants").doc(restaurantId).get();
                    
                    if (restaurantSnap.exists) {
                      const restaurant = restaurantSnap.data();
                      const splitConfig = restaurant?.splitPayConfig;

                      if (splitConfig?.active && splitConfig?.pixKey) {
                        const totalAmount = order?.total;
                        let platformFee = 0;

                        if (splitConfig.feeType === "percent") {
                          platformFee = totalAmount * (splitConfig.platformFee / 100);
                        } else {
                          platformFee = splitConfig.platformFee;
                        }

                        const restaurantAmount = totalAmount - platformFee;

                        if (restaurantAmount > 0) {
                          console.log(`Executing Payout for Restaurant ${restaurantId}: R$${restaurantAmount}`);
                          
                          // Execute Payout via PIX using axios
                          try {
                            console.log(`Sending payout request to Mercado Pago for order ${orderId}...`);
                            
                            const cleanPixKey = String(splitConfig.pixKey).trim();
                            let pixKeyType = 'email';
                            if (cleanPixKey.includes('@')) pixKeyType = 'email';
                            else if (/^\d{11}$/.test(cleanPixKey)) pixKeyType = 'cpf';
                            else if (/^\d{14}$/.test(cleanPixKey)) pixKeyType = 'cnpj';
                            else if (/^\+?\d{10,15}$/.test(cleanPixKey)) pixKeyType = 'phone';
                            else if (cleanPixKey.length > 20) pixKeyType = 'evp';

                            const payoutResult = await axios.post('https://api.mercadopago.com/v1/payouts', {
                              amount: Number(restaurantAmount.toFixed(2)),
                              description: `Repasse Pedido ${orderId}`,
                              external_reference: String(orderId),
                              payout_method_id: 'pix',
                              payout_destination: {
                                type: 'pix',
                                receiver_id: cleanPixKey,
                                pix_key_type: pixKeyType
                              }
                            }, {
                              headers: {
                                'Authorization': `Bearer ${accessToken}`,
                                'Content-Type': 'application/json',
                                'X-Idempotency-Key': crypto.randomUUID ? crypto.randomUUID() : `idemp-${Date.now()}-${Math.random().toString(36).substring(2)}`
                              }
                            });

                            // Log to history
                            await db.collection("splitpay_history").add({
                              orderId,
                              restaurantId,
                              cityName: restaurant?.city || "N/A",
                              totalAmount,
                              platformFee,
                              restaurantAmount,
                              pixKeyDest: splitConfig.pixKey,
                              status: "success",
                              payoutId: payoutResult.data.id,
                              createdAt: serverTimestamp()
                            });
                          } catch (payoutError: any) {
                            const errorData = payoutError.response?.data || payoutError;
                            console.error("Mercado Pago Payout Error:", errorData);
                            
                            // Log error to history
                            await db.collection("splitpay_history").add({
                              orderId,
                              restaurantId,
                              cityName: restaurant?.city || "N/A",
                              totalAmount,
                              platformFee,
                              restaurantAmount,
                              pixKeyDest: splitConfig.pixKey,
                              status: "error",
                              errorMessage: errorData.message || String(errorData),
                              createdAt: serverTimestamp()
                            });
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      } catch (error) {
        console.error("Error processing webhook:", error);
      }
    }

    res.status(200).send("OK");
  });

  // API Route to Print Order
  app.post("/api/print-order", async (req, res) => {
    const { orderId, restaurantId, isAuto } = req.body;

    if (!orderId || !restaurantId) {
      return res.status(400).json({ error: "Missing orderId or restaurantId" });
    }

    try {
      await triggerPrinting(orderId, restaurantId, !!isAuto);
      res.json({ success: true });
    } catch (error) {
      console.error("Printing error:", error);
      res.status(500).json({ error: "Failed to print order" });
    }
  });

  // API Route to Test Printer
  app.post("/api/test-print", async (req, res) => {
    const { ip, port, name } = req.body;

    if (!ip) {
      return res.status(400).json({ error: "Missing printer IP" });
    }

    try {
      const esc = "\x1B";
      const gs = "\x1D";
      const lineFeed = "\n";
      
      const commands = [
        Buffer.from(esc + "@"),
        Buffer.from(esc + "a" + "\x01"),
        Buffer.from(`TESTE DE IMPRESSAO${lineFeed}`),
        Buffer.from(`Impressora: ${name || "Sem nome"}${lineFeed}`),
        Buffer.from(`IP: ${ip}${lineFeed}`),
        Buffer.from(`Data: ${new Date().toLocaleString()}${lineFeed}`),
        Buffer.from(`Status: CONECTADA${lineFeed}`),
        Buffer.from(lineFeed + lineFeed + lineFeed),
        Buffer.from(gs + "V" + "\x41" + "\x03")
      ];
      
      await sendToPrinter(ip, port || 9100, Buffer.concat(commands));
      res.json({ success: true });
    } catch (error) {
      console.error("Test print error:", error);
      res.status(500).json({ error: "Failed to connect to printer" });
    }
  });

  // Proxy for Nominatim Geocoding
  app.get("/api/geocode", async (req, res) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ error: "Missing lat/lon" });
    }

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&addressdetails=1&email=delivery.projeto.app@gmail.com`, {
        headers: {
          'User-Agent': 'ifood-Tupa-App/1.0 (delivery.projeto.app@gmail.com)'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Nominatim error: ${response.statusText}`);
      }

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Geocoding error:", error);
      res.status(500).json({ error: "Failed to fetch address" });
    }
  });
  
  // Proxy for Categories API - Strictly uses GET as required by the target system
  app.all("/api/proxy/categories", async (req, res) => {
    const { url, ...queryParams } = req.query;
    
    if (!url) {
      return res.status(400).json({ error: "Missing url parameter" });
    }

    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    if (req.headers['api-key']) {
      headers['api-key'] = req.headers['api-key'] as string;
    }

    // RULE: Always use GET, never use POST, never send body
    const method = 'GET';

    console.log(`Proxying ${method} categories request to: ${url}`);

    try {
      const response = await axios({
        method: method,
        url: url as string,
        headers,
        params: queryParams,
        timeout: 15000
      });
      
      res.json(response.data);
    } catch (error: any) {
      const status = error.response?.status || 500;
      const errorData = error.response?.data;
      const errorMessage = errorData?.error || errorData?.message || (errorData?.errors && errorData.errors.join(', ')) || error.message;
      
      res.status(status).json({ 
        error: errorMessage,
        details: errorData || error.message,
        status: status
      });
    }
  });

  // Machine API (Gaudium) - Mode 1: Multicategory Estimates
  app.get(["/api/machine/estimativas", "/api/machine/estimar-multicategorias"], async (req, res) => {
    const { cityId, lat_partida, lng_partida, lat_desejado, lng_desejado } = req.query;

    if (!cityId || !lat_desejado || !lng_desejado) {
      return res.status(400).json({ 
        error: "Missing required parameters (cityId, lat_desejado, lng_desejado)",
        missing: { cityId: !cityId, lat_desejado: !lat_desejado, lng_desejado: !lng_desejado }
      });
    }

    try {
      // 1. Fetch credentials from backend securely
      const cityDoc = await db.collection('cities').doc(cityId as string).get();
      if (!cityDoc.exists) {
        return res.status(404).json({ error: "City configuration not found on server." });
      }

      const cityData = cityDoc.data();
      const { apiUrl, apiKey, authEmail, authPassword } = cityData;

      if (!apiUrl || !apiKey || !authEmail) {
        return res.status(500).json({ error: "City integration (Taximachine) not properly configured on server." });
      }

      const auth = Buffer.from(`${authEmail}:${authPassword || ''}`).toString('base64');
      const headers = {
        'api-key': apiKey,
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Origin': apiUrl,
        'Referer': apiUrl + '/'
      };

      const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
      
      const latPOriginal = parseFloat(lat_partida as string);
      const lngPOriginal = parseFloat(lng_partida as string);
      const latD = parseFloat(lat_desejado as string);
      const lngD = parseFloat(lng_desejado as string);

      if (isNaN(latPOriginal) || isNaN(lngPOriginal) || isNaN(latD) || isNaN(lngD) || latPOriginal === 0 || lngPOriginal === 0 || latD === 0 || lngD === 0) {
        return res.status(200).json({ 
          success: false, 
          errors: [{ code: 0, message: "Coordenadas inválidas. Verifique os endereços." }] 
        });
      }

      // Lógica de Variações Automáticas (Auto-Correction)
      // Se a primeira falhar por erro de trajeto, tenta variações de ~100m
      const baseOff = 0.0009; 
      const attempts = [
        { lP: latPOriginal, nP: lngPOriginal, lD: latD, nD: lngD }, // Original
        { lP: latPOriginal + baseOff, nP: lngPOriginal, lD: latD, nD: lngD },
        { lP: latPOriginal - baseOff, nP: lngPOriginal, lD: latD, nD: lngD },
        { lP: latPOriginal, nP: lngPOriginal + baseOff, lD: latD, nD: lngD },
        { lP: latPOriginal, nP: lngPOriginal - baseOff, lD: latD, nD: lngD },
        { lP: latPOriginal, nP: lngPOriginal, lD: latD + baseOff, nD: lngD },
        { lP: latPOriginal, nP: lngPOriginal, lD: latD - baseOff, nD: lngD },
      ];

      let lastError = null;
      let successResp = null;

      for (let i = 0; i < attempts.length; i++) {
        const { lP, nP, lD, nD } = attempts[i];
        try {
          console.log(`[Estimativas] Attempt ${i + 1}/${attempts.length}: P(${lP.toFixed(6)},${nP.toFixed(6)}) D(${lD.toFixed(6)},${nD.toFixed(6)})`);
          const response = await axios.get(`${baseUrl}/api/integracao/estimarSolicitacaoMulticategorias`, {
            headers,
            params: { 
              lat_partida: lP.toFixed(6), 
              lng_partida: nP.toFixed(6), 
              lat_desejado: lD.toFixed(6), 
              lng_desejado: nD.toFixed(6)
            },
            timeout: 10000
          });
          
          if (response.data && response.data.success) {
            console.log(`[Estimativas] Success on attempt ${i + 1}`);
            successResp = response.data;
            break;
          }
          
          lastError = response.data;
          const errorMsg = response.data?.errors?.[0]?.message || "";
          if (!errorMsg.toLowerCase().includes("trajeto") && i === 0) break;

        } catch (err: any) {
          const status = err.response?.status || 500;
          lastError = err.response?.data || { error: err.message };
          const errorMsg = lastError?.errors?.[0]?.message || "";
          
          if (status !== 400 && i === 0) break;
          if (status === 400 && !errorMsg.toLowerCase().includes("trajeto") && i === 0) break;
        }
      }

      if (successResp) {
        const categoriesMapped = successResp.categorias || successResp.response?.categorias || successResp.response || [];
        return res.json({ 
          ...successResp,
          categorias: Array.isArray(categoriesMapped) ? categoriesMapped : []
        });
      }

      console.log(`[Estimativas] FAILED after ${attempts.length} attempts.`);
      return res.status(200).json({
        success: false,
        errors: lastError?.errors || [{ message: "Não foi possível calcular o trajeto. Tente ajustar os endereços." }]
      });

    } catch (globalError: any) {
      const status = globalError.response?.status || 500;
      const errorData = globalError.response?.data || { error: globalError.message || "Unknown error" };
      console.error(`[Estimativas] Gaudium API Error (${status}):`, JSON.stringify(errorData));
      
      if (status === 400 && errorData?.errors?.[0]?.message) {
        console.log(`[Estimativas] Returning 400 business error as 200 success=false payload`);
        return res.status(200).json({
          success: false,
          errors: errorData.errors
        });
      }

      res.status(status).json(errorData || { error: globalError.message });
    }
  });

  // Machine API (Gaudium) - Mode 2: Simple Categories List
  app.get(["/api/machine/categorias", "/api/machine/list-categorias"], async (req, res) => {
    const { cityId, cityName, apiUrl: qApiUrl, apiKey: qApiKey, authEmail: qAuthEmail, authPassword: qAuthPassword } = req.query;

    let apiUrl = qApiUrl as string;
    let apiKey = qApiKey as string;
    let authEmail = qAuthEmail as string;
    let authPassword = qAuthPassword as string;
    let finalCityName = cityName as string;

    if (!cityId && (!apiUrl || !apiKey || !authEmail)) {
      return res.status(400).json({ error: "Missing cityId or explicit credentials (apiUrl, apiKey, authEmail)" });
    }

    try {
      if (cityId && cityId !== 'temp') {
        const cityDoc = await db.collection('cities').doc(cityId as string).get();
        if (cityDoc.exists) {
          const cityData = cityDoc.data();
          apiUrl = apiUrl || cityData.apiUrl;
          apiKey = apiKey || cityData.apiKey;
          authEmail = authEmail || cityData.authEmail;
          authPassword = authPassword || cityData.authPassword;
          finalCityName = finalCityName || cityData.name;
        }
      }

      if (!apiUrl || !apiKey || !authEmail) {
        return res.status(400).json({ error: "City integration not configured or missing credentials." });
      }

      const auth = Buffer.from(`${authEmail}:${authPassword || ''}`).toString('base64');
      const headers = {
        'api-key': apiKey,
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Origin': apiUrl,
        'Referer': apiUrl + '/'
      };

      const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;

      console.log(`[Categorias] Fetching from Gaudium: ${baseUrl}/api/integracao/categoria`);
      const response = await axios.get(`${baseUrl}/api/integracao/categoria`, {
        headers,
        params: {
          endereco: 'Centro',
          bairro: 'Centro',
          cidade: finalCityName || 'Centro'
        },
        timeout: 15000
      });
      res.json(response.data);
    } catch (error: any) {
      const status = error.response?.status || 500;
      const errorData = error.response?.data;
      console.warn(`[Categorias] Gaudium API returned ${status}:`, JSON.stringify(errorData));
      
      // Handle 400 as a business rejection, not a service failure
      if (status === 400 && errorData?.errors?.[0]?.message) {
        return res.status(200).json({
          success: false,
          errors: errorData.errors
        });
      }
      
      res.status(status).json(errorData || { error: error.message });
    }
  });

  // Machine API (Gaudium) - Dispatch Courier (abrirSolicitacao)
  app.post("/api/machine/dispatch", async (req, res) => {
    const { cityId, dispatchData, metadata } = req.body;

    if (!cityId || !dispatchData) {
      return res.status(400).json({ error: "Missing required parameters (cityId, dispatchData)" });
    }

    try {
      const cityDoc = await db.collection('cities').doc(cityId as string).get();
      if (!cityDoc.exists) {
        return res.status(404).json({ error: "City configuration not found." });
      }

      const { apiUrl, apiKey, authEmail, authPassword, empresa_id } = cityDoc.data();

      // Garantir que as coordenadas sejam números e tenham precisão correta
      if (dispatchData.desejado) {
        dispatchData.desejado.lat = Number(Number(dispatchData.desejado.lat).toFixed(7));
        dispatchData.desejado.lng = Number(Number(dispatchData.desejado.lng).toFixed(7));
      }
      if (dispatchData.partida) {
        dispatchData.partida.lat = Number(Number(dispatchData.partida.lat).toFixed(7));
        dispatchData.partida.lng = Number(Number(dispatchData.partida.lng).toFixed(7));
      }

      // Adicionar empresa_id se disponível
      if (empresa_id && !dispatchData.empresa_id) {
        dispatchData.empresa_id = empresa_id;
      }

      // Limpeza de campos de texto e formatação de telefone
      const fixPhone = (obj: any) => {
        if (obj && typeof obj === 'object') {
          obj.codigo_pais = String(obj.codigo_pais || "55").replace(/\D/g, '');
          obj.codigo_area = String(obj.codigo_area || "69").replace(/\D/g, '');
          // Fix: Ensure we never send "0" as fallback, use empty string if not present
          let tel = String(obj.telefone || "").replace(/\D/g, '');
          if (tel === "0") tel = "";
          obj.telefone = tel;
        }
      };
      fixPhone(dispatchData.dados_cadastro);
      fixPhone(dispatchData.dados_passageiro);

      const auth = Buffer.from(`${authEmail}:${authPassword}`).toString('base64');
      const headers = {
        'api-key': apiKey,
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Origin': apiUrl,
        'Referer': apiUrl + '/'
      };

      const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;

      console.log(`[TaxiMachine] Dispatching Ride (abrirSolicitacao):`, JSON.stringify(dispatchData));

      const mchResponse = await axios.post(`${baseUrl}/api/integracao/abrirSolicitacao`, dispatchData, {
        headers,
        timeout: 25000
      });

      // Persistência no Firestore
      if (mchResponse.data.success && metadata) {
        const id_mch = mchResponse.data.response?.id_mch;
        try {
          const rideRef = db.collection('rides').doc();
          await rideRef.set({
            restaurantId: metadata.restaurantId,
            restaurantName: metadata.restaurantName,
            machineRequestId: id_mch,
            cityId: cityId,
            orderId: metadata.orderId,
            customerUids: metadata.customerUids || [],
            client_lat: Number(dispatchData.desejado?.lat),
            client_lng: Number(dispatchData.desejado?.lng),
            restaurant_lat: Number(dispatchData.partida?.lat),
            restaurant_lng: Number(dispatchData.partida?.lng),
            status: 'searching',
            categoryName: metadata.categoryName || 'Entrega',
            deliveryMethod: 'tupa',
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            destinations: metadata.destinations || []
          });
          mchResponse.data.internalRideId = rideRef.id;
          console.log(`[Persistence] Ride saved for order ${metadata.orderId}`);
        } catch (dbErr: any) {
          console.error("[Persistence] Failed to save ride:", dbErr.message);
        }
      }

      res.json(mchResponse.data);
    } catch (error: any) {
      const status = error.response?.status || 500;
      const errorData = error.response?.data;
      console.error(`[Dispatch API Error] Status: ${status}`, JSON.stringify(errorData || error.message));
      res.status(status).json(errorData || { error: error.message });
    }
  });

  // Machine API (Gaudium) - Status da solicitação
  app.get("/api/machine/solicitacaoStatus", async (req, res) => {
    const { cityId, id_mch } = req.query;

    if (!cityId || !id_mch) {
      return res.status(400).json({ error: "Missing required parameters (cityId, id_mch)" });
    }

    try {
      const cityDoc = await db.collection('cities').doc(cityId as string).get();
      if (!cityDoc.exists) return res.status(404).json({ error: "City not found." });

      const { apiUrl, apiKey, authEmail, authPassword } = cityDoc.data();
      const auth = Buffer.from(`${authEmail}:${authPassword || ''}`).toString('base64');
      const headers = {
        'api-key': apiKey,
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Origin': apiUrl,
        'Referer': apiUrl + '/'
      };

      const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;

      const response = await axios.get(`${baseUrl}/api/integracao/solicitacaoStatus`, {
        headers,
        params: { id_mch },
        timeout: 15000
      });
      res.json(response.data);
    } catch (error: any) {
      const status = error.response?.status || 500;
      res.status(status).json(error.response?.data || { error: error.message });
    }
  });

  // Machine API (Gaudium) - Posição do condutor
  app.get("/api/machine/posicaoCondutor", async (req, res) => {
    const { cityId, id_mch } = req.query;

    if (!cityId || !id_mch) {
      return res.status(400).json({ error: "Missing required parameters (cityId, id_mch)" });
    }

    try {
      const cityDoc = await db.collection('cities').doc(cityId as string).get();
      if (!cityDoc.exists) return res.status(404).json({ error: "City not found." });

      const { apiUrl, apiKey, authEmail, authPassword } = cityDoc.data();
      const auth = Buffer.from(`${authEmail}:${authPassword || ''}`).toString('base64');
      const headers = {
        'api-key': apiKey,
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Origin': apiUrl,
        'Referer': apiUrl + '/'
      };

      const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;

      const response = await axios.get(`${baseUrl}/api/integracao/posicaoCondutor`, {
        headers,
        params: { id_mch },
        timeout: 15000
      });
      res.json(response.data);
    } catch (error: any) {
      const status = error.response?.status || 500;
      res.status(status).json(error.response?.data || { error: error.message });
    }
  });

  // Machine API (Gaudium) - Obter solicitações
  app.get("/api/machine/solicitacao", async (req, res) => {
    const { cityId, id_mch } = req.query;

    if (!cityId) {
      return res.status(400).json({ error: "Missing cityId" });
    }

    try {
      const cityDoc = await db.collection('cities').doc(cityId as string).get();
      if (!cityDoc.exists) return res.status(404).json({ error: "City not found." });

      const { apiUrl, apiKey, authEmail, authPassword } = cityDoc.data();
      const auth = Buffer.from(`${authEmail}:${authPassword || ''}`).toString('base64');
      const headers = {
        'api-key': apiKey,
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Origin': apiUrl,
        'Referer': apiUrl + '/'
      };

      const baseUrl = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;

      const response = await axios.get(`${baseUrl}/api/integracao/solicitacao`, {
        headers,
        params: { id_mch },
        timeout: 15000
      });
      res.json(response.data);
    } catch (error: any) {
      const status = error.response?.status || 500;
      res.status(status).json(error.response?.data || { error: error.message });
    }
  });

  // Machine API (Gaudium) - Detalhes da corrida
  app.get("/api/machine/rideDetails", async (req, res) => {
    const { apiUrl, apiKey, authEmail, authPassword, id } = req.query;

    if (!apiUrl || !apiKey || !authEmail || !id) {
      return res.status(400).json({ error: "Missing required parameters for ride details" });
    }

    const auth = Buffer.from(`${authEmail}:${authPassword || ''}`).toString('base64');
    const headers = {
      'api-key': apiKey as string,
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    const baseUrl = (apiUrl as string).endsWith('/') ? (apiUrl as string).slice(0, -1) : apiUrl;

    try {
      const response = await axios.get(`${baseUrl}/api/v1/request/${id}`, {
        headers,
        timeout: 15000
      });
      res.json(response.data);
    } catch (error: any) {
      const status = error.response?.status || 500;
      res.status(status).json(error.response?.data || { error: error.message });
    }
  });

  // Machine API (Gaudium) - Cancelar solicitação
  app.post("/api/machine/cancelar", async (req, res) => {
    const { apiUrl, apiKey, authEmail, authPassword, id_mch, motivo_id } = req.body;

    //authPassword might be an empty string, so we don't strictly check for it here
    if (!apiUrl || !apiKey || !authEmail || !id_mch) {
      return res.status(400).json({ error: "Missing required parameters for cancel (apiUrl, apiKey, authEmail, or id_mch)" });
    }

    const auth = Buffer.from(`${authEmail}:${authPassword || ''}`).toString('base64');
    const headers = {
      'api-key': apiKey as string,
      'Authorization': `Basic ${auth}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };

    const baseUrl = (apiUrl as string).endsWith('/') ? (apiUrl as string).slice(0, -1) : apiUrl;

    console.log(`[TaxiMachine] Attempting to cancel ride ${id_mch} at ${baseUrl}/api/integracao/cancelar`);

    try {
      const response = await axios.post(`${baseUrl}/api/integracao/cancelar`, {
        id_mch: String(id_mch),
        motivo_id: String(motivo_id || "1")
      }, {
        headers,
        timeout: 20000
      });
      console.log(`[TaxiMachine] Cancel success for ${id_mch}:`, JSON.stringify(response.data));
      res.json(response.data);
    } catch (error: any) {
      const status = error.response?.status || 500;
      const errorData = error.response?.data || { error: error.message };
      console.error(`[TaxiMachine] Cancel error for ${id_mch} (Status ${status}):`, JSON.stringify(errorData));
      res.status(status).json(errorData);
    }
  });

  // API Route for Manual SplitPay Retry
  app.post("/api/split-pay", async (req, res) => {
    const { orderId, restaurantId, amount, pixKey, accessToken: rawAccessToken } = req.body;
    const accessToken = rawAccessToken?.trim();

    if (!accessToken || !amount || !pixKey) {
      return res.status(400).json({ error: "Missing required parameters for SplitPay" });
    }

    try {
      console.log(`Executing Manual Payout for Order #${orderId}, Restaurant ${restaurantId}: R$${amount}`);
      
      // Ensure pixKey is a clean string
      const cleanPixKey = String(pixKey).trim();
      
      // Determine PIX key type (optional but helpful for some MP accounts)
      let pixKeyType = 'email';
      if (cleanPixKey.includes('@')) pixKeyType = 'email';
      else if (/^\d{11}$/.test(cleanPixKey)) pixKeyType = 'cpf';
      else if (/^\d{14}$/.test(cleanPixKey)) pixKeyType = 'cnpj';
      else if (/^\+?\d{10,15}$/.test(cleanPixKey)) pixKeyType = 'phone';
      else if (cleanPixKey.length > 20) pixKeyType = 'evp'; // Random key

      const payoutResult = await axios.post('https://api.mercadopago.com/v1/payouts', {
        amount: Number(Number(amount).toFixed(2)),
        description: `Repasse Manual Pedido ${orderId}`,
        external_reference: String(orderId),
        payout_method_id: 'pix',
        payout_destination: {
          type: 'pix',
          receiver_id: cleanPixKey,
          pix_key_type: pixKeyType
        }
      }, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': crypto.randomUUID ? crypto.randomUUID() : `idemp-${Date.now()}-${Math.random().toString(36).substring(2)}`
        }
      });

      res.json({ success: true, data: payoutResult.data });
    } catch (error: any) {
      const errorData = error.response?.data || error;
      console.error("Mercado Pago Payout Error:", errorData);
      res.status(error.response?.status || 500).json(errorData);
    }
  });

  // API Route to Create PIX Payment
  app.post("/api/create-pix", async (req, res) => {
    const { amount, description, email, firstName, lastName, accessToken: rawAccessToken, orderId } = req.body;
    const accessToken = rawAccessToken?.trim();

    if (!accessToken || !amount) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    try {
      const mpClient = new MercadoPagoConfig({ accessToken: accessToken });
      const payment = new Payment(mpClient);
      
      const paymentResult = await payment.create({
        body: {
          transaction_amount: Number(amount),
          description: description || 'Pagamento ifood TUPÃ',
          payment_method_id: 'pix',
          external_reference: String(orderId),
          notification_url: `${process.env.APP_URL}/api/webhook/mercadopago`,
          payer: {
            email: email || 'cliente@exemplo.com',
            first_name: firstName || 'Cliente',
            last_name: lastName || 'Fiel'
          }
        },
        requestOptions: {
          idempotencyKey: crypto.randomUUID()
        }
      });

      // Record initial pending payment - ASYNCHRONOUSLY to not block response
      if (paymentResult.id) {
        (async () => {
          try {
            const currentDb = await getFirestoreDb(databaseId);
            let restaurantData = null;

            // Only lookup if it's a real order, not a recharge
            if (orderId && !String(orderId).startsWith('RECHARGE_') && !String(orderId).startsWith('SUB_')) {
              try {
                const orderSnap = await currentDb.collection("orders").doc(String(orderId)).get();
                if (orderSnap.exists) {
                  const order = orderSnap.data();
                  const restaurantSnap = await currentDb.collection("restaurants").doc(order?.restaurantId).get();
                  restaurantData = restaurantSnap.exists ? restaurantSnap.data() : null;
                }
              } catch (e: any) {
                console.error("Error fetching order/restaurant data in background:", e.message);
              }
            }

            await currentDb.collection("payments").doc(String(paymentResult.id)).set({
              paymentId: String(paymentResult.id),
              orderId: orderId || "N/A",
              amount: Number(amount),
              status: paymentResult.status || "pending",
              method: "pix",
              payerEmail: email || 'cliente@exemplo.com',
              city: restaurantData?.city || "Não Informada",
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              date: new Date().toISOString().split('T')[0]
            }, { merge: true });

            console.log(`[Background] recorded payment ${paymentResult.id} in Firestore.`);
          } catch (firestoreError: any) {
            console.error("Background Firestore recording error:", firestoreError.message);
          }
        })();
      }

      res.json(paymentResult);
    } catch (error: any) {
      console.error("Mercado Pago Payment Error:", error);
      
      // Handle gRPC / Firestore errors specifically
      if (error.code === 7 || error.message?.includes('PERMISSION_DENIED')) {
        return res.status(403).json({
          error: "Erro de permissão no banco de dados. Por favor, verifique a configuração do Firebase.",
          details: error.message
        });
      }

      const errorData = error.response?.data || { message: error.message };
      res.status(error.status || 500).json({
        error: error.message || "Erro ao processar pagamento",
        details: errorData,
        status: error.status
      });
    }
  });

  // API Route to Check Payment Status
  app.get("/api/check-payment/:paymentId", async (req, res) => {
    const { paymentId } = req.params;
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.split(' ')[1];

    if (!accessToken) {
      return res.status(401).json({ error: "No access token provided" });
    }

    if (!paymentId || paymentId === 'undefined' || paymentId === 'null') {
      return res.status(400).json({ error: "Invalid payment ID" });
    }

    try {
      console.log(`Checking payment status for: ${paymentId}`);
      const response = await axios.get(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        },
        timeout: 10000 // 10 seconds timeout
      });
      res.json(response.data);
    } catch (error: any) {
      console.error("Error checking payment status:", {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        paymentId: req.params.paymentId
      });
      const status = error.response?.status || 500;
      res.status(status).json(error.response?.data || { error: "Failed to check payment status" });
    }
  });

  // API Route to Update User (Admin only)
  app.post("/api/admin/update-user", async (req, res) => {
    const { uid, email, password, displayName, cpf, role } = req.body;
    const authHeader = req.headers.authorization;

    console.log(`[AdminAPI] Attempting to update user ${uid}. Data:`, { email, displayName, role });

    try {
      // Bypassing strict verification for total access as requested
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const idToken = authHeader.split("Bearer ")[1];
        try {
          const decodedToken = await adminAuth().verifyIdToken(idToken);
          console.log(`[AdminAPI] Request by authenticated user: ${decodedToken.uid} (${decodedToken.email})`);
        } catch (e: any) {
          console.warn(`[AdminAPI] Token verification failed: ${e.message}. Proceeding anyway (BYPASS MODE).`);
        }
      } else {
        console.warn(`[AdminAPI] No Auth Token provided. Proceeding anyway (BYPASS MODE).`);
      }

      // Update Auth if possible
      try {
        const updateParams: any = {};
        if (email) updateParams.email = email;
        if (password) updateParams.password = password;
        if (displayName) updateParams.displayName = displayName;

        if (Object.keys(updateParams).length > 0) {
          await adminAuth().updateUser(uid, updateParams);
          console.log(`[AdminAPI] Auth updated for ${uid}`);
        }
      } catch (authErr: any) {
        console.warn(`[AdminAPI] Could not update Auth for ${uid} (maybe not a Firebase user?):`, authErr.message);
      }

      // Update Firestore
      const firestoreUpdate: any = {};
      if (email) firestoreUpdate.email = email;
      if (displayName) firestoreUpdate.displayName = displayName;
      if (cpf) firestoreUpdate.cpf = cpf;
      if (password) firestoreUpdate.password = password;
      if (role) firestoreUpdate.role = role;
      firestoreUpdate.updatedAt = admin.firestore.FieldValue.serverTimestamp();

      try {
        console.log(`[AdminAPI] Updating Firestore user doc via Admin SDK...`);
        await db.collection("users").doc(uid).set(firestoreUpdate, { merge: true });
        console.log(`[AdminAPI] Firestore updated for ${uid} via Admin SDK`);
      } catch (fsWriteErr: any) {
        console.error(`[AdminAPI] Admin SDK write FAILED for user: ${fsWriteErr.message}`);
        if (fsWriteErr.message.includes('PERMISSION_DENIED')) {
          console.warn(`[AdminAPI] Attempting FALLBACK for user update via Client SDK...`);
          const { setDoc, doc } = await import("firebase/firestore");
          await setDoc(doc(clientDb, "users", uid), firestoreUpdate, { merge: true });
          console.log(`[AdminAPI] User updated successfully for ${uid} via Client SDK FALLBACK.`);
        } else {
          throw fsWriteErr;
        }
      }

      res.json({ success: true });
    } catch (error: any) {
      console.error("[AdminAPI] Error updating user:", error);
      res.status(500).json({ error: error.message || "Internal Server Error" });
    }
  });

  // Rota para Dedução de Crédito por Pedido (Usada pelos Gestores)
  app.post("/api/manager/deduct-order-credit", async (req, res) => {
    const { ownerUid, amount, orderId, restaurantId, restaurantName, branchId, cityId, cityName } = req.body;
    console.log(`[ManagerAPI] Credit deduction request: order=${orderId}, uid=${ownerUid}, amount=${amount}`);
    
    const numericAmount = parseFloat(amount?.toString() || "0");

    if (!ownerUid) return res.status(400).json({ error: "ownerUid is required" });

    const currentDb = db;
    if (!currentDb) throw new Error("Database not initialized");

    try {
      // 1. Get Wallet
      let walletRef = currentDb.collection("wallets").doc(ownerUid);
      let walletSnap = await walletRef.get();
      
      if (!walletSnap.exists) {
        console.log(`[ManagerAPI] Wallet doc ID ${ownerUid} not found, searching field...`);
        const q = await currentDb.collection("wallets").where("ownerUid", "==", ownerUid).limit(1).get();
        if (!q.empty) {
          walletRef = currentDb.collection("wallets").doc(q.docs[0].id);
          walletSnap = q.docs[0];
        } else {
          console.warn(`[ManagerAPI] No wallet found for user ${ownerUid}`);
          return res.status(404).json({ error: "Carteira não encontrada" });
        }
      }

      // 1.1 Check if restaurant has unlimited credit (skip deduction)
      if (restaurantId) {
        const resSnap = await currentDb.collection("restaurants").doc(restaurantId).get();
        if (resSnap.exists && resSnap.data()?.unlimitedCredit === true) {
          console.log(`[ManagerAPI] Skipping deduction for ${restaurantName} (Unlimited Credit Active)`);
          return res.json({ success: true, message: "Unlimited credit active, no deduction needed" });
        }
      }

      const currentBalance = parseFloat(walletSnap.data()?.balance?.toString() || "0");
      console.log(`[ManagerAPI] Deducting R$ ${numericAmount} from balance R$ ${currentBalance}`);
      
      // 3. Update Balance
      await walletRef.update({
        balance: admin.firestore.FieldValue.increment(-numericAmount),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // 4. Record Transaction
      const txId = `order_deduct_${Date.now()}_${orderId?.slice(-4) || 'tx'}`;
      await currentDb.collection("wallet_transactions").doc(txId).set({
        id: txId,
        walletId: walletRef.id,
        ownerUid,
        restaurantId,
        restaurantName,
        branchId: branchId || '',
        cityId: cityId || '',
        cityName: cityName || '',
        type: 'order_deduction',
        amount: -numericAmount,
        description: `Pedido aceito #${orderId?.slice(-6).toUpperCase() || 'N/A'}`,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        date: new Date().toISOString().split('T')[0]
      });

      console.log(`[ManagerAPI] Success for order ${orderId}`);
      res.json({ success: true, newBalance: currentBalance - numericAmount });
    } catch (error: any) {
      console.error("[ManagerAPI] Error deducting credit:", error);
      res.status(500).json({ error: error.message || "Failed to deduct credit" });
    }
  });

  // Rota Administrativa para Créditos
  app.post("/api/admin/update-wallet-credits", async (req, res) => {
    const { ownerUid, amount, type, description } = req.body;
    const numericAmount = parseFloat(amount?.toString() || "0");
    const incrementAmount = type === 'add' ? numericAmount : -numericAmount;

    if (!ownerUid) {
      return res.status(400).json({ error: "Proprietário não identificado (ownerUid ausente)." });
    }

    console.log(`[AdminAPI] Processando Crédito para ${ownerUid}: ${type} ${numericAmount}`);

    try {
      // 1. Localizar a carteira e o saldo atual
      if (!db) {
        console.error("[AdminAPI] db (shim) não está inicializado!");
        throw new Error("Sistema de banco de dados não inicializado no servidor.");
      }
      
      console.log(`[AdminAPI] Buscando carteira para ownerUid: ${ownerUid}`);
      const walletRef = db.collection("wallets").doc(ownerUid);
      let snapshot;
      try {
        snapshot = await walletRef.get();
      } catch (getErr: any) {
        console.error(`[AdminAPI] Erro ao ler documento wallets/${ownerUid}:`, getErr.message);
        throw getErr;
      }
      
      let currentBalance = 0;
      let targetRef = walletRef;

      if (snapshot.exists) {
        currentBalance = parseFloat(snapshot.data()?.balance?.toString() || "0");
        console.log(`[AdminAPI] Carteira encontrada por ID: ${ownerUid}. Saldo atual: ${currentBalance}`);
      } else {
        console.log(`[AdminAPI] Documento ${ownerUid} não existe. Buscando por campo ownerUid...`);
        // Tenta buscar por campo ownerUid se o ID do documento não for o UID (legado)
        const q = await db.collection("wallets").where("ownerUid", "==", ownerUid).limit(1).get();
        if (!q.empty) {
          const doc = q.docs[0];
          targetRef = db.collection("wallets").doc(doc.id);
          currentBalance = parseFloat(doc.data().balance?.toString() || "0");
          console.log(`[AdminAPI] Wallet encontrada por campo ownerUid no doc: ${doc.id}. Saldo: ${currentBalance}`);
        } else {
          console.log(`[AdminAPI] Nenhuma carteira encontrada para ${ownerUid}. Criando nova.`);
        }
      }

      // 2. Calcular o novo saldo
      const newBalance = currentBalance + incrementAmount;
      
      console.log(`[AdminAPI] Processando: ${currentBalance} + (${incrementAmount}) = ${newBalance}`);

      // 3. Atualizar o saldo final no banco de dados
      await targetRef.set({
        ownerUid,
        balance: newBalance,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      // 4. Registrar a transação
      const transactionId = `admin_${Date.now()}_${ownerUid.slice(0, 4)}`;
      const transactionRef = db.collection("wallet_transactions").doc(transactionId);
      await transactionRef.set({
        id: transactionId,
        ownerUid,
        walletId: targetRef.id,
        amount: Math.abs(numericAmount),
        type: type === 'add' ? 'credit' : 'debit',
        method: 'manual',
        status: 'completed',
        description: description || `Crédito Administrativo: ${type === 'add' ? 'Adicionado' : 'Removido'}`,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        date: new Date().toISOString().split('T')[0],
        oldBalance: currentBalance,
        newBalance: newBalance,
        adminAction: true
      });

      console.log(`[AdminAPI] Sucesso! Novo saldo de ${ownerUid}: ${newBalance}`);
      return res.json({ success: true, newBalance });
    } catch (e: any) {
      console.error("[AdminAPI] Erro crítico no processamento de créditos:", e);
      const isQuota = e.message?.includes('RESOURCE_EXHAUSTED') || e.message?.includes('Quota exceeded');
      return res.status(500).json({ 
        error: isQuota ? "Cota diária do Firebase atingida. Tente novamente em 24h." : `Erro no servidor: ${e.message}`,
        details: e.stack
      });
    }
  });



  // API Route to Reset Password (Self-service recovery)
  app.post("/api/reset-password", async (req, res) => {
    const { phone, name, cpf, newPassword } = req.body;

    if (!phone || !name || !cpf || !newPassword) {
      return res.status(400).json({ error: "Dados incompletos para recuperação." });
    }

    try {
      // Find user by whatsapp (phone), name and cpf
      const usersSnap = await db.collection("users")
        .where("whatsapp", "==", phone)
        .where("cpf", "==", cpf)
        .limit(1)
        .get();

      if (usersSnap.empty) {
        return res.status(404).json({ error: "Usuário não encontrado com estes dados." });
      }

      const userDoc = usersSnap.docs[0];
      const userData = userDoc.data();
      const uid = userDoc.id;

      // Verification of name
      const registeredName = userData.displayName || userData.name || "";
      if (registeredName.toLowerCase().trim() !== name.toLowerCase().trim()) {
        return res.status(404).json({ error: "O nome não coincide com o cadastro." });
      }

      // Update Auth Password
      await adminAuth().updateUser(uid, {
        password: newPassword
      });

      // Update Firestore as requested
      await db.collection("users").doc(uid).update({
        password: newPassword, 
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      // Create a custom token for automatic login
      const customToken = await adminAuth().createCustomToken(uid);

      res.json({ success: true, token: customToken });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ error: "Erro interno ao redefinir senha." });
    }
  });

  // API Route to Verify User Data for Recovery
  app.post("/api/verify-user", async (req, res) => {
    const { phone, name, cpf } = req.body;

    if (!phone || !name || !cpf) {
      return res.status(400).json({ error: "Dados incompletos para verificação." });
    }

    try {
      const usersSnap = await db.collection("users")
        .where("whatsapp", "==", phone)
        .where("cpf", "==", cpf)
        .limit(1)
        .get();

      if (usersSnap.empty) {
        return res.status(404).json({ error: "Usuário não encontrado com estes dados." });
      }

      const userData = usersSnap.docs[0].data();
      const registeredName = userData.displayName || userData.name || "";
      
      if (registeredName.toLowerCase().trim() !== name.toLowerCase().trim()) {
        return res.status(404).json({ error: "O nome não coincide com o cadastro." });
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error verifying user:", error);
      res.status(500).json({ error: "Erro ao verificar dados." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global Error Handler to ensure JSON responses
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled Error:', err);
    res.status(err.status || 500).json({
      error: 'Internal Server Error',
      message: err.message || 'An unexpected error occurred',
      stack: process.env.NODE_ENV === 'production' ? undefined : err.stack
    });
  });

  // Global error handlers
  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
  });

  app.listen(PORT, "0.0.0.0", async () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Wait for a few seconds to ensure diagnostic and auth are fully settled
    setTimeout(async () => {
      await startBackgroundServices();
    }, 5000);
  });
}

/**
 * Monitora a atividade dos restaurantes (DESATIVADO conforme solicitação).
 */
async function startActivityMonitor() {
  console.log("[ActivityMonitor] Monitor de presença desativado (Manual Only Mode).");
}

/**
 * Monitora carteiras dos gestores e atualiza o status dos restaurantes
 * se o saldo estiver abaixo do mínimo configurado.
 * Isso permite que o CustomerView oculte restaurantes sem saldo em tempo real.
 */
/**
 * Monitora carteiras dos gestores e atualiza o status dos restaurantes
 * QUOTA-EFFICIENT VERSION: Uses polling instead of expensive snapshots on collections.
 */
// Background Data Integrity Monitor - Cleans up orphan food items
async function startDataIntegrityMonitor() {
  console.log(`[IntegrityMonitor] Initializing Data Integrity Service...`);
  
  const performCleanup = async () => {
    try {
      console.log(`[IntegrityMonitor] Starting integrity check cycle...`);
      
      // 1. Get all valid restaurant IDs
      const restaurantsSnap = await db.collection("restaurants").get();
      const validRestaurantIds = new Set(restaurantsSnap.docs.map(doc => doc.id));
      
      // 2. Fetch all food items (limit to 500 per cycle to avoid memory/quota issues)
      const foodItemsSnap = await db.collection("food_items").limit(500).get();
      
      let deletedCount = 0;
      const deletePromises = [];

      for (const itemDoc of foodItemsSnap.docs) {
        const itemData = itemDoc.data();
        const restaurantId = itemData.restaurantId;

        // 3. If restaurantId is missing or doesn't exist in restaurants collection
        if (!restaurantId || !validRestaurantIds.has(restaurantId)) {
          console.warn(`[IntegrityMonitor] Found orphan product: ${itemData.name} (ID: ${itemDoc.id}) linked to missing restaurant: ${restaurantId}`);
          deletePromises.push(db.collection("food_items").doc(itemDoc.id).delete());
          deletedCount++;
        }
      }

      // 3. Update reviews (limit to 500 per cycle)
      const reviewsSnap = await db.collection("reviews").limit(500).get();
      let reviewsDeleted = 0;
      const reviewDeletePromises = [];

      for (const reviewDoc of reviewsSnap.docs) {
        const reviewData = reviewDoc.data();
        const restaurantId = reviewData.restaurantId;

        if (!restaurantId || !validRestaurantIds.has(restaurantId)) {
          console.warn(`[IntegrityMonitor] Found orphan review: (ID: ${reviewDoc.id}) linked to missing restaurant: ${restaurantId}`);
          reviewDeletePromises.push(db.collection("reviews").doc(reviewDoc.id).delete());
          reviewsDeleted++;
        }
      }

      if (reviewDeletePromises.length > 0) {
        await Promise.all(reviewDeletePromises);
        console.log(`[IntegrityMonitor] Review cleanup complete: Removed ${reviewsDeleted} orphan reviews.`);
      }

      if (deletePromises.length > 0 || reviewDeletePromises.length > 0) {
        console.log(`[IntegrityMonitor] Global cleanup complete.`);
      } else {
        console.log(`[IntegrityMonitor] Integrity check complete: 0 orphan records found.`);
      }

    } catch (err: any) {
      console.error("[IntegrityMonitor] Check Error:", err.message);
    }
    return 1800000; // Run every 30 minutes
  };

  const runIntegrityCheck = async () => {
    const nextWait = await performCleanup();
    setTimeout(runIntegrityCheck, nextWait);
  };

  // Run first check after 30 seconds to let system warm up
  setTimeout(runIntegrityCheck, 30000);
}

async function startWalletMonitor() {
  console.log(`[WalletMonitor] Iniciando monitor de carteiras (Bypass Mode)...`);

  let minBalance = 5;

  const performSync = async () => {
    try {
      console.log(`[WalletMonitor] Rodando ciclo de sincronização...`);
      
      const firestore = db;
      
      // 1. Get min balance from settings
      const settingsDoc = await firestore.collection("settings").doc("global").get();
      if (settingsDoc.exists) {
        minBalance = settingsDoc.data().minWalletBalance ?? 5;
      }

      // 2. Get all wallets and restaurants (single read operation per cycle)
      const [walletsSnap, restaurantsSnap] = await Promise.all([
        firestore.collection("wallets").get(),
        firestore.collection("restaurants").get()
      ]);
      
      const walletMap = new Map<string, number>();
      walletsSnap.docs.forEach((d: any) => {
        const data = d.data();
        const ownerUid = data.ownerUid || d.id;
        walletMap.set(ownerUid, data.balance || 0);
      });

      let updateCount = 0;
      const nowPVStr = new Date().toLocaleString('en-US', { timeZone: 'America/Porto_Velho' });
      const nowPVDate = new Date(nowPVStr);
      const todayPV = nowPVDate.toDateString();

      for (const resDoc of restaurantsSnap.docs) {
        const resData = resDoc.data();
        if (!resData.ownerUid) continue;
        
        const balance = walletMap.get(resData.ownerUid) || 0;
        const hasUnlimitedCredit = resData.unlimitedCredit === true;
        const shouldBeBlocked = (balance < minBalance) && !hasUnlimitedCredit;
        
        const updates: any = {};

        // 1. Wallet Blocking
        if (resData.isWalletBlocked !== shouldBeBlocked) {
          console.log(`[WalletMonitor] Atualizando: ${resData.name} -> Bloqueado: ${shouldBeBlocked} (Saldo: R$ ${balance})`);
          updates.isWalletBlocked = shouldBeBlocked;
        }

        // 2. Midnight Disconnect (Absolute status override)
        // If restaurant is active but was activated on a different day (PV time), disconnect it.
        if (resData.status === 'active') {
          const activatedAt = resData.updatedAt?.toDate ? resData.updatedAt.toDate() : (resData.updatedAt ? new Date(resData.updatedAt) : null);
          if (activatedAt) {
            const activatedPVDate = new Date(activatedAt.toLocaleString('en-US', { timeZone: 'America/Porto_Velho' }));
            const activatedToday = activatedPVDate.toDateString();
            
            if (activatedToday !== todayPV) {
              console.log(`[WalletMonitor] Desconectando Restaurante (Meia Noite): ${resData.name} - Ativado em ${activatedToday}, hoje é ${todayPV}`);
              updates.status = 'paused';
              updates.forceClosed = true;
            }
          } else {
            // No timestamp? Safety disconnect or just skip. Let's disconnect once to establish baseline.
            updates.status = 'paused';
            updates.forceClosed = true;
          }
        }
        
        if (Object.keys(updates).length > 0) {
          updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();
          await firestore.collection("restaurants").doc(resDoc.id).update(updates);
          updateCount++;
        }
      }
      console.log(`[WalletMonitor] Ciclo finalizado. ${updateCount} restaurantes atualizados.`);
    } catch (err: any) {
      if (err.message?.includes('RESOURCE_EXHAUSTED')) {
        console.error("[WalletMonitor] Quota Exceeded. Polling slowed down.");
        return 600000; // Slow down to 10 minutes on quota error
      }
      console.error("[WalletMonitor] Sync Error:", err.message);
    }
    return 300000; // Default: 5 minutes
  };

  // Run immediately then poll
  const runPoll = async () => {
    if (walletMonitorInterval) clearTimeout(walletMonitorInterval);
    const nextWait = await performSync();
    walletMonitorInterval = setTimeout(runPoll, nextWait);
  };

  runPoll();
}

const rateLimitedRides = new Map<string, number>();

// Background Ride Status Monitor
async function startRideMonitor() {
  console.log(`[RideMonitor] Initializing Ride Status Service (Quota-Aware Polling)...`);
  
  const cityCache = new Map<string, any>();

  const pollRides = async () => {
    try {
      const activeStatuses = ["searching", "pending_acceptance", "accepted", "arrived_at_pickup", "picked_up", "en_route"];
      
      // Limit to 15 rides per cycle to spread load
      const ridesSnap = await db.collection("rides")
        .where("status", "in", activeStatuses)
        .limit(15)
        .get();

      if (ridesSnap.empty) return;

      const now = Date.now();

      for (const rideDoc of ridesSnap.docs) {
        const ride = { id: rideDoc.id, ...rideDoc.data() };
        if (!ride.machineRequestId) continue;

        // Rate limit check
        const last429 = rateLimitedRides.get(ride.id);
        if (last429 && now - last429 < 120000) continue; 

        try {
          let cityId = ride.cityId;
          if (!cityId && ride.restaurantId) {
             const resSnap = await db.collection("restaurants").doc(ride.restaurantId).get();
             if (resSnap.exists) {
                const resData = resSnap.data();
                cityId = resData.cityId;
                if (cityId) await db.collection("rides").doc(ride.id).update({ cityId });
             }
          }

          if (!cityId) continue;

          // Fetch city credentials with simple cache
          let cityData = cityCache.get(cityId);
          if (!cityData) {
            const citySnap = await db.collection('cities').doc(cityId).get();
            if (citySnap.exists) {
              cityData = citySnap.data();
              cityCache.set(cityId, cityData);
            }
          }
          
          if (!cityData || !cityData.apiUrl || !cityData.apiKey || !cityData.authEmail) continue;

          const auth = Buffer.from(`${cityData.authEmail}:${cityData.authPassword || ''}`).toString('base64');
          const headers = {
            'api-key': cityData.apiKey,
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          };
          const baseUrl = cityData.apiUrl.endsWith('/') ? cityData.apiUrl.slice(0, -1) : cityData.apiUrl;

          // Poll Status
          const response = await axios.get(`${baseUrl}/api/integracao/solicitacaoStatus`, {
            headers,
            params: { id_mch: ride.machineRequestId },
            timeout: 10000
          });

          if (response.data.success && response.data.response) {
            const apiStatus = String(response.data.response.status).toUpperCase();
            
            let newStatus = ride.status;
            if (apiStatus === 'D' || apiStatus === 'P') newStatus = 'searching';
            else if (apiStatus === 'G') newStatus = 'pending_acceptance';
            else if (apiStatus === 'A') newStatus = 'accepted';
            else if (apiStatus === 'E') newStatus = 'en_route';
            else if (apiStatus === 'F') newStatus = 'completed';
            else if (apiStatus === 'C' || apiStatus === 'N') newStatus = 'cancelled';

            // ONLY UPDATE IF CHANGED (Quota Saver)
            if (newStatus !== ride.status) {
                console.log(`[RideMonitor] Updating ride ${ride.id} status: ${ride.status} -> ${newStatus}`);
                const updateData: any = { status: newStatus, updatedAt: serverTimestamp() };
                
                // Try to get courier info if accepted or later
                if (['accepted', 'en_route', 'completed'].includes(newStatus)) {
                    try {
                        const detailRes = await axios.get(`${baseUrl}/api/integracao/visualizarSolicitacao`, {
                            headers,
                            params: { id_mch: ride.machineRequestId },
                            timeout: 8000
                        });
                        
                        if (detailRes.data.success && detailRes.data.response) {
                            const details = detailRes.data.response;
                            const matching = details.matching || details;
                            
                            if (matching) {
                                updateData.courierName = matching.condutor_nome || matching.nome_condutor || matching.nome || matching.condutor?.nome || ride.courierName;
                                updateData.courierPhoto = matching.condutor_foto || matching.foto_condutor || matching.foto || matching.condutor?.foto || ride.courierPhoto;
                                updateData.courierVehicle = matching.veiculo_modelo || matching.veiculo || matching.veiculo_nome || ride.courierVehicle;
                                updateData.courierPlate = matching.veiculo_placa || matching.placa_veiculo || matching.placa || ride.courierPlate;
                                updateData.courierWhatsapp = matching.condutor_telefone || matching.telefone || matching.celular || ride.courierWhatsapp;
                            }
                        }
                    } catch (e: any) {
                        console.error("[RideMonitor] Detail error:", e.message);
                    }
                }

                await db.collection("rides").doc(ride.id).update(updateData);
                
                // Propagate to orders
                const orderIds = ride.orderId ? [ride.orderId] : (ride.destinations?.map((d: any) => d.orderId) || []);
                for (const oId of orderIds) {
                    if (!oId) continue;
                    const orderRef = db.collection("orders").doc(oId);
                    const updateOrder: any = { updatedAt: serverTimestamp() };
                    
                    if (newStatus === 'completed' || newStatus === 'cancelled') {
                       updateOrder.status = newStatus === 'completed' ? 'delivered' : 'cancelled';
                    } else if (['accepted', 'pending_acceptance', 'en_route'].includes(newStatus)) {
                       updateOrder.status = 'delivering';
                       const courierName = updateData.courierName || ride.courierName;
                       if (courierName) {
                           updateOrder.courierName = courierName;
                           updateOrder.courierAssigned = true;
                           
                           const courierPhoto = updateData.courierPhoto || ride.courierPhoto || '';
                           const courierVehicle = updateData.courierVehicle || ride.courierVehicle || '';
                           const courierPlate = updateData.courierPlate || ride.courierPlate || '';
                           const courierWhatsapp = updateData.courierWhatsapp || ride.courierWhatsapp || '';
                           
                           updateOrder.courierPhoto = courierPhoto;
                           updateOrder.courierVehicle = courierVehicle;
                           updateOrder.courierPlate = courierPlate;
                           updateOrder.courierWhatsapp = courierWhatsapp;
                           
                           updateOrder.courierInfo = {
                               name: courierName,
                               phone: courierWhatsapp,
                               vehicle: courierVehicle,
                               plate: courierPlate,
                               photo: courierPhoto
                           };
                       }
                    }
                    await orderRef.update(updateOrder);
                }
            }
          }
        } catch (err: any) {
          if (err.response?.status === 429) {
            rateLimitedRides.set(ride.id, Date.now());
          }
          console.error(`[RideMonitor] Error polling ride ${ride.id}:`, err.message);
        }
      }
    } catch (e: any) {
      if (e.message?.includes('RESOURCE_EXHAUSTED')) {
         console.warn("[RideMonitor] Quota exhausted. Sleeping...");
         return;
      }
      console.error("[RideMonitor] Global polling error:", e.message || e);
    }
  };

  setInterval(pollRides, 180000); // 3 minutes interval
}

// Initialize Global Settings and Juruti City on startup
async function runInitialSeeds() {
  try {
    const currentDb = db;
    
    // 1. Initialize Global Settings
    const settingsRef = currentDb.collection('settings').doc('global');
    const settingsSnap = await settingsRef.get();
    if (!settingsSnap.exists) {
        console.log('[Init] Initializing global settings...');
        await settingsRef.set({
            appName: 'Xô Fome',
            monthlyFee: 50,
            minWalletBalance: 10,
            minRechargeAmount: 20,
            orderDeductionAmount: 2,
            autoMonthlyBilling: false,
            splitPayEnabled: false,
            maintenanceMode: false,
            maintenanceMessage: 'Estamos realizando melhorias no sistema. Voltaremos em breve!',
            _systemKey: SYSTEM_KEY
        });
    }

    // 2. Ensure 'backend-system' exists in admins collection for rules that check exists()
    try {
        await currentDb.collection('admins').doc('backend-system').set({
            email: 'backend-system@ifood-clara.iam.gserviceaccount.com',
            role: 'admin',
            system: true,
            updatedAt: new Date().toISOString(),
            _systemKey: SYSTEM_KEY
        }, { merge: true });
        console.log('[Init] backend-system admin record verified/created.');
    } catch (adminErr: any) {
        console.warn('[Init] Could not ensure backend-system admin record:', adminErr.message);
    }

    const citiesCol = currentDb.collection('cities');
    const snap = await citiesCol.get();
    const jurutiDoc = snap.docs.find((d: any) => d.data().name?.toLowerCase() === 'juruti');
    
    if (!jurutiDoc) {
        console.log('[Init] Initializing cities...');
        const initialCities = [
            {
                name: 'Juruti',
                id: 'juruti',
                apiUrl: 'https://meupaineldegestao.com.br',
                apiKey: 'mch_api_102PEeeeYfz07k2RQFpD21LE',
                authEmail: 'tupamobilidadeurbana@gmail.com',
                authPassword: '@Ehbc7890',
                lat: -2.1571381,
                lng: -56.0900977,
                active: true,
                status: 'online',
                integrationActive: true,
                categories: []
            },
            {
                name: 'Porto Velho',
                id: 'porto_velho',
                lat: -8.7618,
                lng: -63.9039,
                active: true,
                status: 'online',
                integrationActive: false,
                categories: []
            }
        ];

        for (const city of initialCities) {
            await citiesCol.doc(city.id).set({
                ...city,
                createdAt: new Date().toISOString(),
                _systemKey: SYSTEM_KEY
            }, { merge: true });
        }
        console.log('[Init] Default cities created successfully.');
    } else {
        const data = jurutiDoc.data();
        if (data.status !== 'online' || !data.apiKey) {
            await citiesCol.doc(jurutiDoc.id).update({ 
              status: 'online',
              apiKey: data.apiKey || 'mch_api_102PEeeeYfz07k2RQFpD21LE',
              authEmail: data.authEmail || 'tupamobilidadeurbana@gmail.com'
            });
            console.log('[Init] Juruti status reinforced.');
        }
    }

    // Ensure product categories database matches: delete "GGG" and create/update "Bebidas"
    try {
      const categoriesCol = currentDb.collection('categories');
      
      // 1. Delete GGG
      const gggSnap = await categoriesCol.get();
      for (const catDoc of gggSnap.docs) {
        const d = catDoc.data();
        const docName = (d.name || '').trim().toLowerCase();
        if (docName === 'ggg' || catDoc.id === 'GGG') {
          console.log(`[Init] Deleting GGG category from DB (ID: ${catDoc.id})...`);
          await categoriesCol.doc(catDoc.id).delete();
        }
      }

      // 2. Ensure "Bebidas" exists
      const bebidasSnap = await categoriesCol.get();
      let bebidasExists = false;
      for (const catDoc of bebidasSnap.docs) {
        const d = catDoc.data();
        const docName = (d.name || d.nome || '').trim().toLowerCase();
        if (docName === 'bebidas') {
          bebidasExists = true;
          // Ensure it is active
          if (d.active !== true || d.status !== 'active') {
            console.log(`[Init] Activating existing Bebidas category in DB (ID: ${catDoc.id})...`);
            await categoriesCol.doc(catDoc.id).update({
              active: true,
              status: 'active'
            });
          }
        }
      }

      if (!bebidasExists) {
        console.log(`[Init] Creating missing Bebidas category in DB...`);
        const catRef = categoriesCol.doc();
        await catRef.set({
          name: 'Bebidas',
          iconName: 'CupSoda',
          active: true,
          status: 'active',
          order: 10,
          imageUrl: '',
          id: catRef.id,
          _systemKey: SYSTEM_KEY
        });
      }
    } catch (catErr: any) {
      console.error('[Init] Failed to seed/cleanup categories:', catErr.message);
    }

  } catch (initErr: any) {
    console.error('[Init] Failed to initialize database seeds:', initErr.message);
  }
}

startServer();
