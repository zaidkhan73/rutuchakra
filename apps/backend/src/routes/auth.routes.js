import { Router } from "express";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import { clerkClient } from "@clerk/express";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const router = Router();

// Called once right after a successful Clerk sign-in on the frontend.
// Upserts the User row so every later request has a Neon-side record to attach data to.
router.post("/sync", requireAuth, async (req, res) => {
  try {
    const clerkUser = await clerkClient.users.getUser(req.clerkUserId);
    const email = clerkUser.emailAddresses[0]?.emailAddress;

    const user = await prisma.user.upsert({
      where: { clerkUserId: req.clerkUserId },
      update: { email, name: clerkUser.firstName || undefined },
      create: {
        clerkUserId: req.clerkUserId,
        email,
        name: clerkUser.firstName || undefined,
      },
    });

    res.json({ status: "success", data: user });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;