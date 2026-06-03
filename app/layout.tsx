import "./globals.css";

export const metadata = {
  title: "AI Chat",
  description: "My AI chatbot",
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