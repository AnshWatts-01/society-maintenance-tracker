/**
 * Free-text fields (complaint descriptions, notice bodies, admin notes) are
 * stored as plain text and rendered by React as text nodes, which already
 * escapes them for the DOM. The two remaining native-only concerns are:
 *  (1) stripping characters that have no legitimate use in these fields, and
 *  (2) escaping the same text before it is interpolated into HTML email
 *      bodies, which are NOT auto-escaped like JSX is.
 */

// Strip ASCII control characters (except newline \n and tab \t) that serve
// no purpose in a description/note and can be used to smuggle terminal/log
// injections. Built from explicit unicode escapes to avoid embedding literal
// control bytes in this source file.
const CONTROL_CHARS_EXCEPT_NEWLINE_TAB = new RegExp(
  "[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F\\u007F]",
  "g"
);

export function sanitizePlainText(input: string): string {
  return input.replace(CONTROL_CHARS_EXCEPT_NEWLINE_TAB, "").trim();
}

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (char) => HTML_ESCAPE_MAP[char] ?? char);
}
