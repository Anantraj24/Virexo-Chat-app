/**
 * Client-side form validation helpers.
 * Return error string or null.
 */

export function validateEmail(email) {
  if (!email || !email.trim()) return 'Email is required';
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) return 'Must be a valid email address';
  return null;
}

export function validatePassword(password) {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/\d/.test(password)) return 'Password must contain at least one number';
  return null;
}

export function validateUsername(username) {
  if (!username || !username.trim()) return 'Username is required';
  const trimmed = username.trim();
  if (trimmed.length < 3) return 'Username must be at least 3 characters';
  if (trimmed.length > 30) return 'Username cannot exceed 30 characters';
  if (!/^[a-zA-Z0-9_]+$/.test(trimmed)) return 'Only letters, numbers, and underscores allowed';
  return null;
}

export function validatePasswordMatch(password, confirmPassword) {
  if (!confirmPassword) return 'Please confirm your password';
  if (password !== confirmPassword) return 'Passwords do not match';
  return null;
}
