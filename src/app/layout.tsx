import type { Metadata, Viewport } from "next";
import { Fredoka, Inter, Instrument_Sans } from "next/font/google";
import { cookies } from "next/headers";
import { THEME_COOKIE, themeFrom } from "@/lib/theme";
import "./globals.css";
import "./charts.css";
import "./styles/shell.css";
import "./styles/auth.css";
import "./styles/modal.css";
import "./styles/results.css";
import "./styles/insights.css";
import "./styles/email.css";
import "./styles/team.css";
import "./styles/account.css";
import "./styles/game.css";
import "./styles/game-level.css";
import "./styles/game-stamps.css";
import "./styles/game-board.css";
import "./styles/game-vivid.css";
import "./polish.css";
import "./styles/play.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const instrument = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument", display: "swap" });
/** The game's own type: rounded and friendly, for prizes, points, levels and stamps. */
const fredoka = Fredoka({ subsets: ["latin"], variable: "--font-fredoka", display: "swap" });

export const metadata: Metadata = {
  title: "Open Tracker",
  description: "See who opened the emails you send from Gmail.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fafaf8" },
    { media: "(prefers-color-scheme: dark)", color: "#141517" },
  ],
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Light or dark when the person chose one (Account > Appearance), otherwise the device decides.
  const theme = themeFrom((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html lang="en" data-theme={theme === "system" ? undefined : theme} className={`${inter.variable} ${instrument.variable} ${fredoka.variable}`}>
      <body>{children}</body>
    </html>
  );
}
