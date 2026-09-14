import { Router } from "express";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import { computeInsights } from "../utils/cycleInsights.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Retention policy (documented in docs/06_retention_policy.md): logs older than
// this are not returned by default — kept in the DB, not deleted, but the UI
// treats them as "archived" rather than showing unbounded history.
const RETENTION_DAYS = 730; // ~2 years

const router = Router();

async function getInternalUser(clerkUserId) {
  return prisma.user.findUnique({ where: { clerkUserId } });
}

router.get("/", requireAuth, async (req, res) => {
  try {
    const user = await getInternalUser(req.clerkUserId);
    if (!user) return res.status(404).json({ status: "error", message: "User not found." });

    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const logs = await prisma.cycleLog.findMany({
      where: { userId: user.id, startDate: { gte: cutoff } },
      orderBy: { startDate: "asc" },
    });

    res.json({ status: "success", data: { logs, insights: computeInsights(logs) } });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

router.post("/", requireAuth, async (req, res) => {
  try {
    const user = await getInternalUser(req.clerkUserId);
    if (!user) return res.status(404).json({ status: "error", message: "User not found." });

    const { startDate, endDate } = req.body;
    if (!startDate) {
      return res.status(422).json({ status: "error", message: "startDate is required." });
    }
    const today = new Date();
    if (new Date(startDate) > today || (endDate && new Date(endDate) > today)) {
      return res.status(422).json({ status: "error", message: "Cycle dates cannot be in the future." });
    }

    const log = await prisma.cycleLog.create({
      data: {
        userId: user.id,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
      },
    });

    res.json({ status: "success", data: log });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

router.patch("/:id", requireAuth, async (req, res) => {
  try {
    const user = await getInternalUser(req.clerkUserId);
    if (!user) return res.status(404).json({ status: "error", message: "User not found." });

    const existing = await prisma.cycleLog.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== user.id) {
      return res.status(404).json({ status: "error", message: "Cycle log not found." });
    }

    const { startDate, endDate } = req.body;
    const today = new Date();
    if ((startDate && new Date(startDate) > today) || (endDate && new Date(endDate) > today)) {
      return res.status(422).json({ status: "error", message: "Cycle dates cannot be in the future." });
    }
    const log = await prisma.cycleLog.update({
      where: { id: req.params.id },
      data: {
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
      },
    });

    res.json({ status: "success", data: log });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  try {
    const user = await getInternalUser(req.clerkUserId);
    if (!user) return res.status(404).json({ status: "error", message: "User not found." });

    const existing = await prisma.cycleLog.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== user.id) {
      return res.status(404).json({ status: "error", message: "Cycle log not found." });
    }

    await prisma.cycleLog.delete({ where: { id: req.params.id } });
    res.json({ status: "success" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;