# Configuración central de cuentas y progreso

Este paso conecta Windows, web, Android e iOS al mismo sistema de usuarios.

## 1. Crear el proyecto

1. Crea un proyecto de Supabase propiedad de UP Consultancy Services.
2. En **Project Settings > API**, copia:
   - la URL del proyecto;
   - la clave pública `Publishable key`.
3. No copies la clave `service_role` a la aplicación ni a `.env.local`.

## 2. Crear las tablas y políticas

En **SQL Editor**, ejecuta una vez el contenido de:

```text
supabase/migrations/202607240001_accounts_and_progress.sql
```

La migración crea:

- `public.profiles`: correo y nombre de usuario;
- `public.learning_progress`: avance por cuenta;
- políticas RLS para que un usuario solo lea y escriba sus propios datos;
- borrado en cascada cuando se elimina la cuenta.

## 3. Activar el correo con código

En **Authentication > Providers > Email**:

1. deja habilitado Email;
2. habilita la confirmación de correo;
3. configura un proveedor SMTP de producción antes de publicar.

En **Authentication > Email Templates** cambia las plantillas:

**Confirm signup**

```html
<h2>Activa tu cuenta de UP Training Center</h2>
<p>Tu código de verificación es:</p>
<p style="font-size: 28px; font-weight: 700;">{{ .Token }}</p>
```

**Reset password**

```html
<h2>Recupera tu cuenta de UP Training Center</h2>
<p>Tu código de recuperación es:</p>
<p style="font-size: 28px; font-weight: 700;">{{ .Token }}</p>
```

La app espera un código numérico; una plantilla que solo incluya
`{{ .ConfirmationURL }}` no funcionará con esta interfaz.

## 4. Desplegar la eliminación de cuenta

Con Supabase CLI:

```powershell
supabase init
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase functions deploy delete-account
```

Si `supabase/config.toml` ya existe porque el proyecto fue inicializado antes,
omite `supabase init`.

La función valida la sesión del usuario y usa `SUPABASE_SERVICE_ROLE_KEY`
únicamente dentro del servidor para borrar `auth.users`. Supabase proporciona
esa variable a sus Edge Functions; nunca debe enviarse al navegador,
ejecutable, Android o iOS.

## 5. Conectar la aplicación

En la raíz del proyecto:

```powershell
Copy-Item .env.example .env.local
```

Edita `.env.local`:

```dotenv
VITE_SUPABASE_URL=https://TU_PROJECT_REF.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_TU_CLAVE
```

Estas dos variables son públicas por diseño. La seguridad de los datos depende
de Auth y RLS, no de ocultar la clave publicable.

Cada ejecutable o paquete móvil incorpora estos valores durante la compilación.
Si cambias `.env.local`, vuelve a compilar y a ejecutar `pnpm mobile:sync`.

## 6. Prueba funcional mínima

1. Registra una cuenta y confirma el código recibido.
2. Cierra sesión e inicia con correo, usuario y contraseña.
3. Completa una lección y comprueba que aparezca una fila en
   `learning_progress`.
4. Abre la misma cuenta en otro navegador o equipo y comprueba el avance.
5. Desconecta internet, completa una actividad, reconecta y confirma la
   sincronización.
6. Prueba **Olvidé mi contraseña**.
7. En **Progreso > Cuenta y privacidad**, elimina una cuenta de prueba y
   confirma que desaparezcan el usuario, perfil y progreso.

## Datos heredados

Al abrir la versión nueva, IndexedDB sube a la versión 3 y elimina el almacén
antiguo `users`, que contenía las credenciales locales. El progreso local
anterior no se asocia automáticamente a una cuenta central; expórtalo antes de
actualizar y restáuralo después de iniciar sesión.
