# Exam Monitor v2 🎓

Модулна система за мониториране на живо програмиращи изпити с anti-cheat защита и session recovery.

## ✨ Ключови функции

- **Session Recovery** - студентите могат да се връщат след disconnection
- **Anti-Cheat система** - засичане на подозрителни активности 
- **Real-time мониториране** - учителите виждат всичко на живо
- **Модулна архитектура** - лесно за разширяване и поддръжка
- **JSON storage** - работи offline, без external dependencies
- **Comprehensive testing** - Mocha/Chai тестове

## 🚀 Бърз старт

### 1. Инсталация

```bash
# Клонирай/създай проекта
mkdir exam-monitor-v2
cd exam-monitor-v2

# Копирай файловете от artifacts
# (server.mjs, modules/, data/, tests/, package.json)

# Инсталирай dependencies
npm install
```

### 2. Конфигурация

```bash
# Провери и редактирай класовете
cat exam-server/data/classes.json

# Настрой изпита (по желание)
cat exam-server/config/exam-config.json
```

### 3. Стартиране

```bash
# Стартирай и двата сървъра
npm run dev

# Или поотделно:
npm start               # Exam server (port 8080)
npm run start-practice  # Practice server (port 3030)
```

### 4. Setup на мрежата

1. **Включи Windows Hotspot**:
   - Settings → Network & Internet → Mobile hotspot
   - Network name: `ExamNet`
   - Turn on hotspot

2. **Windows Firewall**:
   - Allow Node.js through firewall when prompted
   - Or manually: Windows Defender Firewall → Allow an app → Add Node.js

3. **Намери IP адреса**:
   ```bash
   ipconfig
   # Търси "Wireless LAN adapter Local Area Connection* X"
   # IPv4 Address: 192.168.x.x
   ```

### 5. Достъп

- **Учители**: `http://192.168.x.x:8080/teacher`
- **Студенти**: `http://192.168.x.x:8080/student`

## 🏗️ Архитектура

```
exam-server/
├── server.mjs                 # Clean entry point
├── modules/                   # Core modules
│   ├── SessionManager.mjs     # Session handling & recovery
│   ├── JSONDataStore.mjs      # File operations  
│   ├── StudentValidator.mjs   # Validation
│   ├── WebSocketHandler.mjs   # Real-time communication
│   ├── ProxyHandler.mjs       # HTTP proxy
│   └── AntiCheatMonitor.mjs   # Anti-cheat system
├── data/                      # Storage
│   ├── classes.json           # Student configuration
│   ├── sessions/              # Daily session files
│   └── student-data/          # Student work by class
├── config/                    # Configuration
│   └── exam-config.json       # Exam settings
└── tests/                     # Test suite
    ├── SessionManager.test.mjs
    └── WebSocketHandler.test.mjs
```

## 🧪 Тестване

```bash
# Пусни всички тестове
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

## 📚 API & Events

### WebSocket Events

**Student Events:**
- `student-join` - Влизане в изпита
- `code-update` - Update на код
- `suspicious-activity` - Подозрителна активност
- `exam-complete` - Приключване

**Teacher Events:**
- `teacher-join` - Влизане в dashboard
- `all-students` - Списък със студенти
- `student-connected` - Нов студент
- `student-code-update` - Code update
- `student-suspicious` - Подозрителна активност

### HTTP Endpoints

- `POST /api/student-login` - Student login
- `GET /api/session-status` - Session status  
- `/jsonstore/*` - Proxy към practice server

## ⚙️ Конфигурация

### Classes (exam-server/data/classes.json)

```json
{
  "validClasses": ["11А", "11Б", "12А", "12Б"],
  "students": {
    "11А": ["Иван Иванов", "Петър Петров"],
    "11Б": ["Мария Иванова", "Георги Стоянов"]
  }
}
```

### Exam Settings (exam-server/config/exam-config.json)

- **Време на изпита**: 180 минути (3 часа)
- **Anti-cheat**: Включен с auto-disconnect
- **Session recovery**: 3 минути grace period
- **Rate limiting**: 50 заявки/минута

## 🛡️ Anti-Cheat система

### Засичани дейности:
- **Tab switching** - Превключване между приложения
- **Copy/Paste** - Опити за копиране/поставяне 
- **Developer Tools** - Опити за отваряне на DevTools
- **Window blur** - Излизане от прозореца
- **Right click** - Десен клик на мишката

### Severity levels:
- **Low** (5-10 точки) - Предупреждение
- **Medium** (15-20 точки) - Уведомяване на учителя
- **High** (25-35 точки) - Строго предупреждение
- **Critical** (40+ точки) - Автоматично изключване

## 🔄 Session Recovery

### Flow:
1. **Student започва изпита** в 10:00 → време до 13:00
2. **Disconnection** в 10:30 (network issue, browser crash)
3. **Връща се** в 11:15 → остават 1ч 45мин
4. **Продължава** от където е спрял

### Grace period:
- **3 минути** за reconnection след disconnection
- **Session остава жива** до края на 3-те часа
- **Автоматичен timeout** при изтичане на времето

## 📊 Мониториране

### Teacher Dashboard:
- **Real-time код** на всички студенти
- **Suspicious activities** в реално време
- **Session статистики** и timeline
- **Force disconnect** за нарушители

### Логове:
- **Session логове** в `data/sessions/YYYY-MM-DD/`
- **Student data** в `data/student-data/classes/`
- **Console логове** за debugging

## 🚨 Troubleshooting

### Честі проблеми:

**1. Students не могат да се свържат:**
```bash
# Провери дали сървърът работи
curl http://localhost:8080

# Провери firewall
netsh advfirewall firewall show rule name="Node.js"

# Провери hotspot IP
ipconfig
```

**2. Practice server недостъпен:**
```bash
# Стартирай practice server
npm run start-practice

# Провери на port 3030
curl http://localhost:3030/jsonstore
```

**3. Session recovery не работи:**
```bash
# Провери session файлове
ls exam-server/data/sessions/

# Провери за грешки в логовете
npm start
```

### Debug Mode:

```bash
# Включи detailed logging
export DEBUG=exam:*
npm start

# Или промени в exam-config.json
{
  "environment": {
    "debugMode": true,
    "developmentMode": true
  }
}
```

## 🔧 Development

### Добавяне на нови модули:

```bash
# Създай модул
touch exam-server/modules/NewModule.mjs

# Добави тест
touch exam-server/tests/NewModule.test.mjs

# Import в server.mjs
import { NewModule } from './modules/NewModule.mjs';
```

### Code Style:
- **ES6 Modules** - използвай import/export
- **Clean functions** - < 30 реда per function
- **Error handling** - винаги try/catch в async функции
- **TypeScript-style comments** - JSDoc коментари

## 📋 TODO / Roadmap

### Phase 2 - Frontend Refactor:
- [ ] Модулен student workspace
- [ ] Real-time teacher dashboard  
- [ ] Enhanced anti-cheat UI
- [ ] Mobile responsive design

### Phase 3 - Advanced Features:
- [ ] Export/import functionality
- [ ] Advanced analytics
- [ ] Backup systems
- [ ] MongoDB support (optional)

## 📄 License

ISC License - вижте package.json за детайли.

## 🤝 Contributing

1. Fork the project
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)  
5. Open Pull Request

---

**Системата е готова за production използване с до 25 студенти едновременно!** 🎉