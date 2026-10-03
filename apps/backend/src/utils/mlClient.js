const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const RETRY_STATUS = new Set([429, 502, 503, 504]);

export async function callML(path, payload, { retries = 3, timeoutMs = 65000 } = {}) {
  let res;
  for (let attempt = 0; attempt <= retries; attempt++) {
    res = await fetch(`${process.env.ML_SERVICE_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "User-Agent": "RutuChakra-Backend/1.0",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!RETRY_STATUS.has(res.status) || attempt === retries) return res;
    await res.text().catch(() => {}); // body drain karo
    const wait = 1500 * 2 ** attempt + Math.random() * 500; // ~1.5s, 3s, 6s
    console.warn(`ML ${path} returned ${res.status}, retry ${attempt + 1}/${retries} in ${Math.round(wait)}ms`);
    await sleep(wait);
  }
  return res;
}