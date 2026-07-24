import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "UP Training Center — Formación tecnológica profunda",
    short_name: "UP Training",
    description:
      "C#, Java, SQL, Entity Framework, MVC, AJAX y microservicios con práctica y entrevistas.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f0e8",
    theme_color: "#8f1824",
    lang: "es-MX",
    orientation: "any",
    categories: ["education", "developer", "productivity"],
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
