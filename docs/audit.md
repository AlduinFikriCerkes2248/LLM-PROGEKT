# 🛡️ Технічний та Безпековий Аудит Проєкту "Matchday"

**Дата проведення аудиту:** 28 жовтня 2026 р.  
**Контекст:** Next.js (App Router) + Supabase, живий продакшн на Vercel із загальною базою даних.  
**Мета:** Виявлення критичних вразливостей, витоків закритої інформації, фінансових глітчів, гонок транзакцій, регресій після редизайну та проблем доступності/верстки. Жодних платних інструментів чи зовнішніх сервісів для виправлення не потребується.

---

## 📑 Зміст
1. [Аудит прихованих карт та колоди (Fog of War)](#1-аудит-прихованих-карт-та-колоди-fog-of-war)
2. [Безпека таблиці profiles: пряма зміна монет і бонусів](#2-безпека-таблиці-profiles-пряма-зміна-монет-і-бонусів)
3. [Аудит RPC-функцій: перевірка auth.uid(), search_path, атомарність, гонки та захист від накрутки](#3-аудит-rpc-функцій)
4. [Економіка та виплати в іграх проти ботів](#4-економіка-та-виплати-в-іграх-проти-ботів)
5. [Заморожені ставки при закритті вкладки (Таймаут у SQL)](#5-заморожені-ставки-при-закритті-вкладки)
6. [Аналіз наявності секретів у репозиторії та збірці](#6-аналіз-наявності-секретів-у-репозиторії-та-збірці)
7. [Реальні імена людей у коді, назвах кейсів та ботів](#7-реальні-імена-людей-у-коді-назвах-кейсів-та-ботів)
8. [Регресії після редизайну /leagues та /leagues/[id]](#8-регресії-після-редизайну-leagues-та-leaguesid)
9. [Мобільна верстка (до 390px), prefers-reduced-motion та контрастність](#9-мобільна-верстка-до-390px-prefers-reduced-motion-та-контрастність)

---

## 1. Аудит прихованих карт та колоди (Fog of War)

### 🔴 Пункт 1.1: Прямий `SELECT` колоди та карт суперника з таблиці `pvp_duels`
* **Файл і рядки:** 
  * `app/online/page.tsx:326-343` (клієнтське опитування через Supabase SDK)
  * `supabase_full_games_update.sql:267-273` (RLS-політика на таблицю)
* **Ризик (Критичний):**
  * У файлі `app/online/page.tsx` клієнт кожні 2 секунди виконує прямий запит:
    ```typescript
    .select(`id, challenger_id, opponent_id, deck, challenger_cards, opponent_cards, challenger_score, opponent_score...`)
    ```
  * У файлі `supabase_full_games_update.sql:269-273` діє політика:
    ```sql
    CREATE POLICY "Authenticated users can view duels"
    ON public.pvp_duels FOR ALL TO authenticated USING (true) WITH CHECK (true);
    ```
  * Будь-який гравець під час партії може відкрити консоль браузера (DevTools) або вкладку Network і виконати:
    ```javascript
    const { data } = await supabase.from('pvp_duels').select('deck, opponent_cards, challenger_cards');
    ```
  * **Наслідки:** Гравець бачить усю колоду `deck` (знає наперед усі карти, які будуть взяті), бачить закриті карти суперника та його точну поточну суму очок. Крім того, директива `FOR ALL ... WITH CHECK (true)` дозволяє будь-якому автентифікованому користувачу напряму змінити `winner_id` та `status = 'completed'` через `UPDATE`.
* **Пропонований фікс:**
  1. Заборонити прямий `SELECT` до таблиці `pvp_duels` для ролі `authenticated` (або суворо обмежити політикою `USING (auth.uid() = challenger_id OR auth.uid() = opponent_id)`).
  2. Створити захищене SQL-представлення (View) або RPC-функцію `get_active_pvp_duel()`, яка маскує закриті дані:
     ```sql
     CREATE OR REPLACE FUNCTION public.get_my_active_duel()
     RETURNS jsonb
     LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
     DECLARE
       uid uuid := auth.uid();
       d record;
       is_ch boolean;
       opp_cards_masked integer[];
     BEGIN
       SELECT * INTO d FROM public.pvp_duels
       WHERE (challenger_id = uid OR opponent_id = uid)
         AND status IN ('playing', 'completed')
       ORDER BY created_at DESC LIMIT 1;
       
       IF NOT FOUND THEN RETURN NULL; END IF;
       
       is_ch := (uid = d.challenger_id);
       
       -- Маскуємо карти суперника, якщо гра ще триває
       IF d.status = 'playing' THEN
         IF is_ch THEN
           opp_cards_masked := array_fill(-1, ARRAY[coalesce(array_length(d.opponent_cards, 1), 0)]);
           d.opponent_cards := opp_cards_masked;
           d.opponent_score := -1;
         ELSE
           opp_cards_masked := array_fill(-1, ARRAY[coalesce(array_length(d.challenger_cards, 1), 0)]);
           d.challenger_cards := opp_cards_masked;
           d.challenger_score := -1;
         END IF;
         d.deck := NULL; -- Колода ніколи не передається клієнту
       END IF;
       
       RETURN to_jsonb(d);
     END;
     $$;
     ```

---

### 🔴 Пункт 1.2: Витік карт суперника у відповідях RPC-функцій
* **Файл і рядки:**
  * `supabase_pvp_blackjack_turn_based.sql:204-214` (функція `respond_duel_invite`)
  * `supabase_pvp_blackjack_turn_based.sql:381-390` (функція `pvp_bj_action`)
* **Ризик (Високий):**
  * Навіть закривши інтерфейсно карти плашкою "Таємниця", серверні функції повертають повні масиви обох гравців:
    ```sql
    return jsonb_build_object(
      'status', 'playing',
      'challenger_cards', d.challenger_cards,
      'opponent_cards', d.opponent_cards,
      'challenger_score', d.challenger_score,
      'opponent_score', d.opponent_score...
    );
    ```
  * Відповідь на POST-запит видно у вкладці Network DevTools одразу після ходу.
* **Пропонований фікс:**
  * У функціях `respond_duel_invite` та `pvp_bj_action` перед формуванням відповіді зі статусом `'playing'` маскувати масив карток опонента (`array_fill(-1, ...)` або передавати лише кількість карток `opp_cards_count`).

---

### 🔴 Пункт 1.3: Закрита карта дилера та колода в Соло-Блекджеку
* **Файл і рядки:**
  * `supabase_full_games_update.sql:52-56` (функція `bj_start`)
  * `app/blackjack/page.tsx:373-378`
* **Ризик (Середній/Високий):**
  * Гра записується в таблицю `public.blackjack_games` із колонками `dealer_cards` (2 карти, де 1 має бути схована) та `deck`. Якщо на таблицю є доступ `SELECT` для власника гри, гравець через `supabase.from('blackjack_games').select('dealer_cards, deck')` бачить другу карту дилера та всі наступні карти колоди.
* **Пропонований фікс:**
  * Переконатися, що до таблиці `blackjack_games` доступ має виключно внутрішній шар Postgres (REVOKE SELECT FROM authenticated). Весь стан має віддавати лише функція `bj_state()`, яка повертає `dealer_cards[1]` та приховує `dealer_cards[2]` і `deck`.

---

## 2. Безпека таблиці profiles: пряма зміна монет і бонусів

* **Файл і рядки:**
  * `supabase_full_games_update.sql:7-8`
  * `app/auth-status-indicator.tsx:42`
* **Ризик (Критичний):**
  * За замовчуванням у Supabase політика для профілів часто створюється як `CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);` або RLS взагалі не забороняє зміну окремих колонок.
  * Будь-який гравець може відкрити консоль на живому сайті та виконати:
    ```javascript
    const client = window.__supabase || ...;
    await client.from("profiles").update({ coins: 999999999, hohlyantsi: 999999 }).eq("id", myUserId);
    ```
  * Якщо немає тригера або колонкового обмеження прав (Column-level privileges), клієнт безпосередньо стає нескінченним мільярдером.
  * Якщо `WITH CHECK` або `USING` не перевіряє `id = auth.uid()`, користувач може змінити баланс будь-якого іншого гравця.
* **Пропонований фікс:**
  1. Заборонити користувачам змінювати фінансові колонки на рівні прав PostgreSQL:
     ```sql
     REVOKE UPDATE (coins, hohlyantsi) ON public.profiles FROM authenticated;
     GRANT UPDATE (username) ON public.profiles FROM authenticated;
     ```
  2. Встановити додатковий захисний тригер:
     ```sql
     CREATE OR REPLACE FUNCTION public.guard_profile_balance_update()
     RETURNS trigger AS $$
     BEGIN
       -- Дозволяємо зміну балансу тільки якщо функція викликана як SECURITY DEFINER від імені postgres
       IF (NEW.coins IS DISTINCT FROM OLD.coins OR NEW.hohlyantsi IS DISTINCT FROM OLD.hohlyantsi) THEN
         IF current_user NOT IN ('postgres', 'supabase_admin') AND current_setting('request.jwt.claim.role', true) = 'authenticated' THEN
           RAISE EXCEPTION 'Пряма зміна балансу суворо заборонена!';
         END IF;
       END IF;
       RETURN NEW;
     END;
     $$ LANGUAGE plpgsql;

     DROP TRIGGER IF EXISTS trg_guard_profile_balance ON public.profiles;
     CREATE TRIGGER trg_guard_profile_balance
     BEFORE UPDATE ON public.profiles
     FOR EACH ROW EXECUTE FUNCTION public.guard_profile_balance_update();
     ```

---

## 3. Аудит RPC-функцій

| RPC-функція | Перевірка `auth.uid()` | `SECURITY DEFINER` + `search_path` | Блокування рядка (`FOR UPDATE`) | Захист від гонки / подвійного кліку |
|---|:---:|:---:|:---:|:---:|
| `send_duel_invite` | ✅ Є (`uid is null`) | ✅ Є (`set search_path = public`) | ❌ **НЕМАЄ** | ⚠️ Можливий паралельний овердрафт |
| `respond_duel_invite` | ✅ Є (`uid is null`) | ✅ Є (`set search_path = public`) | ❌ **НЕМАЄ** | 🔴 **Критично: подвійне списання/виплата** |
| `pvp_bj_action` | ✅ Є (`uid is null`) | ✅ Є (`set search_path = public`) | ❌ **НЕМАЄ** | 🔴 **Критично: подвійний хід / дублювання карт** |
| `buy_case_with_hohlyantsi` | ✅ Є (`uid is null`) | ✅ Є (`set search_path = public`) | ❌ **НЕМАЄ** | ⚠️ check constraint рятує від мінуса, але кидає 500 |
| `open_loot_box` | ✅ Є (`uid is null`) | ✅ Є (`set search_path = public`) | ❌ **НЕМАЄ** | 🔴 **КРИТИЧНО: Нескінченні гроші (немає кулдауну)** |
| `bj_start` | ✅ Є (`uid is null`) | ✅ Є (`set search_path = public`) | ❌ **НЕМАЄ** | ⚠️ Можливість паралельного відкриття двох ігор |
| `play_dice` | ✅ Є (`uid is null`) | ✅ Є (`set search_path = public`) | ❌ **НЕМАЄ** | ⚠️ Гонка при швидкому кліку |

---

### Деталі знайдених дефектів у функціях:

#### 1. `open_loot_box` (`supabase_full_games_update.sql:132-172` та `app/cases/page.tsx:84`)
* **Ризик:** Функція взагалі не містить перевірки дати або кулдауну в базі даних. Обмеження перевіряється виключно в клієнтському коді через `localStorage.getItem("matchday:last_daily_case")`. Користувач може викликати `supabase.rpc('open_loot_box', { p_box_type: 'admin' })` у циклі 1000 разів і отримати 1 000 000 000 монет за хвилину.
* **Фікс:** Додати до таблиці `profiles` колонку `last_case_opened_at timestamptz`. У функції перевіряти:
  ```sql
  IF u.last_case_opened_at IS NOT NULL AND u.last_case_opened_at > now() - interval '24 hours' THEN
    RAISE EXCEPTION 'Кейс уже відкрито сьогодні!';
  END IF;
  UPDATE public.profiles SET coins = coins + coins_reward, last_case_opened_at = now() WHERE id = uid;
  ```

#### 2. `respond_duel_invite` (`supabase_pvp_blackjack_turn_based.sql:84-128`)
* **Ризик:** Рядок дуелі вибирається без блокування:
  ```sql
  select * into d from public.pvp_duels where id = p_duel_id;
  ```
  Якщо користувач надсилає два одночасних запити на прийняття (подвійний клік) або якщо один клікає "прийняти", а інший "скасувати" в ту саму мілісекунду, обидві транзакції прочитають `status = 'pending'`. У костях це призведе до **подвійної виплати виграшу**. При скасуванні — до **подвійного повернення ставки**.
* **Фікс:**
  ```sql
  SELECT * INTO d FROM public.pvp_duels WHERE id = p_duel_id FOR UPDATE;
  IF d.status != 'pending' THEN
    RAISE EXCEPTION 'duel_not_pending';
  END IF;
  ```
  Також обов'язково блокувати баланс:
  ```sql
  SELECT coins INTO opp_val FROM public.profiles WHERE id = uid FOR UPDATE;
  ```

#### 3. `pvp_bj_action` (`supabase_pvp_blackjack_turn_based.sql:248-260`)
* **Ризик:** Відсутність `FOR UPDATE` на `pvp_duels`. Якщо гравець робить подвійний клік на кнопку `HIT`:
  Обидва потоки зчитують однаковий `deck[1]`, додають гравцю дві однакові карти і списують лише одну з колоди, або подвоюють виплату банку, якщо обидва потоки одночасно фіксують кінець матчу.
* **Фікс:** Додати `FOR UPDATE` до `SELECT * INTO d FROM public.pvp_duels WHERE id = p_duel_id FOR UPDATE;`.

---

## 4. Економіка та виплати в іграх проти ботів

* **Файл і рядки:**
  * `app/online/page.tsx:480-518` (`startBotBlackjackMatch`)
  * `app/online/page.tsx:644-672` (`simulateBotBlackjackTurn`)
  * `app/online/page.tsx:698-725` (`simulateBotDiceMatch`)
  * `app/online/page.tsx:136-161` (`BOT_PLAYERS`)
* **Ризик (Високий для логіки та UX):**
  1. **Відсутність збереження (UX баг):** Всі матчі проти ботів відбуваються виключно у клієнтському стані React:
     ```typescript
     setCurrentUser({ ...currentUser, coins: currentUser.coins + liveBjMatch.pot });
     ```
     Запит до Supabase для збереження балансу **не надсилається**. Якщо гравець виграв 50 000 монет у бота і оновив сторінку (`F5`), його баланс повертається до початкового стану з бази.
  2. **Створення грошей з повітря (Економічний ризик):** Боти не існують у базі даних (у них немає рядків у `profiles`, їх баланси 75 400, 1 500 000 — це захардкоджені константи у файлі `page.tsx`). Якщо підключити пряме збереження виграшу проти ботів до бази без джерела фінансування, це створить необмежену емісію монет з нічого.
* **Пропонований фікс:**
  * Варіант А (Демо-режим): Чітко додати бейдж біля ботів: `[ТРЕНУВАННЯ / БЕЗ ВИПЛАТ]`, щоб гравці розуміли, що це безкоштовний режим.
  * Варіант Б (Повноцінна гра): Створити в таблиці `profiles` системні акаунти ботів із фіксованим балансом та перевести гру проти ботів на безпечну серверну RPC-функцію з реальним списанням з рахунку бота.

---

## 5. Заморожені ставки при закритті вкладки

* **Файл і рядки:**
  * `supabase_pvp_blackjack_turn_based.sql:185-215` (статус гри стає `'playing'`)
  * `supabase_full_games_update.sql:317, 400` (ставки списані з обох гравців)
  * `app/online/page.tsx:338-344` (вибірка активної гри)
* **Ризик (Критичний для UX):**
  * Якщо Гравець А надіслав виклик, Гравець Б прийняв (ставки по 100 монет списалися в банк), гра перейшла в статус `playing`.
  * Якщо після цього один із гравців закрив вкладку, зник інтернет або він навмисно ігнорує хід:
    1. Гра залишається в статусі `playing` **назавжди**.
    2. Ставки обох гравців назавжди зависають у банку (жоден не отримує виплату).
    3. Обидва гравці блокуються від гри в блекджек, оскільки інтерфейс завжди підтягує останню незавершену гру.
* **Пропонований фікс:**
  1. Додати до таблиці `pvp_duels` поле `last_action_at timestamptz DEFAULT now()`.
  2. Оновлювати `last_action_at = now()` при кожному виклику `pvp_bj_action`.
  3. Створити безкоштовну SQL-функцію обробки таймауту `claim_duel_timeout`:
     ```sql
     CREATE OR REPLACE FUNCTION public.claim_duel_timeout(p_duel_id uuid)
     RETURNS jsonb
     LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
     DECLARE
       uid uuid := auth.uid();
       d record;
       non_active_player uuid;
     BEGIN
       SELECT * INTO d FROM public.pvp_duels WHERE id = p_duel_id FOR UPDATE;
       IF d.status != 'playing' THEN RAISE EXCEPTION 'game_not_active'; END IF;
       
       -- Таймаут 60 секунд на хід
       IF now() - coalesce(d.last_action_at, d.created_at) < interval '60 seconds' THEN
         RAISE EXCEPTION 'Час на хід ще не вичерпано (залишилось менше 60 сек)';
       END IF;
       
       -- Визначаємо винного (чий був хід)
       non_active_player := d.current_turn;
       -- Переможцем стає той, хто очікував
       d.winner_id := CASE WHEN non_active_player = d.challenger_id THEN d.opponent_id ELSE d.challenger_id END;
       
       IF d.currency = 'coins' THEN
         UPDATE public.profiles SET coins = coins + (d.stake * 2) WHERE id = d.winner_id;
       ELSE
         UPDATE public.profiles SET hohlyantsi = hohlyantsi + (d.stake * 2) WHERE id = d.winner_id;
       END IF;
       
       UPDATE public.pvp_duels SET status = 'completed', winner_id = d.winner_id WHERE id = p_duel_id;
       RETURN jsonb_build_object('success', true, 'winner_id', d.winner_id, 'reason', 'timeout');
     END;
     $$;
     ```
  4. На клієнті показувати таймер зворотного відліку (60 сек) та кнопку "Зарахувати перемогу за неявку суперника".

---

## 6. Аналіз наявності секретів у репозиторії та збірці

* **Файли:**
  * `.env.example:1-3`
  * `.gitignore:34-36`
  * `lib/supabase/client.ts:5-18`
  * `next.config.ts:1-9`
* **Результат аудиту:**
  * ✅ **Чисто:** Жодних ключів типу `sb_secret_`, `SUPABASE_SERVICE_ROLE_KEY`, службових JWT або паролів бази даних у відкритому вигляді в коді репозиторію **не виявлено**.
  * ✅ Файли `.env`, `.env.local`, `.env*.local` надійно додані до `.gitignore`.
  * ✅ У клієнтський бандл потрапляють лише змінні з префіксом `NEXT_PUBLIC_` (`NEXT_PUBLIC_SUPABASE_URL` та `NEXT_PUBLIC_SUPABASE_ANON_KEY`), що відповідає стандартній безпечній практиці Supabase.
  * ⚠️ **Рекомендація:** Переконатися в налаштуваннях середовища Vercel (Project Settings -> Environment Variables), що `SUPABASE_SERVICE_ROLE_KEY` не додано з префіксом `NEXT_PUBLIC_`.

---

## 7. Реальні імена людей у коді, назвах кейсів та ботів

Нижче наведено повний вичерпний перелік місць, де використовуються прізвища викладачів/персон:

### 1. Прізвище "[Нейтралізовано]" / "[Нейтралізовано]ська":
* `supabase_full_games_update.sql:147-148` (`box_title := '[Нейтралізовано]ська заначка'`)
* `supabase_full_games_update.sql:194-196` (`box_title := '[Нейтралізовано]ська заначка'`)
* `supabase_update_cases_bj.sql:71-72` (`box_title := '[Нейтралізовано]ська заначка'`)
* `app/cases/page.tsx:11` (`type CaseType = "khokhlov" | ...`)
* `app/cases/page.tsx:29-30` (`id: "khokhlov", title: "[Нейтралізовано]ська заначка"`)
* `app/cases/page.tsx:123` (`p_box_type: "khokhlov"`)
* `app/cases/page.tsx:296` (`Безкоштовна «[Нейтралізовано]ська заначка»`)
* `app/online/page.tsx:147` (`username: "Адмін_[Нейтралізовано] [VIP]"`)

### 2. Прізвище "[Нейтралізовано]":
* `supabase_full_games_update.sql:151, 199` (`p_box_type = 'marchenko'`, `Світ [Нейтралізовано]`)
* `supabase_update_cases_bj.sql:75` (`Світ [Нейтралізовано]`)
* `app/cases/page.tsx:11, 42, 43` (`id: "marchenko", title: "Світ [Нейтралізовано]"`)
* `app/online/page.tsx:138, 139` (`id: "bot-marchenko-01", username: "[Нейтралізовано] [PRO-BOT]"`)

### 3. Ім'я "[Нейтралізовано]":
* `app/online/page.tsx:154, 155` (`id: "bot-syoma-03", username: "Одесит_[Нейтралізовано] [Блефує]"`)

### 4. Назва валюти "Бонуси (друга валюта)":
* Використовується наскрізно в інтерфейсі та базі даних (`profiles.hohlyantsi`, `app/auth-status-indicator.tsx`, `app/online/page.tsx`). Етичний/академічний ризик у разі публічної демонстрації роботи викладачам.

### 5. Прізвище студента/автора "Черкес":
* `docs/PR02_Cherkes_tema-08.md:9` (`[Студент]`)

* **Пропонований фікс:**
  * Замінити в SQL та UI `khokhlov` -> `veteran` ("Скриня Ветерана"), `marchenko` -> `cyber` ("Кібер Простір"), `admin` -> `legendary` ("Легендарна Скарбниця").
  * Замінити нікнейми ботів на нейтральні: `CyberDealer [PRO]`, `NeonMaster [VIP]`, `LuckyBluffer`.
  * Валюту `hohlyantsi` в інтерфейсі відображати як "Срібні Жетони" або "Silver Tokens" (не змінюючи назву колонки в базі або зробивши alias).

---

## 8. Регресії після редизайну /leagues та /leagues/[id]

* **Файли:**
  * `app/leagues/page.tsx`
  * `app/leagues/[id]/page.tsx`
* **Виявлені регресії та недоліки:**
  1. **Відсутність валідації дати при додаванні матчу (`app/leagues/[id]/page.tsx:473-488`):**
     * При редизайні було видалено перевірку:
       `if (!teamHome || !teamAway || !matchTime || Number.isNaN(matchDate.getTime()))`
     * Якщо творець ліги залишає поле дати порожнім, виклик `new Date("").toISOString()` призводить до фатальної помилки `RangeError: Invalid time value`. Вона перехоплюється блоком catch і виводить загальне повідомлення "Не вдалося додати матч", не пояснюючи причини.
  2. **Відсутність переходу до Колеса Фортуни (`/wheel`):**
     * На головній сторінці ліг (`/leagues`) посилання на Колесо є, проте всередині конкретної ліги (`/leagues/[id]`) посилання на `/wheel` повністю відсутнє в навігації, що ускладнює перехід для учасників турніру.
  3. **Прогнози після початку матчу (`app/leagues/[id]/page.tsx:402`):**
     * Форма на фронтенді приховується за умовою `!started`, але прямий запит `client.from("predictions").upsert(...)` не перевіряється сервером. Зловмисник може надіслати точний рахунок уже після завершення гри через Console.
  4. **Вихід та видалення ліги (`app/leagues/[id]/page.tsx:561-598`):**
     * Якщо лігу видаляє власник, вона видаляється через прямий `client.from("leagues").delete()`. Якщо в базі не налаштовано каскадне видалення `ON DELETE CASCADE` для `matches`, `predictions`, `bets`, запит поверне помилку `foreign_key_violation`.

---

## 9. Мобільна верстка (до 390px), prefers-reduced-motion та контрастність

* **Файли:**
  * `app/globals.css`
  * `app/online/page.tsx:812-850, 882`
  * `app/blackjack/page.tsx`
  * `app/dice/page.tsx`
  * `app/cases/page.tsx`
* **Проблеми та ризики:**
  1. **Відсутність `prefers-reduced-motion`:**
     * У проєкті активно використовуються Tailwind-анімації: `animate-pulse`, `animate-ping`, `animate-bounce`, анімації рулетки відкриття кейсів.
     * Жодного правила `@media (prefers-reduced-motion: reduce)` у `globals.css` чи класах `motion-reduce:*` немає. Для користувачів із вестибулярними порушеннями або увімкненим режимом економії руху постійне мерехтіння викликає дискомфорт.
     * **Фікс у `app/globals.css`:**
       ```css
       @media (prefers-reduced-motion: reduce) {
         *, ::before, ::after {
           animation-duration: 0.01ms !important;
           animation-iteration-count: 1 !important;
           transition-duration: 0.01ms !important;
         }
       }
       ```
  2. **Контрастність тексту (WCAG AA):**
     * Текст `text-slate-500` (#64748b) на глибокому темному фоні `#07090d` дає коефіцієнт контрасту лише **3.8:1** (норма WCAG AA — мінімум **4.5:1** для звичайного тексту).
     * Використання мікрошрифтів `text-[8px]`, `text-[9px]`, `text-[10px]` (наприклад, на сорочках карт "ТАЄМНИЦЯ", у підписах стакану коли) на екранах мобільних телефонів (360–390px) майже неможливо прочитати.
     * **Фікс:** Замінити критичні підписи на `text-slate-400` (#94a3b8, контраст > 5.5:1) та мінімальний розмір шрифту не менше `text-xs` (12px).
  3. **Мобільна адаптивність на екранах до 390px:**
     * **Шапка навігації (`/online` та `/blackjack`):** На мобільних екранах посилання "До ліг", "Соло Блекджек", "Кості", "Кейси" та плашки балансу збираються у 4-5 поверхів, займаючи до 50% першого екрана.
     * **Стіл гри:** Клас `rounded-[2.5rem]` на екранах 375-390px "з'їдає" по 20px корисної ширини з кожного боку. На мобільних доцільно використовувати `rounded-2xl` або `rounded-3xl sm:rounded-[2.5rem]`.
     * **Картки гравців:** При випаданні 4 і більше карт контейнер `flex flex-wrap` розриває ряд карток на нерівні частини. Необхідно додати горизонтальний скрол або зменшення масштабу карток при збільшенні їх кількості.

---

## 🎯 Пріоритетний план виправлень (Action Plan)

1. **Етап 1 (Критичний):**
   * Закрити функцію `open_loot_box` серверною перевіркою 24-годинного кулдауну.
   * Додати блокування `FOR UPDATE` у функціях `respond_duel_invite` та `pvp_bj_action`.
   * Заборонити клієнтське оновлення колонок `coins` та `hohlyantsi` у `profiles`.
2. **Етап 2 (Безпека геймплею):**
   * Заборонити прямий `SELECT` колоди та чужих карток з `pvp_duels` і маскувати карти опонента у відповідях RPC.
   * Додати таймаут 60 сек для покинутих дуелей (`claim_duel_timeout`).
3. **Етап 3 (Академічна відповідність та редизайн):**
   * Замінити персональні прізвища викладачів на стилізовані ігрові назви.
   * Відновити валідацію дат у формі створення матчу та додати підтримку `prefers-reduced-motion`.
