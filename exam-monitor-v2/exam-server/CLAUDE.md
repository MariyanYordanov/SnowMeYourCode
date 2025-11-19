# Exam Monitor v2 - Anti-Cheat System Goals

## Main Goals

### 1. Exam Monitoring System with Anti-Cheat Protection
- Students login to programming exam system
- System prevents cheating through strict monitoring  
- Zero-tolerance policy - exam terminates automatically on violation

### 2. Popup Kiosk Mode (Phase 1) - CURRENTLY IN DEVELOPMENT
- On successful login, opens popup window in kiosk mode
- Parent window closes (point of no return)
- Student works isolated in popup window
- Reuse existing `startFullscreenExam` logic instead of writing new code

### 3. Problems We're Solving:
- ✅ Session expiration bug - students can't login ("не работи, влязах и веднага ме изплю")
- ✅ UI improvements - show terms before login form
- ✅ JavaScript errors - duplicate function declarations  
- 🔄 Popup kiosk mode for exam isolation

### 4. Architecture Principles:
- ALWAYS adapt existing code instead of writing new ("защо написахме нова функционалност при положение че имаме такава")
- Use same `/student` route with `?kiosk=true` parameter
- Reuse Monaco editor, Socket.io, Timer logic
- Less code = fewer bugs

### 5. Next Steps:
- Manual testing of popup kiosk mode
- Event-based anti-cheat system (replace polling)
- Advanced security measures

## Technical Details

### Popup Kiosk Implementation:
```javascript
// startExam() function launches popup instead of fullscreen
const kioskWindow = window.open(examUrl + '?kiosk=true', 'ExamKiosk', options);
// Parent closes after 2 seconds (point of no return)  
// Popup uses same exam interface but isolated
```

### Session Management Fix:
```javascript
// Allow new sessions when old ones are expired
if (timeLeft <= 0) {
    console.log(`Old session expired for ${session.studentName}, allowing new session creation`);
    return await this.createNewSession(session.studentName, session.studentClass);
}
```

### UI Flow:
1. Show exam terms and conditions
2. Checkbox for agreement
3. Login form after accepting terms
4. Popup kiosk mode on successful login

## Important Commands:
- Start server: `node server.mjs`
- Test login: Петър Петров, 11А  
- Debug URL: `http://localhost:8080/student?dev=true`

## Current Status:
- ✅ Session expiration fixed
- ✅ UI terms flow implemented
- ✅ JavaScript duplicate function error fixed
- 🔄 Ready for manual testing of popup kiosk mode