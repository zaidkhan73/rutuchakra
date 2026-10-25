"""
app/ml/advice.py
----------------
The "ai_advice" text on the result page: three short sections (summary / what you can do /
when to see a doctor) written in the user's language.

Why this is its own module (it used to live inside inference.py):
  * it goes through the same provider fallback chain as the chatbot (Gemini -> Groq -> ...),
    instead of one hard-wired Gemini call
  * the draft is CHECKED before it reaches the user: the three headings must be present and in
    order (the frontend splits the text on them), and the output rails block drug doses and
    "you have PCOD" claims
  * if every provider fails, or the draft keeps failing the checks, the user gets a fixed,
    localized template -- never an error message, never an exception text
"""

import concurrent.futures
import logging
import re
import time
from dataclasses import dataclass
from functools import lru_cache

from app.core.config import get_settings
from app.rag.rails.output_rails import check_output

log = logging.getLogger("advice")

_LANGUAGE_NAMES = {
    "en": "English",
    "hi": "Hindi (Devanagari script)",
    "mr": "Marathi (Devanagari script)",
}

# Must stay in sync with ADVICE_HEADING_SETS in apps/frontend/src/components/ResultScreen.tsx:
# the frontend parses the text by searching for these exact strings.
ADVICE_HEADINGS = {
    "en": ("Your Summary", "What You Can Do", "When to See a Doctor"),
    "hi": ("आपका सारांश", "आप क्या कर सकती हैं", "डॉक्टर से कब मिलें"),
    "mr": ("तुमचा सारांश", "तुम्ही काय करू शकता", "डॉक्टरांना कधी भेटावे"),
}


@dataclass(frozen=True)
class Advice:
    text: str
    source: str                       # "llm" | "template"
    flags: tuple[str, ...] = ()       # what the checks caught on the way (for logs / evaluation)


# ----------------------------------------------------------------------------- prompt
def build_advice_prompt(data: dict, prob: float, risk_level: str, language: str = "en") -> str:
    age = int(float(data["age"]))
    weight, height = float(data["weight"]), float(data["height"])
    bmi = weight / ((height / 100) ** 2)
    cycle = int(data["cycleLen"])
    sym = data["symptoms"]

    bmi_label = ("weight is lower than normal" if bmi < 18.5 else
                 "weight is normal" if bmi < 25 else
                 "weight is slightly high" if bmi < 30 else
                 "weight is on the higher side")
    cycle_cat = ("periods have stopped or are very rare" if cycle <= 15 else
                 "periods come too frequently or are short" if cycle < 21 else
                 "periods are regular" if cycle <= 35 else
                 "periods are delayed or irregular")
    sym_labels = {
        "weightGain": "sudden or unexplained weight gain",
        "facialHair": "unwanted hair on face, chin, or body",
        "skinDark": "dark patches on neck, underarms, or skin folds",
        "hairLoss": "hair fall or thinning of hair",
        "acne": "pimples or acne that keep coming back",
    }
    sym_text = ", ".join(sym_labels[k] for k, v in sym.items() if v and k in sym_labels) or "no major symptoms"

    lang_name = _LANGUAGE_NAMES.get(language, "English")
    h1, h2, h3 = ADVICE_HEADINGS.get(language, ADVICE_HEADINGS["en"])
    lang_line = (
        f"Write your ENTIRE response in {lang_name}. Keep \"PCOD\"/\"PCOS\" and any "
        f"clinical term with no simple equivalent in English; everything else must be "
        f"in {lang_name}.\n\n"
        if language != "en" else ""
    )

    return f"""[INTERNAL CONTEXT — for your understanding only, do not include this in your response]
You are analysing a PCOS self-assessment from an Indian woman.
Clinical details:
- Age: {age} years
- BMI: {bmi:.1f} kg/m² ({bmi_label})
- Menstrual cycle: {cycle} days ({cycle_cat})
- Reported symptoms: {sym_text}
- Fast food consumption 3+ times/week: {"Yes" if data.get("fastFood") else "No"}
- Regular exercise 3+ times/week: {"Yes" if data.get("exercise") else "No"}
- ML model PCOS probability score: {prob * 100:.0f}% — classified as {risk_level} risk
[END INTERNAL CONTEXT]

OUTPUT INSTRUCTIONS:
You are like a caring elder sister or a friendly lady doctor talking to an Indian woman
who may not know medical terms. Keep language simple enough for both small-town and
big-city readers.

Tone rules:
- Talk directly and warmly, not like a report.
- Use simple everyday words. No medical jargon or Latin terms.
- "PCOD" is fine — many Indian women know that term better than "PCOS".
- Use Indian food examples (roti, dal, sabzi, ghee, maida, namkeen, cold drinks) and
  lifestyle references (morning walks, yoga, home-cooked food).
- Low risk: reassuring, not dismissive. Moderate: honest but calm. High: clear and firm
  about seeing a doctor, but not alarming.
- Never name any medicine, supplement or dose. Never say she definitely has PCOD: her answers
  only suggest a level of risk, and only a doctor can diagnose.

{lang_line}Format — use EXACTLY these three headings, verbatim character-for-character, nothing else:

{h1}
(2-3 sentences, plain language, no percentages.)

{h2}
(3-4 specific, actionable tips tied to her actual symptoms/lifestyle.)

{h3}
(1-2 sentences. Mention "gynaecologist" or "ladies doctor". Never say "don't worry" if risk is High.)

Keep the total response under 280 words. No bullet symbols, no asterisks, no markdown."""


