import type { Metadata } from "next";
import { headers } from "next/headers";
import { ServiceWorkerRegister } from "./components/ServiceWorkerRegister";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;
  const socialImage = new URL("/og.png", origin).toString();

  return {
    metadataBase: new URL(origin),
    title: {
      default: "RutaStack — Aprende desarrollo con profundidad",
      template: "%s · RutaStack",
    },
    description:
      "Ruta de aprendizaje práctica para dominar C#, Java, SQL, Entity Framework Core, MVC, AJAX y microservicios.",
    applicationName: "RutaStack",
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "RutaStack",
    },
    formatDetection: {
      telephone: false,
    },
    icons: {
      icon: "/icon-192.png",
      shortcut: "/icon-192.png",
      apple: "/icon-192.png",
    },
    openGraph: {
      type: "website",
      locale: "es_MX",
      siteName: "RutaStack",
      title: "RutaStack — Aprende. Practica. Explica.",
      description:
        "Domina desarrollo backend con práctica, retroalimentación e entrevistas técnicas.",
      images: [
        {
          url: socialImage,
          width: 1728,
          height: 912,
          alt: "RutaStack — Aprende. Practica. Explica.",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "RutaStack — Aprende. Practica. Explica.",
      description:
        "C#, Java, SQL y microservicios con una ruta práctica y profunda.",
      images: [socialImage],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
