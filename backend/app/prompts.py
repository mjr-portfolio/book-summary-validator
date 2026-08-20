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

SECTION_FILTER_PROMPT_TEMPLATE = """From the following scraped webpage text, isolate and return ONLY the literal text contained within the section or chapter titled '{section_filter}'. Do not include any other parts of the page, layout headers, or conversational commentary.

## Scraped Webpage Text
{scraped_text}
"""

STUDY_QUESTIONS_PROMPT_TEMPLATE = """You are an expert study coach generating exactly 3 targeted quiz questions.

Mode: {quiz_type}
Difficulty: {difficulty}

## Instructions
{mode_instructions}

## Exclusion Rules
Never repeat or closely rephrase any question found in the exclusion history below.
Generate entirely new questions that are distinct in wording and focus.

## Exclusion History
{exclusion_history}

## Source Text
{source_text}

## Critique
{critique}

Respond with a JSON object containing:
- "questions": an array of exactly 3 objects, each with a "question" string
"""

GRADE_ANSWERS_PROMPT_TEMPLATE = """You are an expert tutor grading a student's free-text quiz answers against the source text.

Grade semantically — focus on whether the answer captures the correct concepts, not exact wording.
For each question/answer pair, return:
- "is_correct": true if the answer is substantially correct, otherwise false
- "feedback": a brief 1-2 sentence evaluation of the answer
- "hint": a helpful hint toward the correct idea (especially useful when incorrect)

## Source Text
{source_text}

## Questions and Answers
{qa_pairs}

Respond with a JSON object containing:
- "results": an array of exactly 3 objects with "is_correct", "feedback", and "hint"
- "correct_count": an integer from 0 to 3 equal to how many answers are correct
"""

_REMEDIAL_MODE_INSTRUCTIONS = (
    "REMEDIAL MODE: Focus questions strictly on the concepts the critique says the user missed. "
    "Ignore the difficulty parameter. Target weak points only — do not quiz on already-mastered material."
)

_MASTERY_DIFFICULTY_INSTRUCTIONS = {
    "standard": (
        "MASTERY MODE (Standard): Generate questions covering the entire source text. "
        "Test general facts and straightforward recall of key points."
    ),
    "advanced": (
        "MASTERY MODE (Advanced): Generate questions covering the entire source text. "
        "Force deep critical thinking — analysis, comparison, and inference beyond surface facts."
    ),
    "professional": (
        "MASTERY MODE (Professional): Generate questions covering the entire source text. "
        "Require high-level executive synthesis or domain application of the material."
    ),
}


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


def build_section_filter_prompt(scraped_text: str, section_filter: str) -> str:
    return SECTION_FILTER_PROMPT_TEMPLATE.format(
        scraped_text=scraped_text,
        section_filter=section_filter,
    )


def build_study_questions_prompt(
    source_text: str,
    critique: str,
    quiz_type: str,
    difficulty: str,
    exclusion_history: list[str] | None = None,
) -> str:
    history = exclusion_history or []
    if quiz_type == "remedial":
        mode_instructions = _REMEDIAL_MODE_INSTRUCTIONS
    else:
        mode_instructions = _MASTERY_DIFFICULTY_INSTRUCTIONS.get(
            difficulty,
            _MASTERY_DIFFICULTY_INSTRUCTIONS["standard"],
        )

    if history:
        exclusion_block = "\n".join(f"- {item}" for item in history)
    else:
        exclusion_block = "(none)"

    return STUDY_QUESTIONS_PROMPT_TEMPLATE.format(
        quiz_type=quiz_type,
        difficulty=difficulty,
        mode_instructions=mode_instructions,
        exclusion_history=exclusion_block,
        source_text=source_text,
        critique=critique,
    )


def build_grade_answers_prompt(
    source_text: str,
    questions: list[str],
    answers: list[str],
) -> str:
    qa_pairs = "\n\n".join(
        f"Q{i + 1}: {question}\nA{i + 1}: {answer}"
        for i, (question, answer) in enumerate(zip(questions, answers, strict=True))
    )
    return GRADE_ANSWERS_PROMPT_TEMPLATE.format(
        source_text=source_text,
        qa_pairs=qa_pairs,
    )
