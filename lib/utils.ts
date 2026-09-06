import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "display-xl",
            "display-lg",
            "display-lg-code",
            "display-md",
            "display-sm",
            "heading-xl",
            "heading-lg",
            "heading-md",
            "heading-sm",
            "body-md",
            "body-md-bold",
            "body-sm",
            "label-md",
            "label-md-bold",
            "label-md-caps",
            "label-sm",
            "label-xs",
            "action-button",
          ],
        },
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}