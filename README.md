# UP Training Center

UP Training Center es una aplicación educativa instalable y local-first para aprender
C#, Java, SQL, Entity Framework Core, ASP.NET MVC, AJAX y microservicios.

La primera versión incluye:

- ruta de 36 semanas organizada por dominio;
- laboratorio con retroalimentación específica por error;
- preguntas y problemas de entrevistas técnicas;
- progreso, XP, racha y dominio por tecnología;
- persistencia local con IndexedDB;
- exportación e importación de un respaldo JSON;
- manifiesto PWA y modo sin conexión.

## Ejecutar

Requiere Node.js 22.13 o posterior.

En Windows, abre PowerShell y entra al proyecto:

```bash
cd "C:\Users\luisg\OneDrive\Escritorio\Proyectos\RutaStack"
pnpm install
pnpm dev
```

La app queda disponible en [http://localhost:3000](http://localhost:3000).
Deja abierta la terminal mientras haces pruebas. Para detenerla, presiona
`Ctrl+C`.

## Validar

```bash
pnpm build
pnpm test
pnpm lint
pnpm exec tsc --noEmit
```

## Privacidad del progreso

El MVP no requiere cuenta. El progreso vive en IndexedDB dentro del dispositivo.
La vista **Progreso** permite descargar y restaurar una copia. La sincronización
entre dispositivos queda preparada como una fase posterior con cuentas y
almacenamiento cifrado.

## Estructura principal

- `app/components/LearningApp.tsx`: experiencia y estado de aprendizaje.
- `app/data.ts`: rutas, lecciones, ejercicios y entrevistas.
- `app/manifest.ts`: instalación PWA.
- `public/sw.js`: caché del shell para uso sin conexión.
- `docs/PRODUCT-PLAN.md`: plan pedagógico y técnico.
