# Preparación para Windows, Google Play y App Store

Los proyectos nativos usan el identificador:

```text
com.upconsultancy.trainingcenter
```

No lo cambies después de publicar: las tiendas lo tratan como la identidad
permanente de la aplicación.

## Antes de generar paquetes

1. Completa `docs/CLOUD-SETUP.md`, incluidas las plataformas de Appwrite.
2. Publica la misma aplicación en una URL HTTPS pública y coloca esa dirección
   en `VITE_APPWRITE_PUBLIC_URL`.
3. Despliega y prueba la función Appwrite `delete-account`.
4. Sustituye los campos pendientes de `docs/PRIVACY-POLICY-DRAFT.md`.
5. Publica la política de privacidad en una URL de UP Consultancy Services.
6. Usa la ruta pública `/delete-account` como recurso externo de eliminación
   en Play Console.
7. Prueba registro, verificación, sincronización, recuperación y eliminación.
8. Conserva fuera del repositorio las claves de firma y sus contraseñas.

## Windows

```powershell
pnpm desktop:dist
```

Resultado:

```text
release\UP Training Center.exe
```

Es un ejecutable portable para Windows x64. Para Microsoft Store hará falta un
paquete MSIX firmado; el portable sirve para pruebas directas.

El ejecutable incorpora las variables `VITE_APPWRITE_*` al compilar. La URL
pública es indispensable para que los enlaces de verificación y recuperación
funcionen aunque el ejecutable use archivos locales.

## Android / Google Play

Capacitor 8 requiere Node 22, Android Studio 2025.2.1 o posterior y un Android
SDK. Android Studio instala el JDK apropiado.

```powershell
pnpm mobile:sync
pnpm mobile:android
```

En Android Studio:

1. selecciona un teléfono o emulador y ejecuta la variante Debug;
2. prueba al menos Android 7/API 24 y una versión actual;
3. usa **Build > Generate Signed Bundle / APK > Android App Bundle**;
4. crea y respalda el upload key;
5. sube el `.aab` a una pista de prueba interna;
6. completa Data safety, política de privacidad y la URL pública
   `https://TU_DOMINIO/delete-account`.

Google Play exige Android App Bundle para aplicaciones nuevas y Play App
Signing debe configurarse antes de producción.

## iPhone y iPad / App Store

La compilación iOS requiere macOS, Xcode 26 o posterior y una membresía activa
de Apple Developer.

En la Mac:

```bash
pnpm install
pnpm mobile:sync
pnpm mobile:ios
```

En Xcode:

1. selecciona el Team de UP Consultancy Services;
2. confirma el Bundle Identifier;
3. prueba en simulador y dispositivo físico;
4. configura versión y número de compilación;
5. usa **Product > Archive** y distribuye a App Store Connect;
6. completa App Privacy, la URL de privacidad y las notas de revisión.

Apple exige que las apps con creación de cuentas permitan iniciar la
eliminación dentro de la app. UP Training Center ya ofrece esa opción en
**Progreso > Cuenta y privacidad**; debe probarse contra la función Appwrite
real antes de enviar la compilación.

## Web y PWA

La publicación necesita las variables públicas de Appwrite en el entorno de
compilación. El dominio público debe registrarse como plataforma Web en
Appwrite. No publiques una compilación que muestre “Falta conectar el servicio
central de cuentas”.

## Estado de este equipo Windows

El proyecto Android está generado, pero para compilar el `.aab` se necesita
Android Studio y el SDK. El proyecto iOS también está generado, pero Apple solo
permite compilarlo y firmarlo desde macOS/Xcode.
