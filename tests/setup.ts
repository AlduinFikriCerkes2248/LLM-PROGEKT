import { beforeEach, vi } from "vitest";
import { modelDisabled } from "./helpers/model";
import { signInAs } from "./helpers/users";
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));
beforeEach(async () => {
  vi.unstubAllEnvs();
  vi.stubEnv("AI_USER_LIMIT_PER_HOUR", "1000000");
  vi.stubEnv("AI_APP_LIMIT_PER_DAY", "1000000");
  modelDisabled();
  await signInAs("A");
});
