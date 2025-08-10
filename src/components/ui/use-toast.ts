"use client";

import { toast as sonnerToast } from "sonner";

type ToastOptions = {
    title?: React.ReactNode;
    description?: React.ReactNode;
    variant?: "default" | "destructive";
};

export function useToast() {
  const toast = ({ title, description, variant }: ToastOptions) => {
    if (variant === "destructive") {
      sonnerToast.error(title, { description });
    } else {
      sonnerToast.success(title, { description });
    }
  };
  return { toast };
}
