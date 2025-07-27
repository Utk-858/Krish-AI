import { cn } from "@/lib/utils";
import type { SVGProps } from "react";

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn("text-primary", props.className)}
      {...props}
    >
      <title>KrishAI Logo</title>
      <path d="M7 20-4-4" />
      <path d="M12.24 12.24a6 6 0 0 0 7.52 7.52" />
      <path d="M16.5 10.5a6 6 0 0 1-8-8" />
      <path d="M18.57 15.43A6 6 0 0 1 10 18" />
      <path d="M14 10c-1.93 2.5-4.32 4-7 4" />
    </svg>
  );
}
