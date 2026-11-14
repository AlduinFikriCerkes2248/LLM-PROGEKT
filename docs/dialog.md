# Журнал діалогу з моделлю (ПР 06)
Проєкт: Matchday · Ліга прогнозів на матчі (Тема 08)  
Виконавець: Арзубов Максим, група 1п-24  

---

### [№ 01] GitHub Copilot Chat
**Категорія:** Первинний запит (Крок 4 — Наївна версія функції на базі моделі)  
**Інструмент:** Copilot Chat (режим Agent)  

**Запит:**
> [№ 01]
> Контекст: Next.js 16 (App Router), TypeScript.
> У проєкті є:
> - `lib/ai/model.ts`, що експортує `askModel({ system, user })` та повертає `{ text }`.
> - `lib/action-result.ts`, що експортує тип `ActionResult`.
> - `components/action-form.tsx`, що експортує `ActionForm`.
> - `lib/data/db/matches.ts`, де є функції роботи з таблицею `matches`.
> 
> Вхідні дані (з нашої специфікації):
> Функція: 3.6. ШІ-прев'ю та аналітика матчу.
> Екран: сторінка деталей ліги `/leagues/[id]` (файл `app/leagues/[id]/page.tsx`).
> Користувач передає: `match_id` (приховане поле) та `tactical_focus` (текст фокусу аналітики до 300 символів).
> Застосунок додає з бази: назви команд (`team_home`, `team_away`), час матчу (`match_time`).
> Модель повертає JSON із полями: `summary` (текст огляду), `predicted_home` (число), `predicted_away` (число).
> Які записи змінює: оновлює 1 рядок у таблиці `matches` за `match_id`, записуючи в поле `venue` результат прев'ю.
> 
> Завдання:
> Реалізуй наївну версію функції на базі моделі:
> 1. Серверну дію ("use server") `generateMatchPreviewAction(previous: ActionResult | null, formData: FormData): Promise<ActionResult>`. Вона має прочитати `match_id` та `tactical_focus`, отримати дані матчу з бази, викликати `askModel`, розібрати відповідь через `JSON.parse` без валідації схеми, оновити поле `venue` у таблиці `matches` через Supabase клієнт `db()`, та повернути статус 200.
> 2. На сторінці `app/leagues/[id]/page.tsx` додай форму `ActionForm` біля кожного запланованого матчу з полем вводу `tactical_focus` і кнопкою «Згенерувати ШІ-прев'ю».
> 
> Обмеження:
> - Жодних нових npm-пакетів.
> - Не змінювати `lib/ai/model.ts`, `lib/ai/fault-mode.ts`, `lib/action-result.ts`, `components/action-form.tsx`, `tests/`, `supabase/`.
> - Жодних повторних спроб, лімітів, кешу чи таймаутів (це наївна версія).
> - Стилізація тільки класами Tailwind CSS.

**Відповідь моделі:**
> *Очікується генерація коду Copilot Chat у Codespace...*

---
