# UP Training Center

UP Training Center es una aplicación educativa instalable y local-first para aprender
C#, Java, SQL, Entity Framework Core, ASP.NET MVC, AJAX y microservicios.

La primera versión incluye:

- registro e inicio de sesión local con correo, usuario y contraseña protegida;
- progreso independiente para cada cuenta de esta instalación;
- ruta de 36 semanas organizada por dominio;
- laboratorio con retroalimentación específica por error;
- preguntas y problemas de entrevistas técnicas;
- progreso, XP, racha y dominio por tecnología;
- persistencia local con IndexedDB;
- exportación e importación de un respaldo JSON;
- manifiesto PWA y modo sin conexión.

## Probar el ejecutable

Abre esta carpeta:

```text
C:\Users\luisg\OneDrive\Escritorio\Proyectos\UP Training Center
```

Ejecuta `UP Training Center.exe`. Es una versión portátil: no requiere
instalador y guarda las cuentas y el progreso en el perfil local de Windows.

## Ejecutar desde el código

Requiere Node.js 22.13 o posterior.

En Windows, abre PowerShell y entra al proyecto:

```bash
cd "C:\Users\luisg\OneDrive\Escritorio\Proyectos\UP Training Center"
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

Para construir otra copia del ejecutable:

```bash
pnpm desktop:dist
```

El resultado se genera en `release\UP Training Center.exe`.

## Privacidad del progreso

Las cuentas se verifican dentro de esta instalación. La contraseña se deriva con
PBKDF2 y una sal aleatoria; no se guarda como texto. El correo no recibe un
código y no existe recuperación remota de contraseña en esta versión.

El progreso vive en IndexedDB y queda separado por usuario. La vista
**Progreso** permite descargar y restaurar una copia. La sincronización entre
dispositivos y la verificación real de propiedad del correo requieren una fase
posterior con servidor y servicio de correo.

## Estructura principal

- `app/components/LearningApp.tsx`: experiencia y estado de aprendizaje.
- `app/components/AuthGate.tsx`: registro e inicio de sesión local.
- `app/localDatabase.ts`: cuentas y progreso en IndexedDB.
- `app/data.ts`: rutas, lecciones, ejercicios y entrevistas.
- `desktop/main.cjs`: contenedor seguro de escritorio con Electron.
- `app/manifest.ts`: instalación PWA.
- `public/sw.js`: caché del shell para uso sin conexión.
- `docs/PRODUCT-PLAN.md`: plan pedagógico y técnico.
