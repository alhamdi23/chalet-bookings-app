import { useMemo, useState } from 'react';

interface TagInputProps {
  value: string[];
  suggestions: string[];
  onChange: (tags: string[]) => void;
}

export default function TagInput({ value, suggestions, onChange }: TagInputProps) {
  const [draft, setDraft] = useState('');

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag) {
      return;
    }
    const exists = value.some((item) => item.toLowerCase() === tag.toLowerCase());
    if (!exists) {
      onChange([...value, tag]);
    }
    setDraft('');
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((item) => item !== tag));
  };

  const availableSuggestions = useMemo(
    () =>
      suggestions.filter(
        (suggestion) =>
          !value.some((item) => item.toLowerCase() === suggestion.toLowerCase()),
      ),
    [suggestions, value],
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addTag(draft);
    } else if (event.key === 'Backspace' && !draft && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div className="tag-input">
      <div className="tag-chips">
        {value.map((tag) => (
          <span key={tag} className="tag-chip">
            {tag}
            <button
              type="button"
              className="tag-remove"
              onClick={() => removeTag(tag)}
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          className="tag-entry"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? 'Add a tag and press Enter' : 'Add tag…'}
        />
      </div>

      {availableSuggestions.length > 0 && (
        <div className="tag-suggestions">
          {availableSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="tag-suggestion"
              onClick={() => addTag(suggestion)}
            >
              + {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
