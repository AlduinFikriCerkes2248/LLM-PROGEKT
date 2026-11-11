import type { Match } from "@/lib/data/matches";
import { db } from "./client";

type MatchRow = {
  id: string;
  league_id: string;
  team_home: string;
  team_away: string;
  match_time: string;
  status: "planned" | "finished";
  home_score: number | null;
  away_score: number | null;
  venue?: string | null;
};

function toMatch(row: MatchRow): Match {
  return {
    id: row.id,
    league_id: row.league_id,
    team_home: row.team_home,
    team_away: row.team_away,
    match_time: row.match_time,
    status: row.status,
    home_score: row.home_score,
    away_score: row.away_score,
    venue: row.venue ?? "Головна арена",
  };
}

export async function listMatches(leagueId: string): Promise<Match[]> {
  const { data, error } = await db()
    .from("matches")
    .select("id, league_id, team_home, team_away, match_time, status, home_score, away_score, venue")
    .eq("league_id", leagueId)
    .order("match_time");

  if (error) throw new Error(error.message);
  return (data as MatchRow[]).map(toMatch);
}

export async function getMatch(id: string): Promise<Match | null> {
  const { data, error } = await db()
    .from("matches")
    .select("id, league_id, team_home, team_away, match_time, status, home_score, away_score, venue")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? toMatch(data as MatchRow) : null;
}

export async function createMatch(input: {
  league_id: string;
  team_home: string;
  team_away: string;
  match_time: string;
  venue?: string;
}): Promise<Match> {
  if (!input.team_home?.trim() || !input.team_away?.trim()) {
    throw new Error("Команди матчу є обов'язковими");
  }

  const { data, error } = await db()
    .from("matches")
    .insert({
      league_id: input.league_id,
      team_home: input.team_home.trim(),
      team_away: input.team_away.trim(),
      match_time: input.match_time,
      status: "planned",
      venue: input.venue ?? "Головна арена",
    })
    .select("id, league_id, team_home, team_away, match_time, status, home_score, away_score, venue")
    .single();

  if (error) throw new Error(error.message);
  return toMatch(data as MatchRow);
}
