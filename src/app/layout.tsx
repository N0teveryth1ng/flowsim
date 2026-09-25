import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FlowSim — system design whiteboard",
  description:
    "Eraser-style architecture whiteboard with n8n-like alerts when demand exceeds throughput.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-[#121316] text-white">{children}</body>
    </html>
  );
}
