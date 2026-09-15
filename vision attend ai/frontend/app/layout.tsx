import "./globals.css";
import type { Metadata } from "next";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "VisionAttend AI — Intelligent Workforce Identity & Attendance",
  description:
    "Enterprise Computer Vision Attendance & Face Validation Platform. Face recognition, liveness detection, analytics, role-based access.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
