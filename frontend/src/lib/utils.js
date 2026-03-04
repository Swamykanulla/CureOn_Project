import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { enUS, hi, te } from "date-fns/locale";
import i18next from "i18next";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export const getDateLocale = () => {
  switch (i18next.language) {
    case 'hi':
      return hi;
    case 'te':
      return te;
    default:
      return enUS;
  }
};
