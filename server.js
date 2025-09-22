import express from "express";
import { WebSocketServer } from "ws";
import { createClient } from "redis";
import cookieParser from "cookie-parser";
import { randomUUID } from "crypto";

const app = express();
const redis = createClient();
await redis.connect();

app.use(cookieParser());
app.use(express.static("public")); // für index.html & client.js

// Middleware: Session-ID setzen
app.use((req, res, next) => {
   if (!req.cookies.sessionId) {
      res.cookie("sessionId", randomUUID(), { httpOnly: true });
   }
   next();
});

// API: Vote
app.post("/vote/:option", async (req, res) => {
   const { option } = req.params;
   const sessionId = req.cookies.sessionId;

   if (!["A", "B", "C"].includes(option)) {
      return res.status(400).send("Invalid option");
   }

   const alreadyVoted = await redis.get(`users:${sessionId}`);
   if (alreadyVoted) {
      return res.status(403).send("You already voted");
   }

   // Counter erhöhen
   await redis.incr(`votes:${option}`);
   await redis.set(`users:${sessionId}`, option);

   // Broadcast neue Werte
   await broadcastVotes();

   res.send("Vote accepted");
});

// Hilfsfunktion: Prozentwerte berechnen
async function getVoteStats() {
   const a = parseInt(await redis.get("votes:A")) || 0;
   const b = parseInt(await redis.get("votes:B")) || 0;
   const c = parseInt(await redis.get("votes:C")) || 0;
   const total = a + b + c;

   return {
      A: total ? ((a / total) * 100).toFixed(1) : 0,
      B: total ? ((b / total) * 100).toFixed(1) : 0,
      C: total ? ((c / total) * 100).toFixed(1) : 0,
   };
}

// WebSocket-Setup
const server = app.listen(3000, () => console.log("Server läuft auf http://localhost:3000"));
const wss = new WebSocketServer({ server });

async function broadcastVotes() {
   const stats = await getVoteStats();
   const msg = JSON.stringify(stats);

   wss.clients.forEach((client) => {
      if (client.readyState === 1) {
         client.send(msg);
      }
   });
}

// Bei Verbindungsaufbau sofortige Stats schicken
wss.on("connection", async (ws) => {
   ws.send(JSON.stringify(await getVoteStats()));
});
