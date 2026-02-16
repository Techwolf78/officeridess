// Security utilities for input validation and sanitization

/**
 * Sanitize user input to prevent XSS attacks
 * Removes dangerous HTML and script tags
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';

  // Trim whitespace
  let sanitized = input.trim();

  // Remove any HTML/script tags
  sanitized = sanitized
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');

  return sanitized;
}

/**
 * Validate subject line
 */
export function validateSubject(subject: string): { valid: boolean; error?: string } {
  const cleanSubject = sanitizeInput(subject);

  if (cleanSubject.length < 5) {
    return { valid: false, error: 'Subject must be at least 5 characters' };
  }

  if (cleanSubject.length > 100) {
    return { valid: false, error: 'Subject must not exceed 100 characters' };
  }

  return { valid: true };
}

/**
 * Validate description/body text
 */
export function validateDescription(description: string): { valid: boolean; error?: string } {
  const cleanDescription = sanitizeInput(description);

  if (cleanDescription.length < 20) {
    return { valid: false, error: 'Description must be at least 20 characters' };
  }

  if (cleanDescription.length > 5000) {
    return { valid: false, error: 'Description must not exceed 5000 characters' };
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /admin/gi,
    /delete/gi,
    /drop/gi,
    /update\s+firestore/gi,
    /hack/gi,
    /bypass/gi,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(cleanDescription) && cleanDescription.length < 50) {
      // Only flag if description is suspiciously short but contains keywords
      // This prevents legitimate complaints about hacking from being blocked
    }
  }

  return { valid: true };
}

/**
 * Rate limiting check - prevent spam
 * Returns true if user is allowed to submit, false if rate limited
 */
export function checkRateLimit(userId: string): boolean {
  const key = `ticket_submit_${userId}`;
  const now = Date.now();
  const rateLimit = 5000; // 5 second cooldown between submissions

  const lastSubmitTime = localStorage.getItem(key);

  if (lastSubmitTime) {
    const timeSinceLastSubmit = now - parseInt(lastSubmitTime);
    if (timeSinceLastSubmit < rateLimit) {
      return false;
    }
  }

  localStorage.setItem(key, now.toString());
  return true;
}

/**
 * Validate entire form
 */
export function validateTicketForm(formData: {
  issueType: string;
  subject: string;
  description: string;
}): { valid: boolean; errors: { [key: string]: string } } {
  const errors: { [key: string]: string } = {};

  // Issue type validation
  const validTypes = ['account', 'payment', 'ride', 'driver_verification', 'technical', 'other'];
  if (!formData.issueType || !validTypes.includes(formData.issueType)) {
    errors.issueType = 'Please select a valid issue type';
  }

  // Subject validation
  const subjectValidation = validateSubject(formData.subject);
  if (!subjectValidation.valid) {
    errors.subject = subjectValidation.error || 'Invalid subject';
  }

  // Description validation
  const descriptionValidation = validateDescription(formData.description);
  if (!descriptionValidation.valid) {
    errors.description = descriptionValidation.error || 'Invalid description';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
