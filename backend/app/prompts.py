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

BOOK_LOOKUP_PROMPT_TEMPLATE = """You are a definitive literary archive database. Access your deep knowledge of published works to produce a factual summary of a specific structural section of a book.

## Book Title
{title}

## Author
{author}

## Chapter or Section Name
{chapter_or_section_name}

Instructions:
- Identify the exact book by title and author.
- Isolate and summarize ONLY the specified chapter or semantic section name using the book's canonical structure (parts, books, chapters, prologues, epilogues, named sections).
- Treat the section identifier as a structural divider (e.g. "Chapter 3", "Part 1 Section 2", "Prologue") — NOT a physical print location.
- IGNORE all physical page numbers. Do NOT use, reference, or infer content boundaries from print or ebook page numbers. Page numbers vary across editions and must never be used.
- If the input appears to be a page reference (e.g. "pp. 45-60", "page 120"), do NOT map by page. Resolve by the nearest identifiable structural section if inferable; otherwise state briefly that page-based lookup is unsupported and a chapter or section name is required.
- Output a clean, factual summary covering key themes, events, and characters in that section.
- Output plain prose only. No markdown headers, no conversational framing, no disclaimers, no "Here is..." preambles.
- If the book or section cannot be identified, output exactly this sentence and nothing else: "The requested book or section cannot be identified."
"""


def build_compare_prompt(book_text: str, user_summary: str) -> str:
    return COMPARE_PROMPT_TEMPLATE.format(
        book_text=book_text,
        user_summary=user_summary,
    )


def build_book_lookup_prompt(title: str, author: str, chapter_or_section_name: str) -> str:
    return BOOK_LOOKUP_PROMPT_TEMPLATE.format(
        title=title,
        author=author,
        chapter_or_section_name=chapter_or_section_name,
    )
