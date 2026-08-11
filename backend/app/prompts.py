COMPARE_PROMPT_TEMPLATE = """You are an expert literary analyst. Compare the user's summary against the book source text below.

Evaluate how well the summary captures the key concepts, themes, plot points, and structural elements of the source text. Focus on semantic meaning, not exact wording.

Respond with a JSON object containing:
- "match_percentage": a number from 0 to 100 representing conceptual alignment
- "critique": a brief 2-3 sentence structural critique explaining strengths and gaps

## Book Source Text
{book_text}

## User Summary
{user_summary}
"""

EXTRACT_TEXT_PROMPT = (
    "Extract all visible text from this image literally. "
    "Output only the raw text with zero conversational commentary."
)


def build_compare_prompt(book_text: str, user_summary: str) -> str:
    return COMPARE_PROMPT_TEMPLATE.format(
        book_text=book_text,
        user_summary=user_summary,
    )
