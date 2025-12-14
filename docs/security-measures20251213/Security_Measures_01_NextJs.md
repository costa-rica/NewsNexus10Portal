# Next.js Security Requirements for Production Deployment

**Purpose:** Minimum security standards for deploying Next.js applications to production
**Last Updated:** December 13, 2025
**Applies To:** All Next.js applications (App Router)

---

## 1. Framework Version Requirements

### Minimum Version: Next.js 15.5.9

**Why:** Versions below 15.5.9 contain critical RCE (Remote Code Execution) vulnerabilities:
- CVE: React Server Components flight protocol RCE
- CVE: Server Actions source code exposure
- CVE: Denial of Service with Server Components

**Implementation:**
```json
// package.json
{
  "dependencies": {
    "next": "^15.5.9",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

**Verification:**
```bash
npm list next
npm audit --production
```

---

## 2. Error Response Sanitization

### Requirement: Never expose internal error details in production

**Why:** Error messages can leak:
- File paths and system structure
- Environment variable names
- Database schema and queries
- Stack traces revealing code structure
- Usernames and internal identifiers

### Implementation:

**Create `app/error.tsx`:**
```typescript
'use client';

export default function Error({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // SECURITY: Production mode - sanitized errors only
  if (process.env.NODE_ENV === 'production') {
    return (
      <div>
        <h2>Something went wrong</h2>
        <p>We encountered an unexpected error. Please try again.</p>
        {error.digest && <p>Error ID: {error.digest}</p>}
        <button onClick={reset}>Try again</button>
      </div>
    );
  }

  // Development: Show full errors for debugging
  return (
    <div>
      <h2>Development Error</h2>
      <p>{error.message}</p>
      <pre>{error.stack}</pre>
      <button onClick={reset}>Try again</button>
    </div>
  );
}
```

**Create `app/global-error.tsx`:**
```typescript
'use client';

export default function GlobalError({ error, reset }: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // Same pattern as error.tsx but must include <html> and <body>
  return (
    <html>
      <body>
        {/* Same sanitization logic */}
      </body>
    </html>
  );
}
```

**Reference:** NewsNexus10Portal implementation in `src/app/error.tsx` and `src/app/global-error.tsx`

---

## 3. HTTP Security Headers

### Requirement: Implement defense-in-depth HTTP headers

**Why:** Protects against:
- Clickjacking (iframe embedding)
- MIME-type sniffing attacks
- XSS (Cross-Site Scripting)
- Protocol downgrade attacks
- Technology fingerprinting

### Implementation:

**Update `next.config.ts`:**
```typescript
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
    ];
  },

  // Remove technology fingerprinting
  poweredByHeader: false,

  // Enable React Strict Mode
  reactStrictMode: true,
};

export default nextConfig;
```

**Verification:**
```bash
# After deployment
curl -I https://your-app.com | grep -E "X-Frame|X-Content|X-XSS|Referrer|Strict-Transport"
```

**Reference:** NewsNexus10Portal implementation in `next.config.ts`

---

## 4. Input Validation with Zod

### Requirement: Validate all user inputs before processing

**Why:** Prevents:
- Command injection
- SQL injection
- XSS attacks
- Path traversal
- Buffer overflow via excessive input
- Malformed data causing crashes

### Implementation:

**Install Zod:**
```bash
npm install zod
```

**Create validation schemas (`src/lib/validationSchemas.ts`):**
```typescript
import { z } from 'zod';

// Email validation
const emailSchema = z
  .string()
  .min(1, 'Email is required')
  .max(320, 'Email is too long')
  .email('Please enter a valid email address')
  .regex(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)
  .transform((email) => email.toLowerCase().trim());

// Password validation
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128, 'Password is too long')
  .regex(/^[\x20-\x7E]*$/, 'Password contains invalid characters');

// Login schema
export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
});

// Helper function
export function validateInput<T extends z.ZodType>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors: Record<string, string> = {};
  if (result.error?.issues) {
    result.error.issues.forEach((issue) => {
      const field = issue.path.join('.');
      errors[field] = issue.message;
    });
  }

  return { success: false, errors };
}
```

**Use in components:**
```typescript
import { loginSchema, validateInput } from '@/lib/validationSchemas';

