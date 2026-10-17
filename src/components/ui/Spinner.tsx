import React from "react";
import { cn } from "./cn";

interface SpinnerProps {
  className?: string;
  label?: string;
}

/** 중앙 정렬 로딩 표시 */
const Spinner: React.FC<SpinnerProps> = ({ className, label }) => (
  <div
    className={cn("flex flex-col items-center justify-center gap-3 py-8", className)}
    role="status"
  >
    <span className="ui-spinner" aria-hidden="true" />
    {label && <p className="ui-text-sub font-semibold">{label}</p>}
    {!label && <span className="sr-only">로딩 중</span>}
  </div>
);

export default Spinner;
