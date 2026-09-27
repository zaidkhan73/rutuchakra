import { useTranslation } from "react-i18next";
import type { PredictionResult } from "../utils/pcos";
import { localeTag } from "../utils/date";
import { ProbabilityRing } from "./ProbabilityRing";

const RISK_STYLES = {
  Low: { badge: "badge-success", text: "text-success" },
  Moderate: { badge: "badge-warning", text: "text-warning" },
  High: { badge: "badge-error", text: "text-error" },
} as const;

// One heading set per language Gemini might have answered in. A historical
// record can be in a different language than the current UI, so every set
// is tried and whichever one actually matches the text wins.
const ADVICE_HEADING_SETS: string[][] = [
  ["Your Summary", "What You Can Do", "When to See a Doctor"],
  ["आपका सारांश", "आप क्या कर सकती हैं", "डॉक्टर से कब मिलें"],
  ["तुमचा सारांश", "तुम्ही काय करू शकता", "डॉक्टरांना कधी भेटावे"],
];

function parseAdvice(text: string) {
  for (const headings of ADVICE_HEADING_SETS) {
    const sections: { heading: string; body: string }[] = [];
    let remaining = text;
    for (let i = 0; i < headings.length; i++) {
      const heading = headings[i];
      const nextHeading = headings[i + 1];
      const start = remaining.indexOf(heading);
      if (start === -1) continue;
      const afterHeading = start + heading.length;
      const end = nextHeading
        ? remaining.indexOf(nextHeading, afterHeading)
        : remaining.length;
      const body = remaining
        .slice(afterHeading, end === -1 ? undefined : end)
        .trim();
      sections.push({ heading, body });
    }
    if (sections.length > 0) return sections;
  }
  return null;
}

export default function ResultScreen({
  result,
  onRestart,
  onAskAssistant,
  viewedAt,
}: {
  result: PredictionResult;
  onRestart: () => void;
  onAskAssistant?: () => void;
  viewedAt?: string;
}) {
  const { t } = useTranslation();
  const styles = RISK_STYLES[result.risk_level];
  const adviceSections = parseAdvice(result.ai_advice);
  const riskKey = result.risk_level.toLowerCase() as
    | "low"
    | "moderate"
    | "high";

  return (
    <div className="animate-fade-up">
      <div className="text-center mb-6">
        {viewedAt && (
          <p className="text-xs text-base-content/60 mb-4 text-center">
            {t("result.viewedOn", {
              date: new Date(viewedAt).toLocaleString(localeTag(), {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              }),
            })}
          </p>
        )}
        <span className={`badge ${styles.badge} badge-lg mb-4`}>
          {t(`riskLevels.${riskKey}`)} {t("result.riskSuffix")}
        </span>
        <ProbabilityRing probability={result.probability} risk={result.risk_level} size="lg" />
      </div>

      <div className="border-l-4 border-primary/40 pl-4 mb-6">
        <p className="font-display italic text-lg text-base-content">
          {t(`resultAdvice.${riskKey}`)}
        </p>
      </div>

      {result.top_factors.length > 0 && (
        <div className="mb-6">
          <h3 className="kicker mb-3">{t("result.whatInfluenced")}</h3>
          <div className="space-y-3">
            {result.top_factors.map((f) => (
              <div key={f.factor}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-base-content/80">
                    {t(`resultFactors.${f.factor}`, { defaultValue: f.factor })}
                  </span>
                  <span
                    className={
                      f.impact === "increases" ? "text-error" : "text-success"
                    }
                  >
                    {f.impact === "increases" ? "↑" : "↓"}
                  </span>
                </div>
                <progress
                  className={`progress w-full ${f.impact === "increases" ? "progress-error" : "progress-success"}`}
                  value={f.weight * 100}
                  max={100}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mb-6">
        <h3 className="kicker mb-3">{t("result.personalisedGuidance")}</h3>
        {adviceSections ? (
          <div className="space-y-4">
            {adviceSections.map((s) => (
              <div key={s.heading}>
                <p className="text-sm font-semibold text-primary">
                  {s.heading}
                </p>
                <p className="text-sm text-base-content/80 mt-1 whitespace-pre-line">
                  {s.body}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-base-content/80 whitespace-pre-line">
            {result.ai_advice}
          </p>
        )}
      </div>

      <div className="alert bg-base-200 border-base-300 text-xs text-base-content/60 mb-6">
        <span>{t("result.disclaimer")}</span>
      </div>

      {onAskAssistant && (
        <button
          type="button"
          onClick={onAskAssistant}
          className="btn btn-secondary w-full rounded-full mb-3"
        >
          {t("result.askAssistantButton")}
        </button>
      )}

      <button
        type="button"
        onClick={onRestart}
        className="btn btn-outline w-full rounded-full"
      >
        {t("result.retakeButton")}
      </button>
    </div>
  );
}