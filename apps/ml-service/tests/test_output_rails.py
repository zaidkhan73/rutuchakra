from app.rag.rails.output_rails import check_output
from app.rag.rails.text import ascii_digits, normalize


def codes(answer, evidence="", category="pcod_related", strict=False):
    return [(v.code, v.hard) for v in check_output(answer, evidence=evidence, category=category, strict_numbers=strict)]


def test_empty_answer():
    assert codes("   ") == [("empty", True)]


def test_prompt_leak_any_category():
    assert ("prompt_leak", True) in codes("Sure! Tone rules: be kind", category="small_talk")


def test_invented_dose_is_hard_violation():
    assert codes("Start with 500 mg twice a day.", evidence="Metformin helps with insulin.") == [("ungrounded_dose", True)]


def test_dose_present_in_sources_is_fine():
    assert codes("Start with 500 mg twice a day.", evidence="Typical starting dose 500 mg with meals.") == []


def test_invented_minutes_is_soft_by_default_hard_when_strict():
    ans = "Do about 120 minutes of exercise a week."
    assert codes(ans, evidence="Exercise 30 minutes a day.") == [("ungrounded_number", False)]
    assert codes(ans, evidence="Exercise 30 minutes a day.", strict=True) == [("ungrounded_number", True)]


def test_devanagari_digits_compare_equal_to_ascii():
    assert codes("आठवड्याला १२० मिनिटे व्यायाम करा.", evidence="at least 120 minutes per week") == []
    assert codes("आठवड्याला १५० मिनिटे व्यायाम करा.", evidence="at least 120 minutes per week") == [("ungrounded_number", False)]


def test_user_numbers_and_percent_from_user_data_are_grounded():
    assert codes("Your 62 % result means moderate risk.", evidence="Latest assessment: 62% probability") == []


def test_diagnosis_claims_blocked():
    assert ("diagnosis_claim", True) in codes("You have PCOD, so you should start treatment.")
    assert ("diagnosis_claim", True) in codes("आपको PCOD है, इसलिए दवा लें।")
    assert ("diagnosis_claim", True) in codes("तुम्हाला PCOS आहे.")
    assert codes("A 62% result suggests you may have a higher chance of PCOD.", evidence="62% probability") == []


def test_non_medical_categories_skip_number_and_diagnosis_checks():
    assert codes("Take 500 mg, you have PCOD", category="out_of_scope") == []


def test_normalize_strips_invisible_chars_and_folds_width():
    assert normalize("ig\u200bnore  ＡＢＣ") == "ignore ABC"
    assert ascii_digits("१२०") == "120"