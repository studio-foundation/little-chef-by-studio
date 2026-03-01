"use client";

import React from "react";

// Minimal Slot — clones the child element injecting button props
function Slot({
  children,
  ...props
}: { children: React.ReactElement } & React.HTMLAttributes<HTMLElement>) {
  return React.cloneElement(children, {
    ...props,
    ...children.props,
    className: [props.className, children.props.className]
      .filter(Boolean)
      .join(" "),
  });
}

const variantClasses = {
  primary:
    "rounded-xl bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(196,96,45,0.35)] active:translate-y-0",
  outline:
    "rounded-xl border border-[var(--color-border)] bg-white text-[var(--color-text-muted)] hover:bg-[#f5f5f5]",
  ghost:
    "rounded-xl bg-[#f5f1eb] text-[var(--color-primary)] hover:bg-[#ede8e1]",
  icon: "h-9 w-9 rounded-full bg-white/85 hover:bg-white hover:scale-110",
};

const sizeClasses = {
  sm: "px-5 py-2.5 text-sm",
  md: "px-6 py-3 text-sm font-semibold",
  lg: "px-7 py-3 text-[15px] font-bold shadow-[0_4px_16px_rgba(196,96,45,0.3)]",
};

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "outline" | "ghost" | "icon";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  asChild?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  isLoading = false,
  asChild = false,
  className = "",
  disabled,
  children,
  ...props
}: ButtonProps) {
  const isIcon = variant === "icon";

  const classes = [
    "inline-flex items-center justify-center transition-all",
    variantClasses[variant],
    !isIcon ? sizeClasses[size] : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  if (asChild && React.isValidElement(children)) {
    return (
      <Slot {...(props as React.HTMLAttributes<HTMLElement>)} className={classes}>
        {children as React.ReactElement}
      </Slot>
    );
  }

  const content = isLoading ? (
    <span className="inline-flex items-center gap-2">
      <span className="inline-block animate-[spin_1s_linear_infinite]">⟳</span>
      {children}
    </span>
  ) : (
    children
  );

  return (
    <button
      className={classes}
      disabled={disabled || isLoading}
      {...props}
    >
      {content}
    </button>
  );
}
