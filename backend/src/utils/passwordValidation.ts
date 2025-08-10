import Joi from 'joi';

// Password strength validation schema
export const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]'))
  .required()
  .messages({
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password must not exceed 128 characters',
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
    'any.required': 'Password is required'
  });

// Validate password strength
export const validatePasswordStrength = (password: string): { isValid: boolean; errors: string[] } => {
  const { error } = passwordSchema.validate(password);
  
  if (error) {
    return {
      isValid: false,
      errors: error.details.map(detail => detail.message)
    };
  }
  
  return {
    isValid: true,
    errors: []
  };
};

// Check for common weak passwords
const commonWeakPasswords = [
  'password', 'password123', '123456', '123456789', 'qwerty',
  'abc123', 'password1', 'admin', 'admin123', 'root', 'user',
  'test', 'test123', 'welcome', 'welcome123', 'login', 'login123'
];

export const isCommonWeakPassword = (password: string): boolean => {
  return commonWeakPasswords.includes(password.toLowerCase());
};

// Generate password strength score
export const getPasswordStrength = (password: string): {
  score: number;
  feedback: string[];
} => {
  let score = 0;
  const feedback: string[] = [];
  
  // Length check
  if (password.length >= 8) score += 1;
  else feedback.push('Use at least 8 characters');
  
  if (password.length >= 12) score += 1;
  else if (password.length >= 8) feedback.push('Consider using 12+ characters for better security');
  
  // Character variety checks
  if (/[a-z]/.test(password)) score += 1;
  else feedback.push('Include lowercase letters');
  
  if (/[A-Z]/.test(password)) score += 1;
  else feedback.push('Include uppercase letters');
  
  if (/\\d/.test(password)) score += 1;
  else feedback.push('Include numbers');
  
  if (/[@$!%*?&]/.test(password)) score += 1;
  else feedback.push('Include special characters (@$!%*?&)');
  
  // Common password check
  if (isCommonWeakPassword(password)) {
    score = Math.max(0, score - 2);
    feedback.push('Avoid common passwords');
  }
  
  // Repetition check
  if (/(..).*\\1/.test(password)) {
    score = Math.max(0, score - 1);
    feedback.push('Avoid repeated patterns');
  }
  
  return { score, feedback };
};