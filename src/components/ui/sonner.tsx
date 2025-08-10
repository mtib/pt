"use client";

import { Toaster as Sonner } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  return (
    <Sonner
      toastOptions={{
        classNames: {
          toast: isDark
            ? "bg-neutral-900 text-neutral-100 border border-neutral-800 shadow-lg"
            : "bg-white text-neutral-900 border border-neutral-200 shadow-lg",
          description: isDark ? "text-neutral-300" : "text-neutral-600",
          actionButton: "bg-blue-600 text-white",
          cancelButton: isDark
            ? "bg-neutral-800 text-neutral-300"
            : "bg-neutral-100 text-neutral-700",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
