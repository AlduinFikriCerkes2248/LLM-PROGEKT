-- ====================================================================
-- MATCHDAY · ДЕМО-СКРИПТ НЕЙТРАЛІЗАЦІЇ ІМЕН ТА НАЗВ КЕЙСІВ
-- Файл: supabase/demo_rename.sql
-- УВАГА: Тільки для ручного перегляду. НЕ застосовується автоматично.
-- Оновлює виключно текстові поля (без зміни первинних/зовнішніх ключів).
-- Використовує Unicode escape-послідовності PostgreSQL для чистоти пошуку.
-- ====================================================================

BEGIN;

-- 1. Оновлення нікнеймів ботів та акаунтів у таблиці profiles
-- Бот (PRO) -> PRO-бот
UPDATE public.profiles
SET username = 'PRO-бот'
WHERE username ILIKE ('%' || E'\u043c\u0430\u0440\u0447\u0435\u043d\u043a\u043e' || '%')
   OR username ILIKE '%marchenko%';

-- Бот (VIP) -> VIP-бот
UPDATE public.profiles
SET username = 'VIP-бот'
WHERE (username ILIKE ('%' || E'\u0445\u043e\u0445\u043b\u043e\u0432' || '%') OR username ILIKE '%khokhlov%')
  AND username NOT ILIKE ('%' || E'\u0430\u0434\u043c\u0456\u043d' || '%')
  AND username NOT ILIKE '%admin%';

-- Головний адмін -> Головний Адмін
UPDATE public.profiles
SET username = 'Головний Адмін'
WHERE username ILIKE ('%' || E'\u0430\u0434\u043c\u0456\u043d_\u0445\u043e\u0445\u043b\u043e\u0432' || '%')
   OR username ILIKE '%admin_khokhlov%';

-- Бот 1 -> Бот 1
UPDATE public.profiles
SET username = 'Бот 1'
WHERE username ILIKE ('%' || E'\u0441\u044c\u043e\u043c\u0430' || '%')
   OR username ILIKE '%syoma%'
   OR username ILIKE '%sioma%';

-- 2. Оновлення назв ліг, якщо вони містять персональні назви
UPDATE public.leagues
SET title = REPLACE(
  REPLACE(title, E'\u0425\u043e\u0445\u043b\u043e\u0432\u0441\u044c\u043a\u0430 \u0434\u043e\u043b\u0438\u043d\u0430', 'Турнірна арена'),
  E'\u0410\u0434\u043c\u0456\u043d\u043e\u0432\u0441\u044c\u043a\u0430 \u0434\u043e\u043b\u0438\u043d\u0430', 'Арена Чемпіонів'
)
WHERE title ILIKE ('%' || E'\u0445\u043e\u0445\u043b\u043e\u0432\u0441\u044c\u043a' || '%')
   OR title ILIKE ('%' || E'\u0430\u0434\u043c\u0456\u043d\u043e\u0432\u0441\u044c\u043a' || '%');

UPDATE public.leagues
SET title = REPLACE(title, E'\u041c\u0430\u0440\u0447\u0435\u043d\u043a\u0430', 'Елітна')
WHERE title ILIKE ('%' || E'\u043c\u0430\u0440\u0447\u0435\u043d\u043a' || '%');

COMMIT;
