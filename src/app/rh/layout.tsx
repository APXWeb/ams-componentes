import type { Metadata } from "next";
import "./rh.css";

export const metadata: Metadata = {
  title: { default: "RH AMS", template: "%s · RH AMS" },
  robots: { index: false, follow: false },
};

export default function RhRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
