# Dictionary

## 1. Purpose

This document defines how the game determines whether a Swedish word is a normal valid word.

The dictionary system has two purposes:

1. Determine whether a newly formed word is normally accepted.
2. Provide the information required for the game's special non-dictionary-word approval mechanic.

The dictionary system must remain separate from the board and scoring logic.

---

## 2. Core principle

A word can be in one of three broad categories:

1. **Normally accepted** — the dictionary/rules recognize it.
2. **Unknown but potentially playable** — the word is not recognized by the dictionary but may be proposed to the opponent.
3. **Forbidden** — the word is explicitly excluded by the game's rules and cannot be rescued through opponent approval.

The distinction is important.

The custom approval mechanic is intended to let players decide whether an unusual or missing word should be accepted. It is not intended to let players bypass fundamental word restrictions.

---

## 3. Initial language

Version 1 supports:

> Swedish

The dictionary implementation must therefore use a Swedish word list.

The architecture should nevertheless expose a language-independent interface so that English and other languages can be added later.

For example:

```text
Dictionary
    isWord(word)
```

The engine should not contain Swedish-specific dictionary lookups.

---

## 4. Dictionary source

The exact dictionary source must be selected and documented before implementation.

The selected source should ideally:

- Be Swedish.
- Have a clear license permitting use in the project.
- Be available in a format that can be packaged with the game.
- Be reasonably comprehensive.
- Be maintainable.
- Avoid requiring a third-party web API for every word lookup.
- Support deterministic offline validation.

The initial version should preferably use a local/static word list rather than depending on an external API.

This is important because:

- The game should work without an internet connection in local mode.
- Word validation should be fast.
- Tests should be deterministic.
- The future online server should not depend on an external dictionary service.

The final dictionary source and license must be recorded in the project's documentation before the dictionary is committed to the repository.

---

# 5. Dictionary versus word rules

A dictionary should not be treated as the complete definition of legal words.

There are two separate concepts:

```text
Dictionary
    ↓
Does this word exist in the selected word list?

Game word rules
    ↓
Is this category of word permitted by Alfapet rules?
```

The engine should combine these results.

For example:

```text
Dictionary says:
    "STOCKHOLM" exists

Game rules say:
    geographical proper names are not allowed

Result:
    FORBIDDEN_WORD
```

The dictionary therefore provides lexical information, while the game rules provide gameplay policy.

---

# 6. Normalization

Words must be normalized before lookup.

Normalization should be deterministic and shared by:

- Dictionary lookup
- Accepted-vocabulary lookup
- Word comparison
- Move history

The normalization process should at minimum define:

- Letter casing
- Whitespace handling
- Unicode normalization
- Representation of Swedish characters

A sensible canonical representation is uppercase Swedish text without surrounding whitespace.

For example:

```text
"skog"      → "SKOG"
" Skog "    → "SKOG"
"SKOG"      → "SKOG"
```

Swedish letters must remain distinct:

```text
Å ≠ A
Ä ≠ A
Ö ≠ O
```

The implementation must not use ASCII-only normalization that silently converts Swedish characters into other letters.

---

# 7. Unicode

The dictionary system must use Unicode correctly.

Swedish letters:

```text
Å
Ä
Ö
```

are first-class letters.

The implementation must not assume that all letters can be represented using ASCII.

The dictionary file, source code, tests, and UI must use UTF-8.

Normalization should use a well-defined Unicode normalization form where appropriate.

---

# 8. Case handling

Dictionary lookup is case-insensitive.

The canonical form should use uppercase.

For example:

```text
skog
Skog
SKOG
```

all normalize to:

```text
SKOG
```

The board should display letters according to the game's UI convention, but dictionary validation should operate on the canonical representation.

---

# 9. Minimum word length

One-letter words are not valid.

This rule should be enforced independently of the dictionary.

For example:

```text
A
I
```

must not become valid merely because a word list happens to contain them.

The engine should classify a one-letter result as a forbidden word.

---

# 10. Proper names

Personal names are not allowed as normal words.

Examples of categories that should be rejected include:

- First names
- Surnames
- Other personal names

The fact that a name appears in a general-purpose word list does not automatically make it valid.

Where the selected dictionary contains proper-name metadata, this information should be used.

If it does not, the project may need an explicit exclusion list.

---

# 11. Geographical names

Names of places are not allowed as normal words.

This includes categories such as:

