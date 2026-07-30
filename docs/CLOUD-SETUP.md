# Configuración de Appwrite para cuentas y progreso

Este proyecto ya apunta a la instancia de Appwrite de UP Training Center:

```dotenv
VITE_APPWRITE_PROJECT_ID=6a6bd26500326fd9d3ac
VITE_APPWRITE_PROJECT_NAME=UP-TC
VITE_APPWRITE_ENDPOINT=https://sfo.cloud.appwrite.io/v1
```

Estos valores identifican el proyecto y son públicos por diseño. Nunca pongas
una API key de servidor en `.env.local`, en el ejecutable o en una app móvil.

## 1. Registrar las plataformas

En Appwrite Console abre el proyecto **UP-TC** y entra a **Overview > Add
platform**.

Agrega:

1. una plataforma **Web** con hostname `localhost` para desarrollo;
2. otra plataforma **Web** con el dominio HTTPS definitivo de la aplicación;
3. una plataforma **Android** con package name
   `com.upconsultancy.trainingcenter`;
4. una plataforma **Apple** con bundle ID
   `com.upconsultancy.trainingcenter`.

Appwrite rechaza el acceso desde un hostname o identificador que no esté
registrado. Para producción, la URL Web debe ser pública: los enlaces de
verificación y recuperación se abren desde el correo.

## 2. Activar correo y contraseña

En **Auth > Settings** deja habilitado **Email/Password**. Revisa además:

- la longitud y seguridad mínima de contraseñas;
- el remitente y las plantillas de correo;
- los límites de envío del plan;
- las políticas de correos gratuitos, desechables o con alias que quiera aplicar
  UP Consultancy Services.

La aplicación crea la cuenta con correo, nombre de usuario y contraseña. Luego
envía el enlace nativo de verificación de Appwrite y no permite entrar hasta que
`emailVerification` sea verdadero.

## 3. Configurar la URL de los correos

Copia `.env.example` como `.env.local`. Para el desarrollo local bastan las
tres variables del inicio: la aplicación usa automáticamente
`http://localhost:3000`.

Antes de compilar el ejecutable o las aplicaciones móviles agrega:

```dotenv
VITE_APPWRITE_PUBLIC_URL=https://TU_DOMINIO_PUBLICO
VITE_APPWRITE_DELETE_ACCOUNT_FUNCTION_ID=delete-account
```

`VITE_APPWRITE_PUBLIC_URL` debe coincidir con la plataforma Web registrada en
Appwrite y debe servir esta aplicación. Si cambias una variable, vuelve a
compilar y ejecuta `pnpm mobile:sync`.

## 4. Cómo se guarda el progreso

Appwrite Account conserva:

- correo y contraseña protegidos por Appwrite;
- nombre de usuario en el campo `name`;
- progreso y fecha de actualización en las preferencias privadas de la cuenta.

Las preferencias de cada cuenta solo se obtienen con su propia sesión. La app
mantiene también una copia en IndexedDB para continuar temporalmente sin
conexión y sincroniza la versión más reciente al recuperar internet.

No hace falta crear una base o tabla adicional para esta versión. Appwrite
limita las preferencias de usuario a 64 kB; el progreso actual está diseñado
para permanecer por debajo de ese límite. Si se agregan respuestas extensas,
archivos o contenido generado por usuarios, deberán pasar a TablesDB o Storage.

## 5. Desplegar la eliminación de cuenta

El código de la función está en:

```text
appwrite/functions/delete-account
```

La configuración versionada está en `appwrite.config.json`. Con Appwrite CLI:

```powershell
appwrite login
appwrite push functions
```

Confirma en Appwrite Console que la función `delete-account` tenga:

- **Execute access:** Users;
- **Scopes:** `users.write`;
- **Runtime:** Node.js 22;
- **Entrypoint:** `src/main.js`;
- **Build command:** `npm install`.

La función usa la identidad que Appwrite adjunta como
`x-appwrite-user-id` y la API key dinámica de la ejecución. No acepta un ID
enviado por el navegador, por lo que un usuario no puede pedir que se elimine
otra cuenta.

## 6. Prueba funcional mínima

Con `pnpm dev` en ejecución:

1. abre `http://localhost:3000`;
2. registra una cuenta de prueba;
3. abre el enlace recibido y confirma que la app permita continuar;
4. cierra sesión e inicia con correo, usuario y contraseña;
5. completa una lección y comprueba `progress` en las preferencias del usuario;
6. abre la misma cuenta en otro navegador y comprueba el avance;
7. prueba **Olvidé mi contraseña** y el enlace de recuperación;
8. desconecta internet, completa una actividad, reconecta y confirma la
   sincronización;
9. elimina la cuenta desde **Progreso > Cuenta y privacidad** y confirma que el
   usuario desaparezca de Appwrite Auth.

## Datos heredados

IndexedDB usa la versión 3 y elimina el almacén antiguo `users`, que contenía
credenciales locales. El progreso local anterior no se asocia automáticamente a
una cuenta central; expórtalo antes de actualizar y restáuralo después de
iniciar sesión.
