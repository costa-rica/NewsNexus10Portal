# Security Logging for Attack Detection

**Question:** Should we log command injection attempts to PM2 logs?

**Answer:** YES - Logging enhances security and doesn't reduce efficacy of fixes.

---

## Why Log Attack Attempts

**Logging complements the fix, doesn't replace it:**
- Primary defense: Remove command execution (prevents attacks)
- Secondary defense: Log suspicious activity (detects attempts)
- Together: Prevention + Detection = Defense-in-Depth

**Benefits:**
- Detect attacks in real-time
- Identify attacker IPs for blocking
- Track attack patterns
- Prove compliance/due diligence
- Alert team to ongoing threats

---

## Implementation

### Step 1: Create Security Logger

```typescript
// lib/security-logger.ts
export function logSecurityEvent(event: {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  ip?: string;
  details?: any;
}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    app: 'NewsNexus10Portal',
    ...event,
  };

  // Logs to PM2 stdout (visible in pm2 logs)
  console.warn('[SECURITY]', JSON.stringify(logEntry));
}
```

### Step 2: Log Suspicious Input

```typescript
// Server Action
'use server';

import { articleSchema } from '@/lib/schemas';
import { logSecurityEvent } from '@/lib/security-logger';
import { headers } from 'next/headers';

export async function addArticle(formData: FormData) {
  const result = articleSchema.safeParse({
    title: formData.get('title'),
    // ... other fields
  });

  if (!result.success) {
    // Get client IP
    const headersList = headers();
    const ip = headersList.get('x-forwarded-for') ||
               headersList.get('x-real-ip') ||
               'unknown';

    // Log validation failure
    logSecurityEvent({
      type: 'INVALID_INPUT',
      severity: 'MEDIUM',
      message: 'Input validation failed',
      ip,
      details: {
        errors: result.error.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message,
        })),
      },
    });

    return { error: 'Invalid input provided' };
  }

  // Process validated input...
}
```

### Step 3: View Logs

```bash
# Real-time monitoring
pm2 logs NewsNexus10Portal --lines 100

# Filter security events
pm2 logs NewsNexus10Portal | grep SECURITY

# Save to file
pm2 logs NewsNexus10Portal --lines 1000 > security-events.log
```

---

## What to Log

**DO log:**
- ✅ Invalid input patterns
- ✅ Client IP addresses
- ✅ Failed validation attempts
- ✅ Suspicious characters (`;`, `|`, `&&`, `base64`)
- ✅ Rate limit violations

**DON'T log:**
- ❌ Passwords or secrets
- ❌ Full request bodies (may contain PII)
- ❌ Session tokens
- ❌ Complete user data

---

## Outcome

**Fix prevents attacks. Logging detects attempts.**

Both together = Comprehensive security.
