import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/react";
import { useTranslation } from "react-i18next";
import ResultScreen from "../components/ResultScreen";
import { fetchPredictionById } from "../utils/pcos";
import { ArrowLeftIcon } from "../components/icons";
import type { HistoricalPrediction } from "../utils/pcos";

export default function HistoricalResult() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const [prediction, setPrediction] = useState<HistoricalPrediction | null>(
    null,
  );
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    fetchPredictionById(id, getToken)
      .then(setPrediction)
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : t("historicalResult.errors.loadFailed"),
        ),
      );
  }, [id]);

  return (
    <div className="min-h-screen bg-base-100 px-4 py-10 flex flex-col items-center">
      <div className="w-full max-w-[560px]">
        <button
          type="button"
          onClick={() => navigate("/history")}
          className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-all mb-6"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          {t("historicalResult.backToHistory")}
        </button>

        {error && (
          <div className="alert alert-error bg-error/10 border-error/30 text-error">
            <span>{error}</span>
          </div>
        )}

        {!prediction && !error && (
          <div className="space-y-4">
            <div className="skeleton h-44 w-44 rounded-full mx-auto" />
            <div className="skeleton h-24 w-full rounded-xl" />
            <div className="skeleton h-32 w-full rounded-xl" />
          </div>
        )}

        {prediction && (
          <div className="card bg-base-100 shadow-warm p-6 sm:p-8">
            <ResultScreen
              result={prediction}
              viewedAt={prediction.createdAt}
              onRestart={() => navigate("/predict")}
            />
          </div>
        )}
      </div>
    </div>
  );
}