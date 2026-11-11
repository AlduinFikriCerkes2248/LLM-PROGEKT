import type { Prediction } from "@/lib/data/predictions";
import { db } from "./client";

type PredictionRow = {
  id: string;
  user_id: string;
  match_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
  points_earned: number | null;
};

function toPrediction(row: PredictionRow): Prediction {
  return {
    id: row.id,
    user_id: row.user_id,
    match_id: row.match_id,
    predicted_home_score: row.predicted_home_score,
    predicted_away_score: row.predicted_away_score,
    points_earned: row.points_earned,
  };
}

export async function listPredictions(matchId: string): Promise<Prediction[]> {
  const { data, error } = await db()
    .from("predictions")
    .select("id, user_id, match_id, predicted_home_score, predicted_away_score, points_earned")
    .eq("match_id", matchId);

  if (error) throw new Error(error.message);
  return (data as PredictionRow[]).map(toPrediction);
}

export async function submitPrediction(input: {
  user_id: string;
  match_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
}): Promise<Prediction> {
  if (input.predicted_home_score < 0 || input.predicted_away_score < 0) {
    throw new Error("Прогнозований рахунок не може бути від'ємним");
  }

  const { data, error } = await db()
    .from("predictions")
    .insert({
      user_id: input.user_id,
      match_id: input.match_id,
      predicted_home_score: input.predicted_home_score,
      predicted_away_score: input.predicted_away_score,
    })
    .select("id, user_id, match_id, predicted_home_score, predicted_away_score, points_earned")
    .single();

  if (error) throw new Error(error.message);
  return toPrediction(data as PredictionRow);
}
