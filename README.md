# UP Training Center

UP Training Center es una aplicación educativa multiplataforma para aprender
C#, Java, SQL, Entity Framework Core, ASP.NET MVC, AJAX y microservicios.

La aplicación incluye:

- registro central con correo, usuario y contraseña;
- verificación del correo con código y recuperación de contraseña;
- progreso sincronizado entre dispositivos;
- copia local para continuar temporalmente sin conexión;
- ruta de 36 semanas organizada por dominio;
- laboratorio con retroalimentación específica por error;
- preguntas y problemas de entrevistas técnicas;
- exportación e importación de un respaldo JSON;
- eliminación completa de la cuenta desde la aplicación;
- proyectos para Windows, web/PWA, Android y iOS.

## Dónde viven las cuentas

Las cuentas ya no se guardan dentro de una sola computadora. Supabase conserva:

- la identidad y contraseña protegida en su sistema `auth`;
- el correo y nombre de usuario en `public.profiles`;
- el progreso individual en `public.learning_progress`.

Las políticas RLS limitan cada perfil y progreso a su propietario. IndexedDB
solo conserva una copia local por usuario para uso sin conexión; las
credenciales locales de la versión anterior se eliminan al actualizar.

## Configuración obligatoria

Antes de probar el registro real, sigue
[CLOUD-SETUP.md](docs/CLOUD-SETUP.md). Debes crear el proyecto de Supabase,
aplicar la migración, desplegar la función de eliminación y agregar dos valores
públicos a `.env.local`.

Sin esos valores la app muestra una pantalla de configuración pendiente y no
permite crear cuentas falsas o aisladas.

## Ejecutar desde el código

Requiere Node.js 22.13 o posterior.

Para ver y editar todo el código, abre `UP Training Center.code-workspace` con
Visual Studio Code.

```powershell
cd "C:\Users\luisg\OneDrive\Escritorio\Proyectos\UP Training Center"
pnpm install
pnpm dev
```

Abre [http://localhost:3000](http://localhost:3000). Para detenerla presiona
`Ctrl+C`.

## Compilar para cada plataforma

```powershell
# Windows portable
pnpm desktop:dist

# Sincronizar los proyectos móviles
pnpm mobile:sync

# Abrir Android Studio
pnpm mobile:android

# Abrir Xcode, únicamente desde macOS
pnpm mobile:ios
```

El ejecutable de Windows queda en `release\UP Training Center.exe`. Los pasos
de firma y publicación están en
[STORE-RELEASE.md](docs/STORE-RELEASE.md).

## Validar

```powershell
pnpm test
pnpm exec tsc --noEmit
pnpm lint
pnpm build
pnpm desktop:build
```

## Estructura principal

- `app/components/AuthGate.tsx`: registro, verificación, recuperación y acceso.
- `app/components/LearningApp.tsx`: experiencia y estado de aprendizaje.
- `app/progressRepository.ts`: sincronización nube/copia local.
- `app/localDatabase.ts`: caché IndexedDB sin credenciales.
- `supabase/migrations`: tablas, políticas RLS y perfil automático.
- `supabase/functions/delete-account`: eliminación segura de la cuenta.
- `android` e `ios`: proyectos nativos de Capacitor.
- `desktop/main.cjs`: contenedor de escritorio con Electron.
- `docs/PRIVACY-POLICY-DRAFT.md`: borrador que debe completar la empresa.
