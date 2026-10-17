import React from "react";
import { cn } from "./cn";

interface ChipProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "default" | "warning" | "success";
}

const toneClass = {
  default: "",
  warning: "ui-chip-warning",
  success: "ui-chip-success",
} as const;

const Chip: React.FC<ChipProps> = ({
  tone = "default",
  className,
  children,
  ...rest
}) => (
  <span className={cn("ui-chip", toneClass[tone], className)} {...rest}>
    {children}
  </span>
);

export default Chip;
