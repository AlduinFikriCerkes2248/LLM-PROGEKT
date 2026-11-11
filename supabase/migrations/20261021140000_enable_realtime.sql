-- Міграція: Увімкнення Supabase Realtime для оновлення прогнозів і турнірної таблиці (ПР 5)
alter publication supabase_realtime add table public.predictions;
alter publication supabase_realtime add table public.league_members;
