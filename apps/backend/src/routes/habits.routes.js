import { Router } from "express";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { requireAuth } from "../middleware/auth.js";
import { PREDEFINED_HABITS, isCompleted, computeStreak, dateKey } from "../utils/habits.js";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const RETENTION_DAYS = 30;

const router = Router();

async function getInternalUser(clerkUserId) {
  return prisma.user.findUnique({ where: { clerkUserId } });
}

function toHabitDef(customHabit) {
  return {
    name: customHabit.name,
    label: customHabit.name,
    icon: customHabit.icon,
    type: customHabit.type,
    unit: customHabit.unit,
    target: customHabit.target,
    isCustom: true,
    id: customHabit.id,
  };
}

router.get("/today", requireAuth, async (req, res) => {
  try {
    const user = await getInternalUser(req.clerkUserId);
    if (!user) return res.status(404).json({ status: "error", message: "User not found." });

    const customHabits = await prisma.customHabit.findMany({ where: { userId: user.id } });
    const allHabits = [...PREDEFINED_HABITS, ...customHabits.map(toHabitDef)];

    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const logs = await prisma.habitLog.findMany({
      where: { userId: user.id, date: { gte: cutoff } },
      orderBy: { date: "asc" },
    });

    const todayKey = dateKey(new Date());
    const habitsToday = allHabits.map((def) => {
      const habitLogs = logs.filter((l) => l.habitName === def.name);
      const todayLog = habitLogs.find((l) => dateKey(l.date) === todayKey);
      return {
        id: def.id ?? null,
        name: def.name,
        label: def.label,
        icon: def.icon ?? null,
        type: def.type,
        unit: def.unit ?? null,
        target: def.target ?? null,
        isCustom: !!def.isCustom,
        valueToday: todayLog ? todayLog.value : null,
        streak: computeStreak(habitLogs, def),
      };
    });

    res.json({
      status: "success",
      data: {
        habits: habitsToday,
        hasEverLogged: logs.length > 0,
        isNewUser: logs.length > 0 && Math.min(...logs.map((l) => new Date(l.date).getTime())) > Date.now() - 7 * 24 * 60 * 60 * 1000,
      },
    });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

router.get("/weekly", requireAuth, async (req, res) => {
  try {
    const user = await getInternalUser(req.clerkUserId);
    if (!user) return res.status(404).json({ status: "error", message: "User not found." });

    const customHabits = await prisma.customHabit.findMany({ where: { userId: user.id } });
    const allHabits = [...PREDEFINED_HABITS, ...customHabits.map(toHabitDef)];

    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);

    const logs = await prisma.habitLog.findMany({
      where: { userId: user.id, date: { gte: since } },
    });

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(since);
      d.setDate(since.getDate() + i);
      return dateKey(d);
    });

    const grid = allHabits.map((def) => ({
      name: def.name,
      label: def.label,
      days: days.map((day) => {
        const log = logs.find((l) => l.habitName === def.name && dateKey(l.date) === day);
        return { date: day, completed: log ? isCompleted(def, log.value) : false, logged: !!log };
      }),
    }));

    res.json({ status: "success", data: { days, grid } });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// Log today's value for any habit (predefined or custom) — unchanged behaviour.
router.post("/", requireAuth, async (req, res) => {
  try {
    const user = await getInternalUser(req.clerkUserId);
    if (!user) return res.status(404).json({ status: "error", message: "User not found." });

    const { habitName, value, isCustom } = req.body;
    if (!habitName || value === undefined) {
      return res.status(422).json({ status: "error", message: "habitName and value are required." });
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const existing = await prisma.habitLog.findFirst({
      where: { userId: user.id, habitName, date: { gte: todayStart, lte: todayEnd } },
    });

    const log = existing
      ? await prisma.habitLog.update({ where: { id: existing.id }, data: { value } })
      : await prisma.habitLog.create({
          data: { userId: user.id, habitName, value, isCustom: !!isCustom, date: new Date() },
        });

    res.json({ status: "success", data: log });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

// ── Custom habit definitions: create, edit, delete ──

router.post("/custom", requireAuth, async (req, res) => {
  try {
    const user = await getInternalUser(req.clerkUserId);
    if (!user) return res.status(404).json({ status: "error", message: "User not found." });

    const { name, type, unit, target, icon } = req.body;
    if (!name || !type) {
      return res.status(422).json({ status: "error", message: "name and type are required." });
    }
    if (type === "numeric" && !target) {
      return res.status(422).json({ status: "error", message: "Numeric habits need a target." });
    }

    const habit = await prisma.customHabit.create({
      data: {
        userId: user.id,
        name,
        type,
        unit: type === "numeric" ? unit : null,
        target: type === "numeric" ? Number(target) : null,
        icon: icon || "⭐",
      },
    });

    res.json({ status: "success", data: habit });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

router.patch("/custom/:id", requireAuth, async (req, res) => {
  try {
    const user = await getInternalUser(req.clerkUserId);
    if (!user) return res.status(404).json({ status: "error", message: "User not found." });

    const existing = await prisma.customHabit.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== user.id) {
      return res.status(404).json({ status: "error", message: "Habit not found." });
    }

    const { name, unit, target } = req.body;
    const oldName = existing.name;

    const updated = await prisma.customHabit.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name }),
        ...(unit !== undefined && { unit }),
        ...(target !== undefined && { target: target ? Number(target) : null }),
      },
    });

    // habitName on past logs must stay in sync if the habit was renamed,
    // otherwise streaks/history would silently orphan from the renamed habit.
    if (name && name !== oldName) {
      await prisma.habitLog.updateMany({
        where: { userId: user.id, habitName: oldName },
        data: { habitName: name },
      });
    }

    res.json({ status: "success", data: updated });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

router.delete("/custom/:id", requireAuth, async (req, res) => {
  try {
    const user = await getInternalUser(req.clerkUserId);
    if (!user) return res.status(404).json({ status: "error", message: "User not found." });

    const existing = await prisma.customHabit.findUnique({ where: { id: req.params.id } });
    if (!existing || existing.userId !== user.id) {
      return res.status(404).json({ status: "error", message: "Habit not found." });
    }

    await prisma.habitLog.deleteMany({ where: { userId: user.id, habitName: existing.name } });
    await prisma.customHabit.delete({ where: { id: req.params.id } });

    res.json({ status: "success" });
  } catch (err) {
    res.status(500).json({ status: "error", message: err.message });
  }
});

export default router;