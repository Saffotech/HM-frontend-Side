/** Join class names (simple cn helper for receptionist UI). */
export function cn(...inputs) {
  return inputs.filter(Boolean).join(' ');
}
