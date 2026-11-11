import { Radio } from "@base-ui/react/radio";
import { RadioGroup as BaseRadioGroup } from "@base-ui/react/radio-group";
import { useId, type ReactNode } from "react";

export interface RadioOption<Value extends string> {
  value: Value;
  label: ReactNode;
}

export interface RadioGroupProps<Value extends string> {
  label: ReactNode;
  options: readonly RadioOption<Value>[];
  value: Value;
  onValueChange: (value: Value) => void;
}

/**
 * One choice from a few, stacked with a mark each. Tab enters the group, and arrow keys move and choose
 * (base-ui rule 16): for a setting kept on the device, where nothing goes to the server.
 */
export function RadioGroup<Value extends string>({ label, options, value, onValueChange }: RadioGroupProps<Value>) {
  const labelId = useId();
  return (
    <div className="flex flex-col gap-1.5">
      <div id={labelId} className="text-xs uppercase tracking-wide text-ink-dim">
        {label}
      </div>
      <BaseRadioGroup<Value>
        aria-labelledby={labelId}
        value={value}
        onValueChange={onValueChange}
        className="flex flex-wrap gap-x-4 gap-y-1"
      >
        {options.map((option) => (
          <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm">
            <Radio.Root
              value={option.value}
              className="flex size-4 shrink-0 cursor-pointer items-center justify-center border border-ink bg-panel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            >
              <Radio.Indicator className="size-2 bg-ink" />
            </Radio.Root>
            {option.label}
          </label>
        ))}
      </BaseRadioGroup>
    </div>
  );
}
