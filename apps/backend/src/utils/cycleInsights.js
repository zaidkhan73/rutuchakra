// Standard clinical definition, kept in sync with the ML service and predictions.
const REGULAR_RANGE = [21, 35];

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24));
}

// logs must be sorted by startDate ascending.
export function computeInsights(logs) {
  if (logs.length < 2) {
    return {
      avgCycleLength: null,
      regularityTrend: "not_enough_data",
      mostRecentStart: logs[0]?.startDate ?? null,
    };
  }

  const lengths = [];
  for (let i = 1; i < logs.length; i++) {
    lengths.push(daysBetween(logs[i - 1].startDate, logs[i].startDate));
  }

  const recentLengths = lengths.slice(-3);
  const allRegular = recentLengths.every((d) => d >= REGULAR_RANGE[0] && d <= REGULAR_RANGE[1]);
  const anyIrregular = recentLengths.some((d) => d < REGULAR_RANGE[0] || d > REGULAR_RANGE[1]);

  return {
    avgCycleLength: Math.round(lengths.reduce((a, b) => a + b, 0) / lengths.length),
    regularityTrend: allRegular ? "regular" : anyIrregular ? "irregular" : "mixed",
    mostRecentStart: logs[logs.length - 1].startDate,
  };
}