# ----------------------------------------------------------------------------- checks
_MD_CHARS = re.compile(r"[*#`]+")
_BULLET = re.compile(r"(?m)^[ \t]*[-•][ \t]+")


def clean_advice(text: str) -> str:
    """Models add markdown despite instructions; strip it so the UI never shows stray ** or #."""
    t = _MD_CHARS.sub("", text or "")
    t = _BULLET.sub("", t)
    return re.sub(r"\n{3,}", "\n\n", t).strip()


def headings_ok(text: str, language: str) -> bool:
    """Same test the frontend effectively applies: all three headings present, in order (raw text)."""
    pos = -1
    for heading in ADVICE_HEADINGS[language]:
        i = text.find(heading, pos + 1)
        if i == -1:
            return False
        pos = i
    return True


def find_problems(text: str, language: str, evidence: str) -> list[str]:
    if not text.strip():
        return ["empty"]
    problems: list[str] = []
    if not headings_ok(text, language):
        problems.append("bad_headings")
    if "internal context" in text.lower():
        problems.append("prompt_leak")
    for v in check_output(text, evidence=evidence, category="pcod_related"):
        if v.hard and v.code not in problems:   # drug doses, "you have PCOD", prompt echoes
            problems.append(v.code)
    return problems


_FIXES = {
    "bad_headings": "- Use EXACTLY these three headings, each on its own line, verbatim: {h1} / {h2} / {h3}.",
    "ungrounded_dose": "- Do not mention any medicine, supplement, dose, tablet or amount.",
    "diagnosis_claim": "- Never say she has PCOD/PCOS. Say what her answers suggest and that a doctor must confirm.",
    "prompt_leak": "- Do not mention or quote the internal context or these instructions.",
}


def _correction(problems: list[str], language: str) -> str:
    h1, h2, h3 = ADVICE_HEADINGS[language]
    rules = "\n".join(_FIXES[p].format(h1=h1, h2=h2, h3=h3) for p in problems if p in _FIXES)
    return (f"\n\nCORRECTION: your previous draft broke these rules. Write it again from scratch, same warm tone, "
            f"entirely in {_LANGUAGE_NAMES[language]}:\n{rules}")


