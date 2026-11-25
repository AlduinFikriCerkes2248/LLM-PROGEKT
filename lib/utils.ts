import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Об'єднання Tailwind-класів без конфліктів */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
