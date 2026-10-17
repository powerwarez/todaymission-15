import React from "react";
import { cn } from "./cn";

interface PageHeaderProps {
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  /** 우측 영역 (날짜 선택 등) */
  actions?: React.ReactNode;
  className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  icon,
  actions,
  className,
}) => (
  <div
    className={cn(
      "flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6",
      className
    )}
  >
    <div className="min-w-0">
      <h1 className="ui-page-title flex items-center gap-3">
        {icon && (
          <span
            className="inline-flex items-center justify-center flex-none"
            style={{
              width: 44,
              height: 44,
              backgroundColor: "var(--ui-accent)",
              color: "var(--ui-on-accent)",
              border: "var(--ui-bw) solid var(--ui-ink)",
              borderRadius: "var(--ui-radius-md)",
              boxShadow: "var(--ui-shadow-sm)",
            }}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <span className="min-w-0 break-words">{title}</span>
      </h1>
      {description && (
        <p className="ui-text-sub mt-2 font-medium">{description}</p>
      )}
    </div>
    {actions && <div className="flex-none">{actions}</div>}
  </div>
);

export default PageHeader;
