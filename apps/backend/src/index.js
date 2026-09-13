import "dotenv/config";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { attachClerkAuth } from "./middleware/auth.js";
import authRoutes from "./routes/auth.routes.js";
import predictionsRoutes from "./routes/predictions.routes.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const app = express();
app.use(cors());
app.use(express.json());
app.use(attachClerkAuth);

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "rutuchakra-backend" });
});

app.get("/health", async (req, res) => {
  try {
    const check = await prisma.healthCheck.create({ data: {} });
    const count = await prisma.healthCheck.count();
    res.json({ healthy: true, dbConnected: true, lastCheckId: check.id, totalChecks: count });
  } catch (err) {
    res.status(500).json({ healthy: true, dbConnected: false, error: err.message });
  }
});

app.use("/api/auth", authRoutes);
app.use("/api/predictions", predictionsRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`RutuChakra backend running on port ${PORT}`);
});