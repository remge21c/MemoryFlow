import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MemoryFlow",
  description: "Project-based travel memory collection and storybook creation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
