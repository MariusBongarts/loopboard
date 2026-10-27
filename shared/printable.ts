// File names come from disk and can hold anything. Printed in a terminal or
// pasted into an agent they must stay one line of data (#0071): control
// characters, line separators and bidi overrides are escaped as \uXXXX.

const UNSAFE = /[\u0000-\u001f\u007f-\u009f\u200e\u200f\u2028-\u202e\u2066-\u2069]/;
const UNSAFE_ALL = new RegExp(UNSAFE.source, 'g');

export function escapeControls(text: string): string {
  return text.replace(UNSAFE_ALL, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

// A JSON string literal: quotes and backslashes are escaped as well.
export function quoted(text: string): string {
  return escapeControls(JSON.stringify(text));
}

// As it is when harmless, otherwise as a quoted literal.
export function printable(text: string): string {
  return UNSAFE.test(text) ? quoted(text) : text;
}

// One shell word: as it is when the shell leaves it alone, else in single
// quotes (#0018, #0116).
export function shellWord(text: string): string {
  return /^[\w.@%+=:,/-]+$/.test(text) ? text : `'${text.replaceAll("'", `'\\''`)}'`;
}
