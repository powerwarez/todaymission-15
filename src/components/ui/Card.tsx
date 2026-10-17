import React from "react";
import { cn } from "./cn";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** soft: 그림자 없는 안쪽 카드 */
  tone?: "default" | "soft";
}

const Card: React.FC<CardProps> = ({
  tone = "default",
  className,
  children,
  ...rest
}) => (
  <div
    className={cn(tone === "soft" ? "ui-card-soft" : "ui-card", className)}
    {...rest}
  >
    {children}
  </div>
);

export default Card;
