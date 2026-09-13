import { Router } from "express";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Bump this whenever train.py is re-run and the model artifacts change,
// so every stored prediction stays traceable to the exact model that made it.
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
        modelVersion: MODEL_VERSION,
      },
    });

    res.json({
      status: "success",
      data: { ...result, predictionId: saved.id },
    });
  } catch (err) {
    console.error("PREDICTION ERROR:", err);
    res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;