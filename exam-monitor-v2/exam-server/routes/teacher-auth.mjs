import express from 'express';
import crypto from 'crypto';

const router = express.Router();

// Teacher credentials (in production, store in database or config file)
const TEACHER_CREDENTIALS = {
    'admin': {
        password: 'exam-admin-2024',
        displayName: 'Administrator'
    },
    'teacher': {
        password: 'teacher-pass-2024',
        displayName: 'Teacher'
    }
};

// Failed login attempts tracking
const failedAttempts = new Map();
const LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutes
const MAX_FAILED_ATTEMPTS = 3;

/**
 * Hash password with salt
 */
function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
}

/**
 * Verify password against hash
 */
function verifyPassword(password, hashedPassword) {
    const [salt, hash] = hashedPassword.split(':');
    const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
}

/**
 * Check if IP is locked out due to failed attempts
 */
function isLockedOut(ipAddress) {
    const attempts = failedAttempts.get(ipAddress);
    if (!attempts) return false;
    
    const now = Date.now();
    const recentAttempts = attempts.filter(time => now - time < LOCKOUT_DURATION);
    
    if (recentAttempts.length >= MAX_FAILED_ATTEMPTS) {
        const oldestAttempt = Math.min(...recentAttempts);
        const timeLeft = LOCKOUT_DURATION - (now - oldestAttempt);
        return timeLeft > 0 ? timeLeft : false;
    }
    
    return false;
}

/**
 * Record failed login attempt
 */
function recordFailedAttempt(ipAddress) {
    const attempts = failedAttempts.get(ipAddress) || [];
    attempts.push(Date.now());
    failedAttempts.set(ipAddress, attempts);
}

/**
 * Clear failed attempts on successful login
 */
function clearFailedAttempts(ipAddress) {
    failedAttempts.delete(ipAddress);
}

/**
 * Get client IP address
 */
function getClientIP(req) {
    return req.ip || 
           req.connection.remoteAddress || 
           req.socket.remoteAddress ||
           req.headers['x-forwarded-for']?.split(',')[0] ||
           'unknown';
}

// Teacher login endpoint
router.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;
        const clientIP = getClientIP(req);
        
        // Check for lockout
        const lockoutTime = isLockedOut(clientIP);
        if (lockoutTime) {
            return res.status(429).json({
                success: false,
                error: 'too_many_attempts',
                lockoutTime: Math.ceil(lockoutTime / 1000)
            });
        }
        
        // Validate input
        if (!username || !password) {
            recordFailedAttempt(clientIP);
            return res.status(400).json({
                success: false,
                error: 'missing_credentials'
            });
        }
        
        // Check credentials
        const teacher = TEACHER_CREDENTIALS[username];
        if (!teacher || teacher.password !== password) {
            recordFailedAttempt(clientIP);
            console.log(`Failed teacher login attempt: ${username} from ${clientIP}`);
            return res.status(401).json({
                success: false,
                error: 'invalid_credentials'
            });
        }
        
        // Success - create session
        clearFailedAttempts(clientIP);
        
        req.session.teacher = {
            username: username,
            displayName: teacher.displayName,
            loginTime: Date.now(),
            ipAddress: clientIP
        };
        
        console.log(`Teacher login successful: ${username} (${teacher.displayName}) from ${clientIP}`);
        
        res.json({
            success: true,
            teacher: {
                username: username,
                displayName: teacher.displayName,
                loginTime: req.session.teacher.loginTime
            }
        });
        
    } catch (error) {
        console.error('Teacher login error:', error);
        res.status(500).json({
            success: false,
            error: 'server_error'
        });
    }
});

// Check if teacher is already authenticated
router.get('/verify-session', (req, res) => {
    try {
        if (req.session?.teacher) {
            res.json({
                authenticated: true,
                teacher: {
                    username: req.session.teacher.username,
                    displayName: req.session.teacher.displayName,
                    loginTime: req.session.teacher.loginTime
                }
            });
        } else {
            res.json({
                authenticated: false
            });
        }
    } catch (error) {
        console.error('Session verification error:', error);
        res.status(500).json({
            authenticated: false,
            error: 'server_error'
        });
    }
});

// Teacher logout
router.post('/logout', (req, res) => {
    try {
        const username = req.session?.teacher?.username;
        
        if (req.session) {
            req.session.destroy((err) => {
                if (err) {
                    console.error('Logout error:', err);
                    return res.status(500).json({
                        success: false,
                        error: 'logout_failed'
                    });
                }
                
                console.log(`Teacher logout: ${username}`);
                res.json({
                    success: true,
                    message: 'Logged out successfully'
                });
            });
        } else {
            res.json({
                success: true,
                message: 'No active session'
            });
        }
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            error: 'server_error'
        });
    }
});

// Get login statistics (for monitoring)
router.get('/stats', requireTeacherAuth, (req, res) => {
    try {
        const stats = {
            totalFailedAttempts: Array.from(failedAttempts.values()).reduce((sum, attempts) => sum + attempts.length, 0),
            lockedOutIPs: Array.from(failedAttempts.entries())
                .filter(([ip, attempts]) => isLockedOut(ip))
                .map(([ip, attempts]) => ({
                    ip,
                    attempts: attempts.length,
                    lockoutTime: isLockedOut(ip)
                })),
            recentAttempts: Array.from(failedAttempts.entries()).map(([ip, attempts]) => ({
                ip,
                attempts: attempts.length,
                lastAttempt: Math.max(...attempts)
            }))
        };
        
        res.json({
            success: true,
            stats
        });
    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({
            success: false,
            error: 'server_error'
        });
    }
});

// Middleware to require teacher authentication
export function requireTeacherAuth(req, res, next) {
    if (!req.session?.teacher) {
        return res.status(401).json({
            success: false,
            error: 'authentication_required',
            redirectTo: '/teacher/login.html'
        });
    }
    next();
}

// Middleware to redirect unauthenticated requests to login page
export function redirectToLogin(req, res, next) {
    if (!req.session?.teacher) {
        return res.redirect('/teacher/login.html');
    }
    next();
}

export default router;