# Backend Input Validation Recommendation

**To:** Backend Engineering Team
**From:** Frontend Security Review
**Date:** December 13, 2025
**Priority:** CRITICAL

---

## Executive Summary

The NextJS frontend now validates user inputs with Zod. **This is NOT sufficient for security.** Backend APIs must implement strict server-side validation as the primary defense. Client-side validation can be bypassed by attackers calling API endpoints directly.

---

## Why Backend Validation Is Critical

Attackers can bypass frontend validation completely:

```bash
curl -X POST https://api.news-nexus.com/users/login \
  -d '{"email":"<script>alert(1)</script>","password":"../../etc/passwd"}'
```

**Security principle:** Never trust client input. Always validate server-side.

---

## Required Validation Rules

### Email (All Auth Endpoints)

- Valid email format (RFC 5321): `/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/`
- Maximum 320 characters
- Normalize: trim whitespace, lowercase
- Reject: control characters, null bytes, special characters

**Prevents:** Email injection, XSS, database corruption

### Password (Login, Register, Reset)

**Minimum requirements:**
- 12+ characters (8 minimum for development)
- Maximum 128 characters (prevents bcrypt DoS)
- Block null bytes and control characters

**Recommended additions:**
- Uppercase + lowercase + number + special character
- Check against compromised password databases

**Prevents:** Brute force attacks (December 2025 breach vector)

### Reset Token

- Alphanumeric, hyphens, underscores, dots only
- Maximum 500 characters
- Verify signature (if JWT) and expiration (≤1 hour)
- Single-use only (invalidate after reset)
- Rate limit attempts per IP

**Prevents:** Token injection, path traversal, brute force

### Dangerous Patterns (Block in ALL Inputs)

- **Command injection:** `;` `|` `&` `$` `` ` `` `\`
- **SQL injection:** `'` `"` `--` `/*` `*/`
- **XSS:** `<` `>` `<script>` `onerror=` `javascript:`
- **Path traversal:** `../` `..\` `..%2F`
- **Control characters:** `\x00-\x1F` `\x7F`

---

## Implementation

### Zod (TypeScript - Recommended)

```typescript
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email().max(320).trim().toLowerCase(),
  password: z.string().min(12).max(128)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
});

app.post('/users/login', (req, res) => {
  const result = loginSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: 'Invalid credentials' });
  }
  // Use result.data (validated)
});
```

### Joi (JavaScript)

```javascript
const Joi = require('joi');

const loginSchema = Joi.object({
  email: Joi.string().email().max(320).required(),
  password: Joi.string().min(12).max(128).required()
});
```

---

## Additional Security (Required)

1. **Rate Limiting:** 5 login attempts per IP per 15 minutes
2. **Account Lockout:** After 10 failed attempts
3. **Logging:** Log validation failures with IP addresses
4. **Generic Errors:** Return "Invalid credentials" (never reveal if email exists)
5. **HTTPS Only:** Enforce on all auth endpoints
6. **CORS:** Restrict to known frontend origins

---

## Success Criteria

- ✅ All auth endpoints validate with schema library
- ✅ Invalid input returns 400 with generic message
- ✅ Passwords: min 12 chars, complexity enforced
- ✅ Emails: format validated and sanitized
- ✅ Tokens: format, expiration, single-use validated
- ✅ Rate limiting active
- ✅ Failures logged for monitoring

---

## Timeline

**Week 1 (CRITICAL):**
- Implement validation on auth endpoints
- Add rate limiting
- Deploy to production

**Week 2:**
- Account lockout mechanism
- Security logging
- Audit all other endpoints

---

## Affected Endpoints

- `POST /users/login`
- `POST /users/register`
- `POST /users/request-password-reset`
- `POST /users/reset-password/:token`

---

**Reference:** Frontend schemas: `NewsNexus10Portal/src/lib/validationSchemas.ts`