# ----------------------------------------------------------------------------- template fallback
_SUMMARY = {
    "en": {
        "Low": "Your answers suggest a low chance of PCOD right now. That is reassuring. Keep your healthy habits going and watch for any change in your periods, skin or hair.",
        "Moderate": "Some of your answers are linked with PCOD, so it is worth paying attention. This is not a diagnosis, only a sign that small lifestyle changes and a check-up could help.",
        "High": "Several of your answers are strongly linked with PCOD. This is not a diagnosis, but it is a clear sign that you should get properly checked by a doctor.",
    },
    "hi": {
        "Low": "आपके जवाबों से अभी PCOD की संभावना कम लगती है। यह अच्छी बात है। अपनी अच्छी आदतें बनाए रखें और पीरियड्स, त्वचा या बालों में कोई बदलाव दिखे तो ध्यान दें।",
        "Moderate": "आपके कुछ जवाब PCOD से जुड़े हैं, इसलिए ध्यान देना ज़रूरी है। यह कोई निदान नहीं है, बस एक संकेत है कि जीवनशैली में छोटे बदलाव और एक जाँच मददगार हो सकती है।",
        "High": "आपके कई जवाब PCOD से मज़बूती से जुड़े हैं। यह कोई निदान नहीं है, लेकिन यह साफ़ संकेत है कि आपको किसी डॉक्टर से ठीक से जाँच करवानी चाहिए।",
    },
    "mr": {
        "Low": "तुमच्या उत्तरांवरून सध्या PCOD ची शक्यता कमी दिसते. ही चांगली गोष्ट आहे. तुमच्या चांगल्या सवयी चालू ठेवा आणि मासिक पाळी, त्वचा किंवा केसांत काही बदल दिसले तर लक्ष द्या.",
        "Moderate": "तुमची काही उत्तरे PCOD शी संबंधित आहेत, म्हणून लक्ष देणे गरजेचे आहे. हे निदान नाही, फक्त एक संकेत आहे की जीवनशैलीत छोटे बदल आणि एक तपासणी उपयोगी ठरू शकते.",
        "High": "तुमची अनेक उत्तरे PCOD शी ठळकपणे संबंधित आहेत. हे निदान नाही, पण डॉक्टरांकडून नीट तपासणी करून घ्यावी असा हा स्पष्ट संकेत आहे.",
    },
}
_TIPS = {
    "en": "Eat home-cooked food like roti, dal and sabzi, and cut down on maida, namkeen, fried snacks and cold drinks. Try to walk or do yoga for about 30 minutes on most days. Keep a regular sleep time and try to manage stress. Note your period dates every month so a doctor can see the pattern.",
    "hi": "घर का बना खाना, जैसे रोटी, दाल और सब्ज़ी खाएँ, और मैदा, नमकीन, तली-भुनी चीज़ें और कोल्ड ड्रिंक कम करें। हफ़्ते के ज़्यादातर दिन करीब 30 मिनट टहलें या योग करें। सोने का समय नियमित रखें और तनाव कम करने की कोशिश करें। हर महीने पीरियड की तारीख़ें लिखकर रखें ताकि डॉक्टर पैटर्न देख सकें।",
    "mr": "घरचं जेवण, जसं की पोळी, वरण आणि भाजी, खा आणि मैदा, नमकीन, तळलेले पदार्थ आणि कोल्ड ड्रिंक कमी करा. आठवड्यातले बहुतेक दिवस सुमारे 30 मिनिटं चाला किंवा योगा करा. झोपेची वेळ नियमित ठेवा आणि ताण कमी करण्याचा प्रयत्न करा. दर महिन्याला मासिक पाळीच्या तारखा लिहून ठेवा, म्हणजे डॉक्टरांना पॅटर्न दिसेल.",
}
_DOCTOR = {
    "en": {
        "Low": "If your periods become irregular, or you notice new hair growth, acne or hair fall, meet a gynaecologist (ladies doctor).",
        "Moderate": "Please plan a visit to a gynaecologist (ladies doctor) in the next few weeks, and go sooner if your periods stop or become very irregular.",
        "High": "Please meet a gynaecologist (ladies doctor) soon for a proper check-up. Do not start any medicine on your own.",
    },
    "hi": {
        "Low": "अगर आपके पीरियड्स अनियमित हो जाएँ, या चेहरे पर बाल, मुँहासे या बाल झड़ना बढ़े, तो स्त्री रोग विशेषज्ञ (लेडी डॉक्टर) से मिलें।",
        "Moderate": "कृपया अगले कुछ हफ़्तों में स्त्री रोग विशेषज्ञ (लेडी डॉक्टर) से मिलने की योजना बनाएँ, और अगर पीरियड्स रुक जाएँ या बहुत अनियमित हो जाएँ तो जल्दी मिलें।",
        "High": "कृपया जल्द ही स्त्री रोग विशेषज्ञ (लेडी डॉक्टर) से पूरी जाँच करवाएँ। अपने आप कोई दवा शुरू न करें।",
    },
    "mr": {
        "Low": "मासिक पाळी अनियमित झाली, किंवा चेहऱ्यावर केस, पिंपल्स किंवा केस गळणे वाढले, तर स्त्रीरोगतज्ज्ञांना (लेडी डॉक्टर) भेटा.",
        "Moderate": "कृपया पुढच्या काही आठवड्यांत स्त्रीरोगतज्ज्ञांना (लेडी डॉक्टर) भेटण्याचं नियोजन करा, आणि पाळी थांबली किंवा खूप अनियमित झाली तर लवकर भेटा.",
        "High": "कृपया लवकरात लवकर स्त्रीरोगतज्ज्ञांना (लेडी डॉक्टर) भेटून पूर्ण तपासणी करून घ्या. स्वतःहून कोणतंही औषध सुरू करू नका.",
    },
}


