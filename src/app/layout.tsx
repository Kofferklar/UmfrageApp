import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "GAD Survey",
  description: "Interne Befragung zu Vertrauen in medizinische KI-Entscheidungen.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
