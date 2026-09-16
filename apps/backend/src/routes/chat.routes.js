import { Router } from "express";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const HISTORY_LIMIT = 10;

const router = Router();

async function getInternalUser(clerkUserId) {
  return prisma.user.findUnique({ where: { clerkUserId } });
}

// Builds a short grounding summary from the user's most recent prediction,
// so the chatbot can answer questions about "my result" without re-fetching it.
async function buildUserContext(userId) {
  const latest = await prisma.prediction.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  if (!latest) return null;

  const topFactors = Array.isArray(latest.topFactorsJson)
    ? latest.topFactorsJson.map((f) => f.factor).slice(0, 3).join(", ")
    : "";

  return `Latest PCOD risk assessment: ${Math.round(latest.probability * 100)}% probability, taken on ${latest.createdAt.toDateString()}. Top contributing factors: ${topFactors}.`;
}

router.post("/", requireAuth, async (req, res) => {
  try {
    const user = await getInternalUser(req.clerkUserId);
    if (!user) return res.status(404).json({ status: "error", message: "User not found." });

    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(422).json({ status: "error", message: "message is required." });
    }

    const recentMessages = await prisma.chatMessage.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: HISTORY_LIMIT,
    });
    const history = recentMessages.reverse().map((m) => ({ role: m.role, content: m.content }));

    const userContext = await buildUserContext(user.id);

    const mlResponse = await fetch(`${process.env.ML_SERVICE_URL}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, history, userContext }),
    });

    if (!mlResponse.ok) {
      const errBody = await mlResponse.json().catch(() => ({}));
      return res.status(mlResponse.status).json({
        status: "error",
        message: errBody.detail ?? "The chat service couldn't process this request.",
      });
    }

    const result = await mlResponse.json();

    await prisma.chatMessage.create({
      data: { userId: user.id, role: "user", content: message, groundedInKB: false },
    });
    await prisma.chatMessage.create({
      data: { userId: user.id, role: "assistant", content: result.answer, groundedInKB: result.groundedInKB },
    });

    res.json({ status: "success", data: result });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;