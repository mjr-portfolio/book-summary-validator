from app.prompts import EXTRACT_TEXT_PROMPT, build_book_lookup_prompt, build_compare_prompt


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
