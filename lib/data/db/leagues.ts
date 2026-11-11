import type { League } from "@/lib/data/leagues";
import { db } from "./client";

type LeagueRow = {
  id: string;
  title: string;
  invite_code: string;
  owner_id: string;
};

function toLeague(row: LeagueRow): League {
  return {
    id: row.id,
    title: row.title,
    invite_code: row.invite_code,
    owner_id: row.owner_id,
  };
}

export async function listLeagues(): Promise<League[]> {
  const { data, error } = await db()
    .from("leagues")
    .select("id, title, invite_code, owner_id")
    .order("id");

  if (error) throw new Error(error.message);
  return (data as LeagueRow[]).map(toLeague);
}

export async function getLeague(id: string): Promise<League | null> {
  const { data, error } = await db()
    .from("leagues")
    .select("id, title, invite_code, owner_id")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? toLeague(data as LeagueRow) : null;
}

export async function createLeague(input: { title: string }): Promise<League> {
  if (!input.title || input.title.trim().length === 0) {
    throw new Error("Назва ліги не може бути порожньою");
  }

  const generatedInvite = Math.random().toString(36).substring(2, 14).toUpperCase();
  const { data, error } = await db()
    .from("leagues")
    .insert({
      title: input.title.trim(),
      invite_code: generatedInvite,
      owner_id: "00000000-0000-0000-0000-000000000000",
    })
    .select("id, title, invite_code, owner_id")
    .single();

  if (error) throw new Error(error.message);
  return toLeague(data as LeagueRow);
}

export async function deleteLeague(id: string): Promise<void> {
  const { error } = await db()
    .from("leagues")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}
