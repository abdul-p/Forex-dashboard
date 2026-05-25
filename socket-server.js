// ─── Socket.IO Real-Time Price Server ───────────────────────────────────────
// Runs standalone alongside Next.js on port 3001.
// Currently: emits simulated Forex candle ticks (random walk).
// Future:    swap the SIMULATION block with a real provider (Twelve Data, etc).
// ─────────────────────────────────────────────────────────────────────────────

const { createServer } = require("http");
const { Server } = require("socket.io");
const cors = require("cors");

const PORT = process.env.SOCKET_PORT || 3001;
// Accept any localhost port in development so Next.js port-shifting doesn't break CORS
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || /^http:\/\/localhost(:\d+)?$/;

// ─── Base prices for each pair ───────────────────────────────────────────────
const BASE_PRICES = {
  "EUR/USD": 1.08720,
  "GBP/USD": 1.27350,
  "USD/JPY": 157.420,
  "USD/CHF": 0.91150,
  "AUD/USD": 0.65480,
  "USD/CAD": 1.36240,
  "NZD/USD": 0.59870,
  "EUR/GBP": 0.85340,
};

// Track live prices so they random-walk from a realistic base
const livePrices = { ...BASE_PRICES };

// Active subscriptions: Map<socket.id, Set<roomKey>>
const subscriptions = new Map();

// Interval handles per room so we can clear when the last client leaves
const roomIntervals = new Map();

// ─── Helpers ────────────────────────────────────────────────────────────────
function roomKey(symbol, interval) {
  return `${symbol}::${interval}`;
}

function pipSize(symbol) {
  return symbol.includes("JPY") ? 0.01 : 0.0001;
}

/** Generate the next candle tick using a small random walk. */
function buildTick(symbol) {
  const pip = pipSize(symbol);
  const drift = (Math.random() - 0.499) * pip * 4; // ±4 pips
  livePrices[symbol] = (livePrices[symbol] || BASE_PRICES[symbol] || 1.0) + drift;

  const close = Math.max(livePrices[symbol], pip);
  const spread = pip * (1 + Math.random() * 2);
  const wick = pip * (1 + Math.random() * 5);
  const open = close - (Math.random() - 0.5) * pip * 2;
  const high = Math.max(open, close) + Math.random() * wick;
  const low = Math.min(open, close) - Math.random() * wick;

  return {
    time: Math.floor(Date.now() / 1000),
    open: parseFloat(open.toFixed(symbol.includes("JPY") ? 3 : 5)),
    high: parseFloat(high.toFixed(symbol.includes("JPY") ? 3 : 5)),
    low: parseFloat(low.toFixed(symbol.includes("JPY") ? 3 : 5)),
    close: parseFloat(close.toFixed(symbol.includes("JPY") ? 3 : 5)),
    spread: parseFloat(spread.toFixed(symbol.includes("JPY") ? 3 : 5)),
    symbol,
  };
}

/** How many ms between ticks for a given interval string. */
function tickInterval(interval) {
  const map = {
    "1min": 3_000,
    "5min": 5_000,
    "15min": 8_000,
    "1h": 10_000,
    "4h": 15_000,
    "1day": 20_000,
    "1week": 30_000,
  };
  return map[interval] ?? 5_000;
}

// ─── Server Setup ────────────────────────────────────────────────────────────
const httpServer = createServer((req, res) => {
  // Simple health-check endpoint
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", clients: io.engine.clientsCount }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST"],
  },
  path: "/socket.io",
  transports: ["websocket", "polling"],
});

// ─── Connection Logic ────────────────────────────────────────────────────────
io.on("connection", (socket) => {
  console.log(`[+] Client connected: ${socket.id}`);
  subscriptions.set(socket.id, new Set());

  // Client subscribes to a symbol+interval feed
  socket.on("subscribe", ({ symbol, interval }) => {
    if (!symbol || !interval) return;

    const key = roomKey(symbol, interval);
    socket.join(key);
    subscriptions.get(socket.id)?.add(key);

    console.log(`    ${socket.id} subscribed → ${key}`);

    // Send an immediate tick so the client has something right away
    socket.emit("candle", buildTick(symbol));

    // Start the room interval if not already running
    if (!roomIntervals.has(key)) {
      const handle = setInterval(() => {
        const tick = buildTick(symbol);
        io.to(key).emit("candle", tick);
      }, tickInterval(interval));

      roomIntervals.set(key, { handle, symbol, interval, count: 1 });
      console.log(`    [interval] started for ${key}`);
    } else {
      roomIntervals.get(key).count += 1;
    }
  });

  // Client unsubscribes from a specific feed
  socket.on("unsubscribe", ({ symbol, interval }) => {
    if (!symbol || !interval) return;
    const key = roomKey(symbol, interval);
    socket.leave(key);
    subscriptions.get(socket.id)?.delete(key);
    decrementRoom(key);
  });

  // Clean up when socket disconnects
  socket.on("disconnect", () => {
    console.log(`[-] Client disconnected: ${socket.id}`);
    const rooms = subscriptions.get(socket.id) ?? new Set();
    for (const key of rooms) {
      decrementRoom(key);
    }
    subscriptions.delete(socket.id);
  });
});

function decrementRoom(key) {
  const entry = roomIntervals.get(key);
  if (!entry) return;
  entry.count -= 1;
  if (entry.count <= 0) {
    clearInterval(entry.handle);
    roomIntervals.delete(key);
    console.log(`    [interval] stopped for ${key} (no subscribers)`);
  }
}

// ─── Start ───────────────────────────────────────────────────────────────────
httpServer.listen(PORT, () => {
  console.log(`\n🟢 Socket.IO server running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   CORS allowed origin: ${FRONTEND_ORIGIN}\n`);
});
