# 🌐 NETWORK SETUP GUIDE - Exam Monitor v2.0

Ръководство за настройка на мрежа за изолация на изпитна среда.

---

## 📊 MAC HOTSPOT CAPACITY

### macOS Personal Hotspot Ограничения

| macOS Версия | Максимум устройства | Препоръчително |
|--------------|---------------------|----------------|
| macOS 10.15+ (Catalina+) | **5 устройства** | 3-4 за стабилност |
| macOS 11+ (Big Sur+) | **5 устройства** | 3-4 за стабилност |
| macOS 12+ (Monterey+) | **5 устройства** | 3-4 за стабилност |

**⚠️ ВАЖНО**:
- Apple официално поддържа до **5 едновременни връзки**
- За изпит с **повече от 4 ученика** се препоръчва **професионален Wi-Fi router**
- При 5 устройства може да има забавяне на мрежата

---

## 🔧 ВАРИАНТ 1: macOS Personal Hotspot (до 4 ученика)

### Стъпка 1: Създаване на Hotspot

1. **Отвори System Settings (System Preferences)**
   - macOS Ventura+: `Settings > General > Sharing`
   - macOS Monterey/Big Sur: `System Preferences > Sharing`

2. **Включи Internet Sharing:**
   - Share your connection from: `Ethernet` или `Thunderbolt Ethernet`
   - To computers using: `Wi-Fi`

3. **Конфигурирай Wi-Fi настройки:**
   ```
   Network Name (SSID): ExamNet-2024
   Channel: 6 (или 11 за по-малко смущения)
   Security: WPA2 Personal
   Password: [силна парола, min 8 символа]
   ```

4. **Включи Internet Sharing** - чекбокс горе вляво

### Стъпка 2: Firewall настройки

1. **Отвори Terminal:**
   ```bash
   sudo nano /etc/pf.conf
   ```

2. **Добави правила за блокиране на external access:**
   ```
   # Block all outgoing traffic except localhost
   block out all
   pass out quick inet proto tcp to 127.0.0.1 port 8080
   pass out quick inet proto tcp to 127.0.0.1 port 3030
   pass out quick inet proto udp to any port 53  # Allow DNS
   ```

3. **Активирай firewall:**
   ```bash
   sudo pfctl -e
   sudo pfctl -f /etc/pf.conf
   ```

4. **Провери статус:**
   ```bash
   sudo pfctl -s rules
   ```

### Стъпка 3: DHCP резервации (MAC Address Whitelist)

1. **Отвори Internet Sharing конфигурация:**
   ```bash
   sudo nano /etc/bootpd.plist
   ```

2. **Добави MAC addresses на учениците:**
   ```xml
   <key>static_clients</key>
   <array>
       <dict>
           <key>hwaddr</key>
           <string>aa:bb:cc:dd:ee:01</string>
           <key>ipaddr</key>
           <string>192.168.2.2</string>
           <key>name</key>
           <string>student-1-laptop</string>
       </dict>
       <!-- Повтори за всеки ученик -->
   </array>
   ```

3. **Рестартирай Internet Sharing:**
   ```bash
   sudo launchctl stop com.apple.InternetSharing
   sudo launchctl start com.apple.InternetSharing
   ```

---

## 🔧 ВАРИАНТ 2: Wi-Fi Router (5+ ученика)

### Препоръчителен Hardware

- **TP-Link Archer C6** (до 10 устройства, ~150 лв)
- **TP-Link Archer C80** (до 20 устройства, ~250 лв)
- **UniFi AP** (професионално решение, ~400 лв)

### Router Настройки

1. **SSID Configuration:**
   ```
   SSID: ExamNet-2024
   Security: WPA2-PSK
   Password: [силна парола]
   Channel: Auto (или ръчно 1/6/11)
   ```

2. **MAC Address Filtering:**
   - Включи "MAC Address Filter"
   - Mode: Whitelist (Allow only listed devices)
   - Добави MAC адресите на всички ученически лаптопи

3. **Firewall Rules:**
   - **Block all outgoing connections** освен:
     - Твоя exam server IP (macOS IP в мрежата)
     - Port 8080 (Exam Server)
     - Port 3030 (Practice Server)
     - DNS (Port 53) само към локален DNS

4. **Access Control:**
   - Disable WPS
   - Disable UPnP
   - Disable Remote Management
   - Enable AP Isolation (устройствата не могат да се виждат помежду си)

### Пример конфигурация (TP-Link)

1. Влез в router admin: `http://192.168.0.1`
2. **Wireless > Wireless Settings:**
   - SSID: `ExamNet-2024`
   - Security: `WPA2-PSK`
3. **Wireless > MAC Filtering:**
   - Enable MAC Address Filtering: `Yes`
   - Filter Rules: `Allow the stations specified by any enabled entries`
   - Add entries: [MAC addresses]
