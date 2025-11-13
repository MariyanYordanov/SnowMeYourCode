# 🚀 EXAM MONITOR v2.0 - QUICK START GUIDE

## ✅ ЩО Е ОПРАВЕНО

### 🔥 КРИТИЧНИ ПРОБЛЕМИ - РЕШЕНИ!

1. **F12 и DevTools** ✅
   - Блокирани ВСИЧКИ DevTools shortcuts (F12, Cmd+Opt+I, Ctrl+Shift+I, etc.)
   - 5 техники за детектиране дали DevTools е отворен
   - Автоматично терминиране на изпита при опит за отваряне

2. **Touchpad Swipe Gestures** ✅
   - Блокирани 2-finger swipe наляво/надясно
   - CSS overscroll-behavior: none
   - JavaScript history hijacking
   - Предотвратява връщане към предварително отворен AI таб

3. **macOS Green Button** ✅
   - Блокиран чрез CSS (-webkit-app-region: drag)
   - Window resize detection
   - Терминиране при опит за промяна на размера на прозореца

4. **Kiosk Mode** ✅
   - Работещи скриптове за macOS/Linux/Windows
   - Автоматична настройка на Chrome за максимална сигурност
   - 30+ Chrome flags за блокиране на swipe, pinch zoom, и др.

---

## 🎯 КАК ДА СТАРТИРАМ ИЗПИТ

### Стъпка 1: Подготовка на мрежата

**macOS Hotspot (до 4 ученика):**
```bash
# Виж пълните инструкции в NETWORK-SETUP-GUIDE.md
# Накратко:
1. System Settings > Sharing > Internet Sharing
2. SSID: ExamNet-2024
3. Password: [силна парола]
4. Включи Internet Sharing
```

**За 5+ ученика:** Използвай Wi-Fi router (виж NETWORK-SETUP-GUIDE.md)

⚠️ **ВАЖНО:** macOS Hotspot поддържа **максимум 5 устройства**, препоръчително **3-4** за стабилност!

### Стъпка 2: Стартирай серверите

```bash
cd exam-monitor-v2
npm install  # Първи път само
npm run dev
```

Трябва да видиш:
```
✅ Exam server running on http://localhost:8080
✅ Practice server running on http://localhost:3030
```

### Стъпка 3: Teacher Dashboard

Отвори в браузъра (НЕ в Kiosk mode):
```
http://localhost:8080/teacher
```

Login:
- Username: `admin`
- Password: `exam-admin-2024`

### Стъпка 4: Стартирай Kiosk Mode на всеки ученик

**macOS/Linux:**
```bash
cd exam-monitor-v2
./start-exam-kiosk.sh
```

**Windows:**
```cmd
cd exam-monitor-v2
start-exam-kiosk.bat
```

**Какво прави скрипта:**
- ✅ Проверява дали exam server работи
- ✅ Затваря съществуващи Chrome процеси
- ✅ Стартира Chrome в Kiosk mode с 30+ security flags
- ✅ Отваря http://localhost:8080/student
- ✅ Блокира swipe navigation, pinch zoom, и др.

### Стъпка 5: Ученик - Login flow

1. **Браузърът ще се отвори на пълен екран**
2. **Въведи име и клас** (българска кирилица)
3. **Приеми условията на изпита** (checkbox)
4. **Click "Влез в изпита"**
5. **Click "Enter Fullscreen"** бутона
6. **Изпитът започва!**

---

## 🛡️ ЗАЩИТИ - ЩО РАБОТИ СЕГА

### ✅ Keyboard Protection
- F12 → ❌ BLOCKED
- Ctrl+Shift+I / Cmd+Opt+I → ❌ BLOCKED (DevTools)
- Ctrl+Shift+J / Cmd+Opt+J → ❌ BLOCKED (Console)
- Ctrl+Shift+C / Cmd+Opt+C → ❌ BLOCKED (Inspect)
- Alt+Tab / Cmd+Tab → ❌ TERMINATION
- Escape → ❌ BLOCKED
- All function keys (F1-F24) → ❌ BLOCKED

### ✅ Mouse/Touchpad Protection
- Right-click → ❌ BLOCKED
- Middle-click → ❌ BLOCKED
- 2-finger swipe (left/right) → ❌ BLOCKED (browser navigation)
- Mouse outside window → ❌ TERMINATION
- macOS menu bar access → ❌ TERMINATION

### ✅ Window Protection
- Fullscreen exit → ❌ INSTANT TERMINATION
- Window resize → ❌ TERMINATION
- macOS green button → ❌ BLOCKED
- Alt+F4 / Cmd+Q → Allowed (за exit след изпит)

### ✅ DevTools Detection (5 techniques)
1. Console.log timing → Detected & TERMINATED
2. Window dimensions → Detected & TERMINATED
3. Debugger statement → Detected & TERMINATED
4. Element inspection → Detected & TERMINATED
5. Performance anomaly → Detected & TERMINATED

### ✅ Network Protection
- Browser navigation (swipe gestures) → ❌ BLOCKED
- Back/Forward buttons → ❌ BLOCKED
- History changes → ❌ BLOCKED
- beforeunload warning → ✅ ACTIVE

---

## 📊 TEACHER MONITORING

В Teacher Dashboard виждаш:

### Real-time информация:
- 👥 Active Students
- 🔌 Disconnected
- ⚠️ Security Violations
- ✅ Completed Exams

### За всеки ученик:
- Име, клас, session ID
- Fullscreen status (🟢/🔴)
- Remaining time
- Last activity
- Violation count
- Live code preview (първите 200 chars)
- Recent activity log

