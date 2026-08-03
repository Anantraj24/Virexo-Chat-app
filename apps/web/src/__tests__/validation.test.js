import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePassword,
  validateUsername,
  validatePasswordMatch,
} from '../lib/validation';

describe('Client-side Validation Helpers', () => {
  describe('validateEmail', () => {
    it('should return error for empty email', () => {
      expect(validateEmail('')).toBe('Email is required');
      expect(validateEmail('   ')).toBe('Email is required');
    });

    it('should return error for invalid email format', () => {
      expect(validateEmail('invalid-email')).toBe('Must be a valid email address');
      expect(validateEmail('alex@')).toBe('Must be a valid email address');
      expect(validateEmail('@domain.com')).toBe('Must be a valid email address');
    });

    it('should return null for valid email address', () => {
      expect(validateEmail('alex@example.com')).toBeNull();
      expect(validateEmail('user.name+tag@sub.domain.org')).toBeNull();
    });
  });

  describe('validatePassword', () => {
    it('should return error for empty password', () => {
      expect(validatePassword('')).toBe('Password is required');
    });

    it('should return error for password under 8 characters', () => {
      expect(validatePassword('Pass1')).toBe('Password must be at least 8 characters');
    });

    it('should return error for password missing a number', () => {
      expect(validatePassword('PasswordNoNum')).toBe('Password must contain at least one number');
    });

    it('should return null for valid password', () => {
      expect(validatePassword('Password123')).toBeNull();
    });
  });

  describe('validateUsername', () => {
    it('should return error for empty username', () => {
      expect(validateUsername('')).toBe('Username is required');
    });

    it('should return error for username < 3 chars', () => {
      expect(validateUsername('ab')).toBe('Username must be at least 3 characters');
    });

    it('should return error for username > 30 chars', () => {
      expect(validateUsername('a'.repeat(31))).toBe('Username cannot exceed 30 characters');
    });

    it('should return error for invalid characters', () => {
      expect(validateUsername('user-name!')).toBe('Only letters, numbers, and underscores allowed');
    });

    it('should return null for valid username', () => {
      expect(validateUsername('alex_rivera')).toBeNull();
      expect(validateUsername('User123')).toBeNull();
    });
  });

  describe('validatePasswordMatch', () => {
    it('should return error if confirm password is empty', () => {
      expect(validatePasswordMatch('Pass123!', '')).toBe('Please confirm your password');
    });

    it('should return error if passwords do not match', () => {
      expect(validatePasswordMatch('Pass123!', 'Pass456!')).toBe('Passwords do not match');
    });

    it('should return null when passwords match', () => {
      expect(validatePasswordMatch('Pass123!', 'Pass123!')).toBeNull();
    });
  });
});