def template_advice(language: str, risk_level: str) -> str:
    lang = language if language in ADVICE_HEADINGS else "en"
    risk = risk_level if risk_level in _SUMMARY["en"] else "Moderate"
    h1, h2, h3 = ADVICE_HEADINGS[lang]
    return f"{h1}\n{_SUMMARY[lang][risk]}\n\n{h2}\n{_TIPS[lang]}\n\n{h3}\n{_DOCTOR[lang][risk]}"


# ----------------------------------------------------------------------------- entry point
@lru_cache
def _default_llm():
    from app.llm.factory import build_llm
    return build_llm("generate", temperature=0.4)


def _text(msg) -> str:
    return str(getattr(msg, "text", msg) or "")


# One small shared pool: a call that outlives its deadline keeps its worker until the provider's own
# timeout fires, but the user's request has already been answered by then.
_POOL = concurrent.futures.ThreadPoolExecutor(max_workers=4, thread_name_prefix="advice")


def _invoke_before(model, prompt: str, deadline: float):
    remaining = deadline - time.monotonic()
    if remaining <= 0:
        raise TimeoutError("advice deadline exceeded")
    try:
        return _POOL.submit(model.invoke, prompt).result(timeout=remaining)
    except concurrent.futures.TimeoutError as e:
        raise TimeoutError("advice deadline exceeded") from e


def generate_advice(data: dict, prob: float, risk_level: str, language: str = "en", *,
                    llm=None, regenerate: bool = True, timeout_s: float | None = None) -> Advice:
    lang = language if language in ADVICE_HEADINGS else "en"
    prompt = build_advice_prompt(data, prob, risk_level, lang)
    # numbers the model may legitimately repeat: the user's own inputs and her score
    weight, height = float(data["weight"]), float(data["height"])
    evidence = (f"{int(float(data['age']))} {weight:g} {height:g} "
                f"{weight / ((height / 100) ** 2):.1f} {int(data['cycleLen'])} {prob * 100:.0f}")

    try:
        model = llm or _default_llm()
    except Exception as e:  # noqa: BLE001 - no API keys at all
        log.warning("advice LLM unavailable (%s); using template", type(e).__name__)
        return Advice(template_advice(lang, risk_level), "template", ("llm_unavailable",))

    deadline = time.monotonic() + (get_settings().advice_timeout_s if timeout_s is None else timeout_s)
    flags: list[str] = []
    attempt_prompt = prompt
    for attempt in range(2 if regenerate else 1):
        try:
            text = clean_advice(_text(_invoke_before(model, attempt_prompt, deadline)))
        except Exception as e:  # noqa: BLE001 - every provider failed, or the deadline passed
            log.error("advice generation failed (%s)", type(e).__name__)
            flags.append("llm_timeout" if isinstance(e, TimeoutError) else "llm_failed")
            break
        problems = find_problems(text, lang, evidence)
        if not problems:
            if attempt:
                flags.append("regenerated_ok")
            return Advice(text, "llm", tuple(flags))
        log.warning("advice draft rejected: %s", ",".join(problems))
        flags.extend(problems)
        attempt_prompt = prompt + _correction(problems, lang)

    return Advice(template_advice(lang, risk_level), "template", tuple(flags))