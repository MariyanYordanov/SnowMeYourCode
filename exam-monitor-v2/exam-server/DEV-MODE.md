# 🔧 DEVELOPMENT MODE USAGE

## 🔒 Security First
**По подразбиране системата работи в PRODUCTION режим с пълна защита!**

## 🛠️ Как да активираш Development Mode?

### Метод 1: URL Parameter (Препоръчителен)
```
http://localhost:8080/student?dev=true
```

### Метод 2: Browser Console
1. Отвори DevTools (F12)
2. В конзолата напиши:
```javascript
window.ALLOW_DEV_MODE = true;
```
3. Опресни страницата (F5)

## 🔍 Как да провериш режима?
В браузър конзолата търси:
- `🔧 Development mode - LIMITED protection` - Development mode
- `🔒 Production mode - FULL protection active` - Production mode

## ⚠️ ВАЖНО ЗА РАЗРАБОТКА

### За докладване на проблеми:
1. Използвай `http://localhost:8080/student?dev=true`
2. DevTools ще работят нормално
3. Може да използваш F12, Ctrl+Shift+I, и др.
4. Fullscreen мониторинг все още работи

### За реални изпити:
1. Използвай `http://[IP-адрес]:8080/student` БЕЗ dev=true
2. Системата автоматично влиза в production режим
3. Пълна защита е активна

## 🧪 За тестване на античийт системата:
```javascript
// В browser console за форсиране на production mode:
window.ALLOW_DEV_MODE = false;
location.reload();
```

## 📝 Примери за използване:

### Разработка:
```
# Стартирай сървъра
npm start

# Отвори в браузъра
http://localhost:8080/student?dev=true

# Сега можеш да използваш DevTools за debugging
```

### Тестване на античийт:
```
# Отвори без dev=true
http://localhost:8080/student

# Или форсирай production mode
window.ALLOW_DEV_MODE = false; location.reload();
```

### Реален изпит:
```
# Учителят стартира сървъра
npm start

# Ученици се свързват
http://192.168.1.100:8080/student
# (без dev=true - автоматично production mode)
```

## 🔐 Сигурност
- Development mode работи САМО на localhost/127.0.0.1
- Трябва експлицитно да се активира с dev=true или window.ALLOW_DEV_MODE
- На реални IP адреси винаги е production mode
- Няма риск случайно да остане в development mode