### Actions:
- 💬 Help Chat (bidirectional messaging)
- ⚠️ Send Warning
- 🚫 Terminate Exam (force disconnect)
- 🛑 Emergency Stop (всички ученици)

---

## 🆘 TROUBLESHOOTING

### Проблем 1: "Connection refused" от ученик

**Причина:** Exam server не работи или firewall блокира

**Решение:**
```bash
# 1. Провери дали серверът работи
curl http://localhost:8080

# 2. Намери Mac IP адреса
ifconfig | grep "inet "

# 3. Ученикът да използва Mac IP вместо localhost
# Пример: http://192.168.2.1:8080/student
```

### Проблем 2: F12 все още работи

**Причина:** Kiosk Mode НЕ е стартиран правилно

**Решение:**
```bash
# 1. Затвори Chrome напълно
killall "Google Chrome"  # macOS
taskkill /F /IM chrome.exe  # Windows

# 2. Стартирай отново с Kiosk Mode скрипта
./start-exam-kiosk.sh

# 3. НЕ отваряй ръчно Chrome!
```

### Проблем 3: Swipe жестове все още работят

**Причина:** Browser flags НЕ са приложени

**Решение:**
```bash
# Провери дали Chrome е стартиран с правилните flags:
ps aux | grep chrome | grep overscroll

# Трябва да видиш:
# --overscroll-history-navigation=0
# --disable-pinch

# Ако липсват, стартирай отново с Kiosk Mode скрипта
```

### Проблем 4: macOS green button все още работи

**Причина:** CSS защитата не е заредена

**Решение:**
1. В DevTools (преди изпит, за тестване):
   - Check за `#aggressive-anti-cheat-css` element
   - Провери че `overscroll-behavior: none` е приложено
2. Refresh страницата
3. Влез в fullscreen mode

### Проблем 5: Бавна мрежа с 4-5 ученика

**Решение:**
1. Намали броя на устройствата до 3-4
2. Или използвай Wi-Fi router вместо Hotspot
3. Виж NETWORK-SETUP-GUIDE.md за Router setup

---

## 📋 PRE-EXAM CHECKLIST

### 1 Ден преди:
- [ ] Тествай Kiosk Mode на 1-2 лаптопа
- [ ] Провери че F12 е блокиран
- [ ] Провери че swipe gestures не работят
- [ ] Тествай DevTools detection (отвори DevTools → трябва да терминира)
- [ ] Настрой мрежата (Hotspot или Router)

### 30 мин преди изпита:
- [ ] Стартирай exam server: `npm run dev`
- [ ] Отвори Teacher Dashboard: http://localhost:8080/teacher
- [ ] Провери че practice server работи
- [ ] Стартирай мрежата (Hotspot или Router)

### В началото на изпита:
- [ ] Инструктирай учениците:
  - Свържете се към ExamNet-2024
  - Стартирайте Kiosk Mode скрипта
  - НЕ затваряйте Chrome ръчно!
- [ ] Провери че всички са connected в Teacher Dashboard
- [ ] Провери fullscreen status (🟢) за всеки ученик

---

## 🔧 ADVANCED: Manual Chrome Launch

Ако скриптовете НЕ работят, можеш да стартираш Chrome ръчно:

**macOS:**
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome \
  --kiosk \
  --fullscreen \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --disable-blink-features=OverscrollCustomization \
  http://localhost:8080/student
```

**Windows:**
```cmd
"C:\Program Files\Google\Chrome\Application\chrome.exe" ^
  --kiosk ^
  --fullscreen ^
  --disable-pinch ^
  --overscroll-history-navigation=0 ^
  --disable-blink-features=OverscrollCustomization ^
  http://localhost:8080/student
```

**Linux:**
```bash
google-chrome \
  --kiosk \
  --fullscreen \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --disable-blink-features=OverscrollCustomization \
  http://localhost:8080/student
```

---

## 📞 КЛЮЧОВИ ФАЙЛОВЕ

| Файл | Описание |
|------|----------|
| `start-exam-kiosk.sh` | Kiosk Mode launcher (macOS/Linux) |
| `start-exam-kiosk.bat` | Kiosk Mode launcher (Windows) |
| `NETWORK-SETUP-GUIDE.md` | Пълно ръководство за мрежова настройка |
| `exam-server/public/student/js/anticheat.js` | Core security implementation |
| `exam-server/config/exam-config.json` | Server configuration |
| `exam-server/data/classes.json` | Student roster |

---

## ✅ SUMMARY

### ЩО РАБОТИ СЕГА:
- ✅ F12 и всички DevTools shortcuts - BLOCKED
- ✅ DevTools detection (5 techniques) - ACTIVE
- ✅ Swipe gestures (touchpad) - BLOCKED
- ✅ macOS green button - BLOCKED
- ✅ Kiosk Mode scripts - WORKING
- ✅ Network isolation guide - COMPLETE
- ✅ macOS Hotspot capacity - DOCUMENTED (5 max)

### ПРЕПОРЪКИ:
- 👥 **1-4 ученика:** macOS Hotspot (отлична стабилност)
- 👥 **5+ ученика:** Wi-Fi Router (виж NETWORK-SETUP-GUIDE.md)
- 🔒 **Винаги използвай Kiosk Mode скриптовете!**
- 📊 **Мониторинг през Teacher Dashboard през цялото време**

---

**Готов за изпит! 🎓🚀**

При проблеми, виж NETWORK-SETUP-GUIDE.md или провери console logs в браузъра.