- Cities
- Towns
- Villages
- Countries' geographical place names where they are proper names
- Regions
- Mountains
- Rivers
- Lakes
- Islands
- Streets and similar named locations

The explicit country exception is described below.

As with personal names, the dictionary source may contain geographical names. Their presence in the source does not automatically make them legal.

---

# 12. Countries

Countries are explicitly allowed.

Examples:

```text
SVERIGE
NORGE
SPANIEN
FRANKRIKE
```

should be treated as valid words where they are represented in the selected Swedish dictionary.

This is a deliberate game rule exception to the general restriction on geographical/proper names.

The implementation should represent this policy explicitly rather than relying on accidental dictionary behaviour.

---

# 13. Months

Months are allowed.

Examples include:

```text
JANUARI
FEBRUARI
MARS
APRIL
MAJ
JUNI
JULI
AUGUSTI
SEPTEMBER
OKTOBER
NOVEMBER
DECEMBER
```

They should be accepted when correctly formed.

---

# 14. Weekdays

Weekdays are allowed.

Examples include:

```text
MÅNDAG
TISDAG
ONSDAG
TORSDAG
FREDAG
LÖRDAG
SÖNDAG
```

They should be accepted when correctly formed.

---

# 15. Abbreviations

Abbreviations are generally not allowed.

Examples of forms that should normally be rejected include abbreviated expressions that are not ordinary words.

The implementation should not attempt to infer whether an abbreviation "looks reasonable."

Instead:

- Normal dictionary words are accepted.
- Known forbidden abbreviations are rejected.
- An explicit exception list may contain abbreviations that the project decides should be treated as ordinary playable words.

The exception list must be data/configuration rather than hard-coded throughout the engine.

---

# 16. Abbreviation exceptions

The game may maintain an explicit list of accepted abbreviations.

Conceptually:

```text
allowedAbbreviations = Set<string>
```

The list should initially be empty unless specific exceptions are identified.

Every exception should have a reason documented in the data/configuration.

Do not add abbreviations simply because they are common in everyday Swedish.

The project should make these decisions deliberately.

---

# 17. Grammatical forms

Normal Swedish grammatical forms are allowed.

This includes, where recognized as valid by the selected dictionary:

- Plural forms
- Definite forms
- Inflected nouns
- Verb conjugations
- Participles
- Adjectival forms
- Other ordinary inflections

The game does not require a player to use only dictionary headwords.

For example, if the dictionary recognizes the relevant inflected form, it should be accepted.

---

# 18. Verb conjugations

Different verb forms are allowed.

The dictionary should therefore be capable of recognizing ordinary Swedish forms such as:

```text
INFINITIVE
PRESENT
PAST
SUPINE
IMPERATIVE
```

where they are valid Swedish words.

The game should not attempt to generate verb forms itself in Version 1.

The dictionary remains the source of lexical validity.

---

# 19. Plurals

Plural forms are allowed when they are valid Swedish forms and recognized by the selected word source.

The game should not impose a separate restriction on pluralization.

---

# 20. Inflected forms

Other ordinary inflections should be treated in the same manner.

Examples include:

- Case-like inflections where relevant
- Definite/indefinite forms
- Gender/number agreement
- Comparative/superlative adjective forms
- Verb tense forms

The game should not attempt to implement Swedish grammar as a separate natural-language system.

The purpose of the dictionary is simply to determine whether the resulting word is accepted.

---

# 21. Unknown words

If a word:

- Is physically formed correctly,
- Is at least two letters long,
- Is not explicitly forbidden,
- And is not found in the dictionary or accepted vocabulary,

then it should be classified as:

```text
UNKNOWN_WORD
```

This is the category that can trigger the custom opponent-approval mechanic.

The game should inform the current player that the word is not in the dictionary.

---

# 22. Unknown does not mean illegal

The distinction between:

```text
UNKNOWN_WORD
```

and:

```text
FORBIDDEN_WORD
```

must be preserved.

An unknown word is potentially playable.

A forbidden word is not.

For example:

```text
Dictionary does not contain:
    GRÖMP

Result:
    UNKNOWN_WORD
    → opponent approval possible
```

Whereas:

```text
One-letter word:
    A

Result:
    FORBIDDEN_WORD
    → opponent approval not possible
```

Similarly, a prohibited proper name should not become playable merely because the opponent accepts it.

---

# 23. Accepted vocabulary

Every game has its own accepted vocabulary.

Conceptually:

```text
acceptedVocabulary: Set<string>
```

If an unknown word is accepted by the opponent, its normalized form is added to this set.

