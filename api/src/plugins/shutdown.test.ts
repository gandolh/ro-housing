import { describe, expect, it } from "vitest";
import { testApp } from "../testing/test-app.ts";

describe("shutdown", () => {
  it("aborts the signal when the app starts to close, before the requests in flight are waited for", async () => {
    const app = await testApp(async (a) => {
      a.get("/hold", async () => {
        await new Promise((resolve) => a.shutdownSignal.addEventListener("abort", resolve));
        return { aborted: a.shutdownSignal.aborted };
      });
    });
    expect(app.shutdownSignal.aborted).toBe(false);
    const held = app.inject({ url: "/hold" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    await app.close();
    expect((await held).json()).toEqual({ aborted: true });
  });
});
