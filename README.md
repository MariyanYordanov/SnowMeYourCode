# Как работи системата стъпка по стъпка:

## 1. Student влиза в системата
Student отваря browser → http://localhost:8080/student
↓
Въвежда име и клас
↓
Натиска "Влез в изпита"

## 2. Установява се WebSocket връзка
Browser ←→ Exam Server (port 8080)
↓
Генерира се уникален Student ID
↓
ID се записва в session cookie

## 3. Student пише код и прави HTTP заявки
Student пише код в editor:
fetch('/jsonstore/collections/books')
  .then(res => res.json())
  .then(data => console.log(data));
  
## 4. Заявката минава през Proxy
Browser → Exam Server (8080) → Practice Server (3030)
         ↓
    Добавя X-Student-ID header
    от session cookie
    
## 5. Practice Server обработва заявката
Practice Server получава:
- URL: /collections/books
- Header: X-Student-ID: student-1749789602720-q1mf77uvh
↓
Чете данните от:
exam-server/student-data/2025-06-13/student-[ID]/data/collections.json
↓
Връща само книгите на този student

## 6. Teacher вижда всичко в реално време
Teacher Dashboard показва:
- Кой student е online
- Какъв код пише
- Дали има suspicious activity
