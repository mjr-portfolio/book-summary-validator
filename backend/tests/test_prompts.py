from app.prompts import (
    EXTRACT_TEXT_PROMPT,
    build_book_lookup_prompt,
    build_compare_prompt,
    build_grade_answers_prompt,
    build_section_filter_prompt,
    build_study_questions_prompt,
)


def test_build_compare_prompt_includes_source_and_summary() -> None:
    prompt = build_compare_prompt("Chapter one text.", "My short summary.")

    assert "Chapter one text." in prompt
    assert "My short summary." in prompt
    assert "match_percentage" in prompt
    assert "critique" in prompt


def test_extract_text_prompt_is_literal_extraction_instruction() -> None:
    assert "Extract all visible text" in EXTRACT_TEXT_PROMPT
    assert "zero conversational commentary" in EXTRACT_TEXT_PROMPT


def test_build_book_lookup_prompt_includes_title_author_and_section() -> None:
    prompt = build_book_lookup_prompt(
        "Pride and Prejudice",
        "Jane Austen",
        "Chapter 3",
    )

    assert "Pride and Prejudice" in prompt
    assert "Jane Austen" in prompt
    assert "Chapter 3" in prompt


def test_build_book_lookup_prompt_ignores_page_numbers() -> None:
    prompt = build_book_lookup_prompt("1984", "George Orwell", "Part 1 Section 2")

    assert "IGNORE all physical page numbers" in prompt
    assert "page-based lookup is unsupported" in prompt
    assert "structural divider" in prompt


def test_build_section_filter_prompt_includes_section_and_scraped_text() -> None:
    prompt = build_section_filter_prompt(
        "Full scraped page with Introduction and Conclusion.",
        "Introduction",
    )

    assert "Introduction" in prompt
    assert "Full scraped page with Introduction and Conclusion." in prompt
    assert "isolate and return ONLY the literal text" in prompt
    assert "Do not include any other parts of the page" in prompt


def test_build_study_questions_prompt_remedial_focuses_on_critique_gaps() -> None:
    prompt = build_study_questions_prompt(
        "Source chapter text.",
        "Missed the climax and character motivation.",
        "remedial",
        "professional",
        ["Old question about setting?"],
    )

    assert "REMEDIAL MODE" in prompt
    assert "Ignore the difficulty parameter" in prompt
    assert "Missed the climax and character motivation." in prompt
    assert "Source chapter text." in prompt
    assert "Old question about setting?" in prompt
    assert "Never repeat or closely rephrase" in prompt


def test_build_study_questions_prompt_mastery_scales_difficulty() -> None:
    standard = build_study_questions_prompt(
        "Source",
        "Strong summary.",
        "mastery",
        "standard",
    )
    advanced = build_study_questions_prompt(
        "Source",
        "Strong summary.",
        "mastery",
        "advanced",
    )
    professional = build_study_questions_prompt(
        "Source",
        "Strong summary.",
        "mastery",
        "professional",
    )

    assert "general facts" in standard
    assert "deep critical thinking" in advanced
    assert "executive synthesis" in professional
    assert "(none)" in standard


def test_build_grade_answers_prompt_includes_qa_pairs() -> None:
    prompt = build_grade_answers_prompt(
        "Source text.",
        ["What happened?", "Why?", "How?"],
        ["Event A", "Reason B", "Method C"],
    )

    assert "Source text." in prompt
    assert "Q1: What happened?" in prompt
    assert "A1: Event A" in prompt
    assert "is_correct" in prompt
    assert "hint" in prompt
