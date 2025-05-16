
/**
 * Utility functions for forms and UI components
 */

/**
 * Ensures a value is safe to use as a select item value
 * Converts empty strings, nulls, or undefined values to a fallback
 * 
 * @param value The value to check
 * @param fallback The fallback value (defaults to "default")
 * @returns A non-empty string that's safe to use as a select value
 */
export const ensureSelectValue = (value: string | null | undefined, fallback: string = "default"): string => {
  if (!value || value.trim() === "") {
    return fallback;
  }
  return value;
};

/**
 * Generates a safe, unique value for a select item when original might be empty
 * 
 * @param index The index of the item (for uniqueness)
 * @param value The original value
 * @param prefix A prefix to add (defaults to "item")
 * @returns A safe, non-empty string to use as a select value
 */
export const generateSelectItemValue = (index: number, value?: string | null, prefix: string = "item"): string => {
  if (value && value.trim() !== "") {
    return value;
  }
  return `${prefix}-${index}`;
};