4. **Security > Firewall:**
   - Enable Firewall: `Yes`
   - Block all outbound traffic: `Yes`
   - Add exception: `192.168.0.100:8080` (твоя Mac IP)

---

## 🔒 ВАРИАНТ 3: Максимална изолация (Airgap Network)

Ако искаш **100% изолация от Internet**:

1. **Offline Router (без WAN connection)**
   - Свържи router без Ethernet кабел към Internet
   - Само локална мрежа между устройствата

2. **Exam Server на Mac:**
   - Свържи Mac към router чрез Ethernet
   - Стартирай exam-server и practice-server
   - Учениците се свързват към Wi-Fi на router

3. **IP Configuration:**
   ```
   Mac (Exam Server): 192.168.1.100
   Students: 192.168.1.101 - 192.168.1.120
   Router Gateway: 192.168.1.1
   DNS: None (или 192.168.1.1 за локален DNS)
   ```

4. **Ученици access URL:**
   ```
   http://192.168.1.100:8080/student
   ```

---

## 🛡️ ДОПЪЛНИТЕЛНА ЗАЩИТА

### 1. Virtual Machine Detection (вече имплементирано)

В `anticheat.js` е добавена VM detection чрез:
- WebGL renderer проверка
- Hardware fingerprinting
- Screen ratio анализ
- User agent анализ

### 2. Browser Lockdown

Използвай **Kiosk Mode скрипта**:
```bash
./start-exam-kiosk.sh     # macOS/Linux
start-exam-kiosk.bat      # Windows
```

### 3. Physical Security

- Учениците да сядат на разстояние (не могат да гледат екраните на други)
- Забрани телефони, смарт часовници
- Забрани USB устройства (освен мишка/keyboard)
- Мониторинг от teacher dashboard

---

## 📋 CHECKLIST ПРЕДИ ИЗПИТА

### 1 Седмица преди:
- [ ] Избери вариант за мрежа (Hotspot vs Router)
- [ ] Събери MAC addresses на всички ученически лаптопи
- [ ] Тествай hotspot/router с 2-3 устройства
- [ ] Провери exam server работи ли в мрежата

### 1 Ден преди:
- [ ] Настрой firewall правила
- [ ] Добави MAC address whitelist
- [ ] Тествай Kiosk Mode на всеки лаптоп
- [ ] Провери че DevTools са блокирани

### В деня на изпита:
- [ ] Стартирай hotspot/router 15 мин преди изпита
- [ ] Стартирай exam server: `npm run dev`
- [ ] Провери teacher dashboard: `http://localhost:8080/teacher`
- [ ] Инструктирай учениците:
  1. Свържете се към ExamNet-2024
  2. Стартирайте Kiosk Mode script
  3. Login с вашето име

---

## 🆘 TROUBLESHOOTING

### Проблем: "Connection refused" от ученик

**Решение:**
1. Провери че exam server работи: `curl http://localhost:8080`
2. Провери firewall не блокира входящи връзки:
   ```bash
   sudo pfctl -d  # Disable временно за тест
   ```
3. Провери Mac IP адрес:
   ```bash
   ifconfig | grep "inet "
   ```
4. Ученикът да използва Mac IP вместо localhost:
   ```
   http://192.168.X.X:8080/student
   ```

### Проблем: Бавна мрежа с 4-5 устройства

**Решение:**
1. Намали Wi-Fi channel interference:
   ```bash
   # Mac: Scan за най-малко натоварен канал
   sudo /System/Library/PrivateFrameworks/Apple80211.framework/Versions/Current/Resources/airport -s
   ```
2. Смени на 5GHz (ако е налично)
3. Разгледай upgrade към професионален router

### Проблем: Ученик има достъп до други сайтове

**Решение:**
1. Провери firewall правила:
   ```bash
   sudo pfctl -s rules | grep block
   ```
2. Включи DNS filtering (block all external DNS)
3. Тествай с:
   ```bash
   curl -v https://google.com  # Трябва да fail
   ```

---

## 📊 ПРЕПОРЪКИ ПО БРОЙ УЧЕНИЦИ

| Брой ученици | Решение | Стабилност |
|---------------|---------|------------|
| 1-3 | macOS Hotspot | ⭐⭐⭐⭐⭐ Отлично |
| 4-5 | macOS Hotspot | ⭐⭐⭐⭐ Добро |
| 5-10 | Wi-Fi Router (TP-Link C6) | ⭐⭐⭐⭐⭐ Отлично |
| 10-20 | Wi-Fi Router (TP-Link C80 или UniFi) | ⭐⭐⭐⭐⭐ Отлично |
| 20+ | Enterprise AP (UniFi + switch) | ⭐⭐⭐⭐⭐ Професионално |

---

## 📞 SUPPORT

При проблеми с мрежата:
1. Провери firewall logs: `sudo pfctl -s rules`
2. Провери connected devices: `arp -a`
3. Test connectivity от ученик: `ping 192.168.X.X`

---

**Успех с изпита! 🎓**
