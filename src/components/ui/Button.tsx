import React from "react";
import { cn } from "./cn";

export type ButtonVariant = "primary" | "secondary" | "soft" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** 아이콘만 있는 정사각 버튼 (aria-label 필수) */
  iconOnly?: boolean;
  block?: boolean;
  loading?: boolean;
}

const variantClass: Record<ButtonVariant, string> = {
  primary: "ui-btn-primary",
  secondary: "",
  soft: "ui-btn-soft",
  danger: "ui-btn-danger",
  ghost: "ui-btn-ghost",
};

const sizeClass: Record<ButtonSize, string> = {
  sm: "ui-btn-sm",
  md: "",
  lg: "ui-btn-lg",
};

const Button: React.FC<ButtonProps> = ({
  variant = "secondary",
  size = "md",
  iconOnly = false,
  block = false,
  loading = false,
  type = "button",
  className,
  disabled,
  children,
  ...rest
}) => (
  <button
    type={type}
    className={cn(
      "ui-btn",
      variantClass[variant],
      sizeClass[size],
      iconOnly && "ui-btn-icon",
      block && "ui-btn-block",
      className
    )}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    {...rest}
  >
    {loading && <span className="ui-spinner" style={{ width: "1.1rem", height: "1.1rem", borderWidth: "3px" }} aria-hidden="true" />}
    {children}
  </button>
);

export default Button;
