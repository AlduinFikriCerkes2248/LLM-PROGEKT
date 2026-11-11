export type League = {
  id: string;
  title: string;
  invite_code: string;
  owner_id: string;
};

export {
  listLeagues,
  getLeague,
  createLeague,
  deleteLeague,
} from "./db/leagues";
