import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { RadioGroup } from "./RadioGroup.tsx";

const OPTIONS = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "system", label: "System" },
] as const;

function Harness() {
  const [value, setValue] = useState<"light" | "dark" | "system">("light");
  return <RadioGroup label="Theme" options={OPTIONS} value={value} onValueChange={setValue} />;
}

describe("<RadioGroup>", () => {
  it("shows three radios in one named group, one checked", () => {
    render(<Harness />);
    expect(screen.getByRole("radiogroup", { name: "Theme" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getAllByRole("radio", { checked: true })).toHaveLength(1);
    expect(screen.getByRole("radio", { name: "Light" })).toBeChecked();
  });

  it("moves and chooses with the arrow keys, and one stays checked", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.tab();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: "Dark" })).toBeChecked();
    expect(screen.getAllByRole("radio", { checked: true })).toHaveLength(1);
  });
});