For example:

```text
acceptedVocabulary = {}

GRÖMP is proposed
Opponent accepts

acceptedVocabulary = {
    "GRÖMP"
}
```

The word is then considered valid for the rest of that game.

---

# 24. Accepted words do not modify the dictionary

An accepted in-game word must never modify the global dictionary.

The distinction is:

```text
Global dictionary
    = stable project data

Accepted vocabulary
    = temporary game-specific state
```

Starting a new game creates a new empty accepted vocabulary.

This prevents one player's decision in one game from changing every future game.

---

# 25. Reuse of accepted words

Once an unknown word has been accepted, it may be used again during the same game.

The second occurrence should not require another approval.

For example:

```text
Turn 4:
    GRÖMP proposed
    Opponent accepts

Turn 11:
    GRÖMP played again

Result:
    Normally accepted
```

The word should nevertheless still be checked against all physical board-placement rules.

---

# 26. Accepted words and crossing words

An accepted unknown word may later participate in another move.

For example:

```text
Turn 4:
    GRÖMP accepted

Turn 8:
    A new word crosses GRÖMP
```

The newly formed crossing word must itself be validated.

The fact that GRÖMP is accepted does not automatically make every word that can be formed from its letters valid.

Only the exact accepted word is added to the accepted vocabulary.

---

# 27. Dictionary lookup interface

The core engine should depend on an abstract interface.

Conceptually:

```ts
interface Dictionary {
  isWord(word: string): boolean
}
```

The implementation may additionally expose metadata if useful:

```ts
interface DictionaryEntry {
  word: string
  category?: string
}
```

However, the game engine should not require a specific file format or third-party dictionary library.

---

# 28. Word validation service

A higher-level word validation service should combine dictionary and game-rule information.

Conceptually:

```text
validateWord(word, context)
    ↓
normalize
    ↓
minimum-length check
    ↓
forbidden-category check
    ↓
accepted-vocabulary check
    ↓
dictionary lookup
    ↓
WordValidationResult
```

Possible results:

```text
DICTIONARY_WORD
ACCEPTED_IN_GAME
UNKNOWN_WORD
FORBIDDEN_WORD
```

The exact implementation may use richer result types.

---

# 29. Validation context

Word validation may need access to:

```text
ValidationContext
├── dictionary
├── acceptedVocabulary
├── wordRules
└── language
```

The validation function should not need access to the entire UI or game application.

If additional context is required later, it should be added explicitly.

---

# 30. Data ownership

Different information should have clear ownership.

### Dictionary data

Owned by the language/dictionary configuration.

### Forbidden-word rules

Owned by the game rules configuration.

### Allowed exceptions

Owned by explicit configuration/data.

### Accepted unknown words

Owned by individual `GameState`.

This prevents accidental mixing of permanent and temporary data.

---

# 31. Dictionary preprocessing

If the chosen dictionary is large, it should be preprocessed into a fast lookup representation.

Possible approaches include:

- Hash/set lookup
- Generated JSON data
- Generated compact binary data
- Trie
- Other appropriate static lookup structure

The initial implementation should prioritize simplicity and maintainability.

A standard set/hash lookup is likely sufficient unless profiling demonstrates otherwise.

Do not introduce a complex search structure prematurely.

---

# 32. Dictionary updates

The dictionary should be treated as versioned project data.

If the word list is updated:

- Record the source/version.
- Record the date of the update.
- Re-run dictionary-related tests.
- Check whether important gameplay behaviour changed.

A dictionary update may technically change which words are considered normal words, so it should be treated as a meaningful game-data change.

---

# 33. Licensing

The dictionary source must have a license compatible with the intended project.

Before including a word list in the repository, document:

- Source
- Version
- License
- Attribution requirements
- Any transformation performed on the source

Do not copy a word list into the repository merely because it is publicly downloadable.

The project must respect its license.

---

# 34. Testing the dictionary

Dictionary tests should include:

### Normal words

```text
SKOG
HUS
BIL
MÅNE
```

### Swedish characters

```text
Å
Ä
Ö
```

inside otherwise valid words.

### Case

```text
skog
Skog
SKOG
```

must behave identically.

### Grammatical forms

Representative valid:

- Plurals
- Verb conjugations
- Inflections

### Allowed categories

Representative:

- Country
- Month
- Weekday

### Forbidden categories

Representative:

- Personal name
- Place name
- Abbreviation

### Unknown words

