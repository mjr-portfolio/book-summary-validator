from app.prompts import EXTRACT_TEXT_PROMPT, build_compare_prompt


def test_build_compare_prompt_includes_source_and_summary() -> None:
    prompt = build_compare_prompt("Chapter one text.", "My short summary.")

    assert "Chapter one text." in prompt
    assert "My short summary." in prompt
    assert "match_percentage" in prompt
    assert "critique" in prompt


def test_extract_text_prompt_is_literal_extraction_instruction() -> None:
    assert "Extract all visible text" in EXTRACT_TEXT_PROMPT
    assert "zero conversational commentary" in EXTRACT_TEXT_PROMPT
