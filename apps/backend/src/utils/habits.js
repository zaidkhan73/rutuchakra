export const PREDEFINED_HABITS = [
  { name: "water", label: "Water intake", icon: "💧", type: "numeric", unit: "L", target: 2.5 },
  { name: "exercise", label: "Exercise", icon: "🏃", type: "boolean" },
  { name: "sleep", label: "Sleep", icon: "😴", type: "numeric", unit: "hrs", target: 7 },
  { name: "junkFood", label: "Avoided junk food", icon: "🥗", type: "boolean" },
  { name: "stressRelief", label: "Stress relief", icon: "🧘", type: "boolean" },
];

export function isCompleted(habitDef, value) {
  if (value === undefined || value === null) return false;
  if (habitDef?.type === "numeric" && habitDef.target) return Number(value) >= habitDef.target;
  return value === true;
}

function toDateOnly(d) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function dateKey(d) {
  return toDateOnly(d).toISOString().slice(0, 10);
}

export function computeStreak(logsForHabit, habitDef) {
  const byDate = new Map(logsForHabit.map((l) => [dateKey(l.date), l.value]));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  if (!isCompleted(habitDef, byDate.get(dateKey(cursor)))) {
    cursor.setDate(cursor.getDate() - 1);
  }

  while (isCompleted(habitDef, byDate.get(dateKey(cursor)))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}