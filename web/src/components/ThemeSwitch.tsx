import { useState } from "react";
import { THEMES, applyTheme, readTheme, saveTheme, type Theme } from "../theme.ts";
import { RadioGroup } from "./ui/RadioGroup.tsx";

/** Light, Dark or System, kept on this device. A RadioGroup: nothing goes to the server (base-ui rule 16). */
export function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  return (
    <RadioGroup
      label="Theme"
      options={THEMES}
      value={theme}
      onValueChange={(next) => {
        setTheme(next);
        saveTheme(next);
        applyTheme(next);
      }}
    />
  );
}
