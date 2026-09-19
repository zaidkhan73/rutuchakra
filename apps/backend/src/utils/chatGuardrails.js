// Rate limiting and PII redaction live here in the Node backend since they
// need direct DB access (rate check) and run right before persistence
// (redaction) -- both are naturally backend concerns, not the RAG service's.

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 8;

export async function checkRateLimit(prisma, userId) {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const recentCount = await prisma.chatMessage.count({
    where: { userId, role: "user", createdAt: { gte: since } },
  });
  return recentCount < RATE_LIMIT_MAX_REQUESTS;
}

// Redacts common PII patterns (phone numbers, emails) before a message is
// persisted long-term. Doesn't touch symptom/health content itself -- that's
// the whole point of the chat, not something to scrub.
const PHONE_RE = /\b\d{10}\b|\b\+?\d{1,3}[-.\s]?\d{3,5}[-.\s]?\d{3,5}\b/g;
const EMAIL_RE = /\b[\w.-]+@[\w.-]+\.\w+\b/g;

export function redactPII(text) {
  return text.replace(EMAIL_RE, "[email removed]").replace(PHONE_RE, "[phone removed]");
}