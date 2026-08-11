import styles from "./BlankLetterPicker.module.css";

export interface BlankLetterPickerProps {
  readonly label: string;
  readonly alphabet: readonly string[];
  readonly value?: string;
  readonly onSelect: (letter: string) => void;
}

/**
 * The letter picker shown whenever a blank tile's represented letter needs to be chosen or
 * changed (ui-design.md section 14): supports the full Swedish alphabet, A–Z Å Ä Ö.
 */
export function BlankLetterPicker({
  label,
  alphabet,
  value,
  onSelect,
}: BlankLetterPickerProps) {
  return (
    <label className={styles.picker}>
      {label}
      <select
        value={value ?? ""}
        onChange={(event) => onSelect(event.target.value)}
      >
        <option value="" disabled>
          Välj bokstav
        </option>
        {alphabet.map((letter) => (
          <option key={letter} value={letter}>
            {letter}
          </option>
        ))}
      </select>
    </label>
  );
}
