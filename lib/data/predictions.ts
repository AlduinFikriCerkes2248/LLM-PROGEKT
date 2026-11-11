export type Prediction = {
  id: string;
  user_id: string;
  match_id: string;
  predicted_home_score: number;
  predicted_away_score: number;
  points_earned?: number | null;
};

export {
  listPredictions,
  submitPrediction,
} from "./db/predictions";
