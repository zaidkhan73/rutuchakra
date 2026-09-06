import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const app = express();
app.use(cors());
app.use(express.json());

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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`RutuChakra backend running on port ${PORT}`);
});