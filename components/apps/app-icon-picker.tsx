"use client";

import { useState } from "react";
import { AppIcon } from "@/components/apps/app-icon";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  APP_ICON_OPTIONS,
  DEFAULT_APP_ICON_KEY,
  resolveAppIconKey,
  type AppIconKey,
} from "@/lib/apps/app-icons";
import { cn } from "@/lib/utils";

type AppIconPickerProps = {
  name?: string;
  defaultValue?: string | null;
  error?: string;
};

export function AppIconPicker({
  name = "icon",
  defaultValue,
  error,
}: AppIconPickerProps) {
  const [selected, setSelected] = useState<AppIconKey>(
    defaultValue ? resolveAppIconKey(defaultValue) : DEFAULT_APP_ICON_KEY
  );

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">Application icon</legend>
      <p className="text-xs leading-5 text-muted-foreground">
        Choose the visual identifier staff will see in the app catalogue.
      </p>
      <RadioGroup
        name={name}
        value={selected}
        onValueChange={(value) => setSelected(resolveAppIconKey(value))}
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        aria-invalid={Boolean(error)}
      >
        {APP_ICON_OPTIONS.map((option) => {
          const checked = option.key === selected;
          const id = `${name}-${option.key}`;
          return (
            <Label
              key={option.key}
              htmlFor={id}
              className={cn(
                "relative flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border bg-background p-3 text-center transition-colors hover:bg-accent focus-within:ring-2 focus-within:ring-ring",
                checked && "border-primary bg-primary/5 text-primary"
              )}
            >
              <RadioGroupItem
                id={id}
                value={option.key}
                className="absolute right-2 top-2"
                aria-label={option.label}
              />
              <AppIcon icon={option.key} className="size-7" strokeWidth={1.8} />
              <span className="text-xs leading-4">{option.label}</span>
            </Label>
          );
        })}
      </RadioGroup>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </fieldset>
  );
}
