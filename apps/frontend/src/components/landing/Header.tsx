import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, useScroll, useTransform } from "framer-motion";
import LanguageSwitcher from "../shell/LanguageSwitcher";

const NAV_LINK_IDS = ["howItWorks", "explainableAI", "privacy"] as const;

const NAV_HREFS: Record<(typeof NAV_LINK_IDS)[number], string> = {
  howItWorks: "#how-it-works",
  explainableAI: "#explainable-ai",
  privacy: "#privacy",
};

export default function Header() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { scrollY } = useScroll();
  const bgOpacity = useTransform(scrollY, [0, 120], [0.5, 0.95]);
  const shadowOpacity = useTransform(scrollY, [0, 120], [0, 0.08]);

  return (
    <motion.header
      style={{
        backgroundColor: useTransform(
          bgOpacity,
          (v) => `oklch(97% 0.014 30 / ${v})`,
        ),
        boxShadow: useTransform(
          shadowOpacity,
          (v) => `0 8px 24px -12px oklch(52% 0.15 15 / ${v})`,
        ),
      }}
      className="navbar backdrop-blur-sm border-b border-base-300 px-4 sm:px-8 sticky top-0 z-40"
    >
      <div className="flex-1">
        <span className="font-display text-lg font-semibold italic text-primary">
          RutuChakra
        </span>
      </div>

      <nav className="hidden md:flex items-center gap-6 mr-6">
        {NAV_LINK_IDS.map((id) => (
          <a
            key={id}
            href={NAV_HREFS[id]}
            className="text-sm text-base-content/70 hover:text-base-content transition-colors"
          >
            {t(`nav.${id}`)}
          </a>
        ))}
      </nav>

      <div className="flex items-center gap-3">
        <LanguageSwitcher />

        <button
          onClick={() => navigate("/login")}
          className="btn btn-primary btn-sm rounded-full"
        >
          {t("nav.login")}
        </button>
      </div>
    </motion.header>
  );
}