A deliberately invented test word should be classified as unknown rather than forbidden if it is not otherwise excluded.

### Accepted vocabulary

A test should verify:

```text
unknown word
    → accepted in game
    → valid later in same game
    → not valid automatically in a new game
```

---

# 35. Dictionary tests must not depend on the live internet

Tests should use the exact dictionary data bundled/configured for the project.

Do not call an online dictionary API during automated tests.

This ensures:

- Deterministic results
- Fast tests
- Offline development
- Reproducibility

---

# 36. User-facing explanation

The dictionary system should provide structured reasons rather than directly generating UI text.

For example:

```text
UNKNOWN_WORD
```

can be presented by the UI as:

> "GRÖMP finns inte i ordlistan. Vill du ändå spela ordet?"

A forbidden word can produce:

> "Detta ord är inte tillåtet."

The engine should return a message key and relevant word data rather than hard-coded presentation text.

---

# 37. Multiple words in one move

Dictionary validation must operate on every newly formed word.

For example:

```text
Main word:
    GRÖMP

Crossing word:
    HUS
```

If:

```text
GRÖMP = UNKNOWN_WORD
HUS   = DICTIONARY_WORD
```

the move is eligible for the unknown-word approval flow.

If:

```text
GRÖMP = FORBIDDEN_WORD
HUS   = DICTIONARY_WORD
```

the move is rejected.

If:

```text
GRÖMP = UNKNOWN_WORD
XYZ   = UNKNOWN_WORD
```

the opponent approves or rejects the complete move as one unit.

---

# 38. Normalization and accepted vocabulary

Accepted vocabulary must use exactly the same normalization function as dictionary lookup.

For example:

```text
normalize("grömP") → "GRÖMP"
```

The accepted vocabulary should store:

```text
"GRÖMP"
```

not the original casing supplied by the UI.

This prevents duplicate logical words caused by different capitalization.

---

# 39. Future language support

The dictionary architecture should eventually support:

```text
SwedishDictionary
EnglishDictionary
...
```

without changing the game engine's basic word-validation flow.

Language-specific differences should be represented through configuration or language-specific implementations.

Potential future configuration could include:

```text
LanguageDefinition
├── languageCode
├── dictionary
├── normalization
├── alphabet
├── wordRules
└── exceptions
```

The first version only needs the Swedish implementation.

---

# 40. Recommended implementation approach

For Version 1:

1. Select a suitable Swedish word list.
2. Verify its license.
3. Store the source/version information.
4. Normalize the word list.
5. Generate a simple lookup structure.
6. Implement the dictionary interface.
7. Implement explicit game-level word restrictions.
8. Implement allowed exceptions.
9. Implement accepted in-game vocabulary.
10. Add comprehensive tests.
11. Integrate it with the game engine.

Do not build a sophisticated natural-language processing system.

The game only needs a reliable answer to:

> "Is this exact sequence of Swedish letters a normally playable word under our rules?"

---

# 41. Open decisions before implementation

The following should be decided before the dictionary implementation is finalized:

### Dictionary source

Which Swedish dictionary/word list provides the primary lexical data?

### Proper-name handling

Does the chosen source distinguish proper names sufficiently, or do we need explicit exclusion data?

### Place-name handling

Does the source contain geographical names, and how will these be excluded?

### Abbreviations

What, if any, abbreviation exceptions should be included?

### Word-form coverage

Does the chosen source include the ordinary plural and conjugated forms expected by players?

### Licensing

Can the selected word list legally be distributed with the game?

These decisions should be documented before Claude begins implementing the final dictionary data.

---

# 42. Definition of done

The dictionary system is complete for Version 1 when:

- A licensed Swedish word source has been selected.
- The source and license are documented.
- The word list is normalized consistently.
- Swedish Å, Ä, and Ö work correctly.
- Dictionary lookup is deterministic and offline.
- Normal valid Swedish words are recognized.
- Proper names are handled according to the game rules.
- Place names are handled according to the game rules.
- Countries are allowed.
- Months are allowed.
- Weekdays are allowed.
- Abbreviations are generally rejected.
- Explicit abbreviation exceptions can be maintained.
- One-letter words are rejected.
- Normal grammatical forms are supported when present in the dictionary.
- Unknown words are distinguishable from forbidden words.
- Accepted unknown words are stored per game.
- Accepted words can be reused during the same game.
- Accepted words do not modify the global dictionary.
- Automated tests cover all important categories.
- The game engine can consume the dictionary through a clean interface.
