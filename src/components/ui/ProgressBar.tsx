import React from "react";
import { cn } from "./cn";

interface ProgressBarProps {
  /** 0 ~ 1 */
  value: number;
  label: string;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ value, label, className }) => {
  const ratio = Math.min(1, Math.max(0, value));
  return (
    <div
      className={cn("ui-progress", className)}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
    >
      <div
        className="ui-progress-fill"
        style={{ transform: `scaleX(${ratio})` }}
      />
    </div>
  );
};

export default ProgressBar;
