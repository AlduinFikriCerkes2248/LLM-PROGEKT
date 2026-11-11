import { beforeEach } from "vitest";
import { signInAs } from "./helpers/users";

beforeEach(async () => {
  await signInAs("A");
});