const handleSubmit = async () => {
  const validationResult = validateInput(loginSchema, { email, password });

  if (!validationResult.success) {
    const firstError = Object.values(validationResult.errors)[0];
    alert(firstError);
    return;
  }

  // Use validationResult.data (validated and sanitized)
  await fetch('/api/login', {
    body: JSON.stringify(validationResult.data),
  });
};
```

**Common Validation Patterns:**

| Input Type | Min Length | Max Length | Pattern |
|------------|-----------|-----------|---------|
| Email | 1 | 320 | RFC 5321 compliant |
| Password | 8 | 128 | Printable ASCII only |
| Username | 3 | 30 | Alphanumeric + underscore |
| URL | 1 | 2048 | Valid URL format |
| Phone | 10 | 15 | Digits only |

**Reference:** NewsNexus10Portal implementation in `src/lib/validationSchemas.ts`

---

## 5. Security Event Logging

### Requirement: Log security-relevant events for detection and response

**Why:** Enables:
- Real-time attack detection
- Attacker IP identification
- Attack pattern analysis
- Incident response and forensics
- Compliance audit trails

### Implementation:

**Create security logger (`src/lib/securityLogger.ts`):**
```typescript
export type SecuritySeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type SecurityEventType =
  | 'INVALID_INPUT'
  | 'SUSPICIOUS_PATTERN'
  | 'AUTHENTICATION_FAILURE'
  | 'INVALID_TOKEN';

interface SecurityEvent {
  timestamp: string;
  app: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  message: string;
  ip?: string;
  endpoint?: string;
  details?: Record<string, unknown>;
}

export function logSecurityEvent(event: Omit<SecurityEvent, 'timestamp' | 'app'>): void {
  const logEntry: SecurityEvent = {
    timestamp: new Date().toISOString(),
    app: 'YourAppName',
    ...event,
    ip: event.ip || 'client-side',
    details: sanitizeLogDetails(event.details),
  };

  console.warn('[SECURITY]', JSON.stringify(logEntry));
}

function sanitizeLogDetails(details?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!details) return undefined;

  const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];
  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(details)) {
    const isSensitive = sensitiveFields.some(field =>
      key.toLowerCase().includes(field.toLowerCase())
    );
    sanitized[key] = isSensitive ? '[REDACTED]' : value;
  }

  return sanitized;
}
```

**Integrate with validation:**
```typescript
import { logSecurityEvent } from '@/lib/securityLogger';

if (!validationResult.success) {
  logSecurityEvent({
    type: 'INVALID_INPUT',
    severity: 'MEDIUM',
    message: 'Login form validation failed',
    endpoint: '/users/login',
    details: {
      errors: validationResult.errors,
      emailProvided: !!email,
    },
  });

  alert('Invalid input');
  return;
}
```

**Viewing Logs (PM2):**
```bash
# Real-time monitoring
pm2 logs YourApp | grep SECURITY

# Filter by severity
pm2 logs YourApp | grep SECURITY | grep HIGH

# Save to file
pm2 logs YourApp --lines 1000 | grep SECURITY > security-events.log
```

**What to Log:**
- ✅ Validation failures
- ✅ Authentication failures
- ✅ Invalid tokens
- ✅ Suspicious patterns (SQL, XSS, command injection)
- ✅ Rate limit violations

**What NOT to Log:**
- ❌ Passwords (plain or hashed)
- ❌ Authentication tokens
- ❌ API keys or secrets
- ❌ Credit card numbers
- ❌ Personal identifiable information (PII)

**Reference:** NewsNexus10Portal implementation in `src/lib/securityLogger.ts`

---

## 6. Security Checklist for New Applications

### Pre-Deployment Checklist:

**Framework & Dependencies:**
- [ ] Next.js version ≥ 15.5.9
- [ ] Run `npm audit` with zero critical/high vulnerabilities
- [ ] All dependencies up to date

**Error Handling:**
- [ ] `app/error.tsx` created with production sanitization
- [ ] `app/global-error.tsx` created with production sanitization
- [ ] Tested error boundary behavior in production mode

**HTTP Headers:**
- [ ] Security headers configured in `next.config.ts`
- [ ] `poweredByHeader: false` set
- [ ] `reactStrictMode: true` enabled
- [ ] Headers verified in production deployment

**Input Validation:**
- [ ] Zod installed and configured
- [ ] Validation schemas created for all user inputs
- [ ] All forms validate before API calls
- [ ] Backend also validates (defense-in-depth)

**Logging:**
- [ ] Security logger utility created
- [ ] Sensitive data sanitization implemented
- [ ] Validation failures logged
- [ ] PM2 or logging service configured to capture logs

**Environment Variables:**
- [ ] No secrets in `NEXT_PUBLIC_*` variables
- [ ] `.env*` files in `.gitignore`
- [ ] `.env.example` provided (without actual secrets)

**Additional Security (Recommended):**
- [ ] Rate limiting on auth endpoints
- [ ] CORS configured (restrict to known origins)
- [ ] HTTPS enforced (redirect HTTP → HTTPS)
- [ ] Content Security Policy headers
- [ ] Session management reviewed (httpOnly cookies)

---

## 7. Testing Security Measures

### Error Sanitization Test:
```typescript
// Throw error in a page component
throw new Error('Test error with sensitive data: API_KEY=secret123');

