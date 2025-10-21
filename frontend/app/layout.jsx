import "./globals.css";
import HeaderClient from "../components/HeaderClient";
import PageMotion from "../components/PageMotion";
import ClusterHealthBar from "../components/ClusterHealthBar";
import ToasterTheme from "../components/ToasterTheme";

export const metadata = { title: "SaaS Simulator", description: "Multitenant admin dashboard" };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <HeaderClient />
        <ClusterHealthBar apiBase={process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000"} />
        <main className="container mx-auto p-4 md:p-6"><PageMotion>{children}</PageMotion></main>
        <ToasterTheme />
      </body>
    </html>
  );
}
