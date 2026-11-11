export type Match = {
  id: string;
  league_id: string;
  team_home: string;
  team_away: string;
  match_time: string;
  status: "planned" | "finished";
  home_score?: number | null;
  away_score?: number | null;
  venue?: string;
};

export {
  listMatches,
  getMatch,
  createMatch,
} from "./db/matches";
