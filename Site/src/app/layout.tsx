import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Christopher Sardo — Designer",
  description: "Selected graphic and motion design work by Christopher Sardo.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href="https://use.typekit.net/zry8vyi.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}
