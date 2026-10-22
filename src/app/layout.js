import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import AuraProviders from "@/components/AuraProviders";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const outfit = Outfit({ variable: "--font-outfit", subsets: ["latin"], display: "swap" });

export const metadata = {
  title: "AURA AI — Adaptive Human Wellness Intelligence",
  description:
    "A next-generation cognitive wellness operating system. AURA monitors your mental state, predicts burnout, prevents cognitive overload, and guides intelligent recovery — in real time.",
  keywords: ["AI", "Cognitive Wellness", "Mental Health", "Burnout Prevention", "Productivity", "Computer Vision", "Adaptive Intelligence"],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${inter.variable} ${outfit.variable} antialiased`}
        style={{
          background: "#02020f",
          color: "#e8e8f0",
          fontFamily: "'Inter', system-ui, sans-serif",
          minHeight: "100vh",
        }}
      >
        <AuraProviders>{children}</AuraProviders>
      </body>
    </html>
  );
}
