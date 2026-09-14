import { Router } from "express";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import { classifyRisk } from "../utils/risk.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const MODEL_VERSION = "rf-corrected-v1-2026-09-12";

const router = Router();

router.post("/", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { clerkUserId: req.clerkUserId } });
    if (!user) {
      return res.status(404).json({ status: "error", message: "User not found. Try signing in again." });
    }

    const mlResponse = await fetch(`${process.env.ML_SERVICE_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    if (!mlResponse.ok) {
      const errBody = await mlResponse.json().catch(() => ({}));
      return res.status(mlResponse.status).json({
        status: "error",
        message: errBody.detail ?? "The prediction service couldn't process this request.",
      });
    }

    const result = await mlResponse.json();

    const saved = await prisma.prediction.create({
      data: {
        userId: user.id,
        formInputJson: req.body,
        probability: result.probability,
        topFactorsJson: result.top_factors,
        aiAdviceText: result.ai_advice,
        modelVersion: MODEL_VERSION,
      },
    });

    res.json({
      status: "success",
      data: { ...result, predictionId: saved.id },
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// Reverse-chronological list for the History page.
router.get("/", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { clerkUserId: req.clerkUserId } });
    if (!user) {
      return res.status(404).json({ status: "error", message: "User not found." });
    }

    const predictions = await prisma.prediction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, probability: true, createdAt: true },
    });

    const data = predictions.map((p) => ({
      id: p.id,
      probability: p.probability,
      createdAt: p.createdAt,
      ...classifyRisk(p.probability),
    }));

    res.json({ status: "success", data });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// Single prediction for the read-only historical Result view.
router.get("/:id", requireAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { clerkUserId: req.clerkUserId } });
    if (!user) {
      return res.status(404).json({ status: "error", message: "User not found." });
    }

    const prediction = await prisma.prediction.findUnique({ where: { id: req.params.id } });
    if (!prediction || prediction.userId !== user.id) {
      return res.status(404).json({ status: "error", message: "Prediction not found." });
    }

    const { risk_level, advice } = classifyRisk(prediction.probability);

    res.json({
      status: "success",
      data: {
        probability: prediction.probability,
        risk_level,
        advice,
        top_factors: prediction.topFactorsJson,
        ai_advice: prediction.aiAdviceText,
        createdAt: prediction.createdAt,
      },
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;