// Production: Should show generic message
// Development: Should show full error
```

### Validation Test:
```typescript
// Test with malicious input
validateInput(loginSchema, {
  email: "<script>alert('xss')</script>",
  password: "; DROP TABLE users; --"
});

// Should fail validation and log security event
```

### Header Verification:
```bash
curl -I https://your-app.com

# Should see:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# X-XSS-Protection: 1; mode=block
```

### Logging Test:
```bash
# Trigger validation error on login form
# Check logs:
pm2 logs | grep SECURITY

# Should see JSON log entry with details
```

---

## 8. Reference Implementation

**Complete working example:** NewsNexus10Portal

**Key files to review:**
- `src/app/error.tsx` - Error boundary
- `src/app/global-error.tsx` - Global error boundary
- `next.config.ts` - Security headers
- `src/lib/validationSchemas.ts` - Input validation
- `src/lib/securityLogger.ts` - Security logging
- `src/components/auth/LoginForm.tsx` - Integration example

**Repository structure:**
```
project/
├── src/
│   ├── app/
│   │   ├── error.tsx           # Error sanitization
│   │   └── global-error.tsx    # Global error sanitization
│   ├── lib/
│   │   ├── validationSchemas.ts  # Zod schemas
│   │   └── securityLogger.ts     # Security logging
│   └── components/
│       └── auth/
│           └── LoginForm.tsx   # Validation + logging example
├── next.config.ts              # Security headers
└── package.json                # Next.js 15.5.9+
```

---

## 9. Deployment Notes

### Build Verification:
```bash
# Ensure clean build
npm run build

# Verify no security errors in output
# Check bundle size is reasonable
```

### Production Deployment:
```bash
# Install dependencies
npm ci --production

# Build for production
npm run build

# Start with PM2
pm2 start npm --name "YourApp" -- start

# Verify logs
pm2 logs YourApp
```

### Post-Deployment:
```bash
# Test error boundaries (intentionally trigger error)
# Verify security headers with curl
# Monitor security logs for anomalies
# Review first 24 hours of logs
```

---

## 10. Maintenance

**Weekly:**
- Review security logs for patterns
- Check for new CVEs: `npm audit`

**Monthly:**
- Update dependencies: `npm update`
- Review and rotate any exposed secrets
- Audit environment variables

**Quarterly:**
- External security audit (recommended)
- Penetration testing
- Review and update security policies

---

## Summary

These five security measures form the baseline for secure Next.js deployment:

1. **Framework Version:** Next.js ≥ 15.5.9 (patches RCE vulnerabilities)
2. **Error Sanitization:** Generic messages in production (prevents info leakage)
3. **Security Headers:** Defense-in-depth HTTP headers (prevents various attacks)
4. **Input Validation:** Zod validation on all inputs (prevents injection attacks)
5. **Security Logging:** Structured event logs (enables detection and response)

**Estimated implementation time:** 4-8 hours for a new application

**Security impact:** Prevents majority of common web application attacks

**Reference:** Complete implementation in NewsNexus10Portal (December 2025)
