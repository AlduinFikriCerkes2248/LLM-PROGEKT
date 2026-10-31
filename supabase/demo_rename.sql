-- ====================================================================
-- MATCHDAY · ДЕМО-СКРИПТ НЕЙТРАЛІЗАЦІЇ ІМЕН ТА НАЗВ КЕЙСІВ
-- Файл: supabase/demo_rename.sql
-- УВАГА: Тільки для ручного перегляду. НЕ застосовується автоматично.
-- Оновлює виключно текстові поля (без зміни первинних/зовнішніх ключів).
-- ====================================================================

BEGIN;

-- 1. Оновлення нікнеймів ботів та акаунтів у таблиці profiles
UPDATE public.profiles
SET username = 'PRO-бот'
WHERE username ILIKE '%марченко%' OR username ILIKE '%marchenko%';

UPDATE public.profiles
SET username = 'VIP-бот'
WHERE (username ILIKE '%хохлов%' OR username ILIKE '%khokhlov%')
  AND username NOT ILIKE '%адмін%';

UPDATE public.profiles
SET username = 'Головний Адмін'
WHERE username ILIKE '%адмін_хохлов%' OR username ILIKE '%admin_khokhlov%';

UPDATE public.profiles
SET username = 'Бот 1'
WHERE username ILIKE '%сьома%' OR username ILIKE '%syoma%' OR username ILIKE '%sioma%';

-- 2. Оновлення назв ліг, якщо вони містять персональні назви
UPDATE public.leagues
SET title = REPLACE(REPLACE(title, 'Хохловська долина', 'Турнірна арена'), 'Адміновська долина', 'Арена Чемпіонів')
WHERE title ILIKE '%хохловськ%' OR title ILIKE '%адміновськ%';

UPDATE public.leagues
SET title = REPLACE(title, 'Марченка', 'Елітна')
WHERE title ILIKE '%марченк%';

COMMIT;
