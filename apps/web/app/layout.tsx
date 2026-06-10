import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Intersection Ops",
  description:
    "Decision-support landing and dashboard for smart intersection traffic operations"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
