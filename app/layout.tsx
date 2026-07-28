import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hyderabad Property Map",
  description: "Browse rent, sale, sharing, and requirement posts around Hyderabad.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
