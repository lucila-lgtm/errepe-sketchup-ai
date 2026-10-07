import "./globals.css";

export const metadata = {
  title: "ERREPÉ SketchUp AI",
  description: "Generador de escenas para SketchUp Web",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
