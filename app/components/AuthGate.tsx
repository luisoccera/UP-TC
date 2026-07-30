"use client";

import { FormEvent, useEffect, useState } from "react";
import { ID, type Models } from "appwrite";
import {
  account,
  appwriteRedirectUrl,
  cloudConfiguration,
  requireAccount,
} from "../appwriteClient";

export type SessionUser = {
  id: string;
  email: string;
  username: string;
};

type AuthMode =
  | "login"
  | "register"
  | "verify"
  | "forgot"
  | "recovery-sent"
  | "reset";

function normalizeEmail(value: string) {
  return value.trim().toLocaleLowerCase("es-MX");
}

function normalizeUsername(value: string) {
  return value.trim().toLocaleLowerCase("es-MX");
}

function validatePassword(password: string, confirmation: string) {
  if (
    password.length < 8 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/\d/.test(password)
  ) {
    throw new Error(
      "La contraseña necesita 8 caracteres, una mayúscula, una minúscula y un número.",
    );
  }
  if (password !== confirmation) {
    throw new Error("Las contraseñas no coinciden.");
  }
}

function authMessage(error: unknown) {
  const message =
    error instanceof Error ? error.message.toLocaleLowerCase("es-MX") : "";

  if (
    message.includes("invalid credentials") ||
    message.includes("user_invalid_credentials")
  ) {
    return "El correo, usuario o contraseña no coinciden.";
  }
  if (
    message.includes("already exists") ||
    message.includes("user_already_exists")
  ) {
    return "Ese correo ya está registrado.";
  }
  if (
    message.includes("token") ||
    message.includes("secret") ||
    message.includes("verification")
  ) {
    return "El enlace no es válido o ya venció. Solicita uno nuevo.";
  }
  if (
    message.includes("redirect") ||
    (message.includes("url") && message.includes("platform"))
  ) {
    return "La dirección de retorno todavía no está autorizada en Appwrite. Agrégala como plataforma Web.";
  }
  if (message.includes("fetch") || message.includes("network")) {
    return "No hay conexión con el servicio de cuentas. Revisa tu internet.";
  }
  return error instanceof Error
    ? error.message
    : "No se pudo verificar la cuenta. Intenta de nuevo.";
}

function sessionUser(user: Models.User<Models.Preferences>): SessionUser {
  const username = normalizeUsername(user.name);
  if (!username) {
    throw new Error(
      "La cuenta existe, pero no tiene un nombre de usuario configurado.",
    );
  }
  return {
    id: user.$id,
    email: normalizeEmail(user.email),
    username,
  };
}

function clearAuthParameters() {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  for (const parameter of ["authAction", "userId", "secret", "expire"]) {
    url.searchParams.delete(parameter);
  }
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}

export async function clearCloudSession() {
  if (!account) return;
  await account.deleteSession({ sessionId: "current" }).catch(() => undefined);
}

export function AuthGate({
  onAuthenticated,
}: {
  onAuthenticated: (user: SessionUser) => void;
}) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [recoveryUserId, setRecoveryUserId] = useState("");
  const [recoverySecret, setRecoverySecret] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;

    async function restoreSession() {
      if (!account) {
        if (alive) setCheckingSession(false);
        return;
      }

      try {
        const parameters = new URLSearchParams(window.location.search);
        const action = parameters.get("authAction");
        const userId = parameters.get("userId") ?? "";
        const secret = parameters.get("secret") ?? "";

        if (action === "recover-password" && userId && secret) {
          if (alive) {
            setRecoveryUserId(userId);
            setRecoverySecret(secret);
            setMode("reset");
            setMessage(
              "El enlace es válido. Crea ahora una contraseña nueva.",
            );
          }
          return;
        }

        if (action === "verify-email" && userId && secret) {
          await account.updateEmailVerification({ userId, secret });
          clearAuthParameters();
          try {
            const verifiedUser = await account.get();
            if (verifiedUser.emailVerification) {
              if (alive) onAuthenticated(sessionUser(verifiedUser));
              return;
            }
          } catch {
            // El enlace también puede abrirse en un navegador sin la sesión original.
          }
          if (alive) {
            setMode("login");
            setMessage(
              "Correo verificado. Ya puedes iniciar sesión en cualquiera de tus dispositivos.",
            );
          }
          return;
        }

        const currentUser = await account.get();
        if (currentUser.emailVerification) {
          if (alive) onAuthenticated(sessionUser(currentUser));
        } else if (alive) {
          setEmail(normalizeEmail(currentUser.email));
          setUsername(normalizeUsername(currentUser.name));
          setMode("verify");
          setMessage(
            "Tu correo aún no está verificado. Abre el enlace que te enviamos.",
          );
        }
      } catch {
        // Una sesión ausente es el estado normal de la pantalla de acceso.
      } finally {
        if (alive) setCheckingSession(false);
      }
    }

    void restoreSession();
    return () => {
      alive = false;
    };
  }, [onAuthenticated]);

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode);
    setMessage("");
    setPassword("");
    setPasswordConfirmation("");
    setShowPassword(false);
  }

  async function returnToLogin() {
    await clearCloudSession();
    clearAuthParameters();
    changeMode("login");
  }

  async function sendVerificationEmail() {
    const client = requireAccount();
    await client.createEmailVerification({
      url: appwriteRedirectUrl("verify-email"),
    });
  }

  async function register() {
    const client = requireAccount();
    const normalizedEmail = normalizeEmail(email);
    const normalizedUsername = normalizeUsername(username);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new Error("Escribe un correo electrónico válido.");
    }
    if (!/^[a-z0-9._-]{3,24}$/.test(normalizedUsername)) {
      throw new Error(
        "El usuario debe tener entre 3 y 24 caracteres: letras, números, punto, guion o guion bajo.",
      );
    }
    validatePassword(password, passwordConfirmation);

    await client.create({
      userId: ID.unique(),
      email: normalizedEmail,
      password,
      name: normalizedUsername,
    });
    await client.createEmailPasswordSession({
      email: normalizedEmail,
      password,
    });

    setEmail(normalizedEmail);
    setUsername(normalizedUsername);
    setPassword("");
    setPasswordConfirmation("");
    setMode("verify");
    await sendVerificationEmail();
    setMessage(
      "Enviamos un enlace a tu correo. Ábrelo para activar la cuenta y después vuelve aquí.",
    );
  }

  async function confirmVerifiedEmail() {
    const client = requireAccount();
    const currentUser = await client.get();
    if (!currentUser.emailVerification) {
      throw new Error(
        "El correo todavía no aparece verificado. Abre el enlace del mensaje o solicita uno nuevo.",
      );
    }
    onAuthenticated(sessionUser(currentUser));
  }

  async function resendVerification() {
    setSubmitting(true);
    setMessage("");
    try {
      await sendVerificationEmail();
      setMessage(
        "Enviamos un enlace nuevo. Revisa también la carpeta de spam.",
      );
    } catch (error) {
      setMessage(authMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function login() {
    const client = requireAccount();
    const normalizedEmail = normalizeEmail(email);
    const normalizedUsername = normalizeUsername(username);

    await clearCloudSession();
    await client.createEmailPasswordSession({
      email: normalizedEmail,
      password,
    });
    const currentUser = await client.get();
    const user = sessionUser(currentUser);

    if (normalizeUsername(user.username) !== normalizedUsername) {
      await clearCloudSession();
      throw new Error("El correo, usuario o contraseña no coinciden.");
    }
    if (!currentUser.emailVerification) {
      setEmail(normalizedEmail);
      setUsername(normalizedUsername);
      setPassword("");
      setMode("verify");
      setMessage(
        "Confirma el correo antes de entrar. Puedes solicitar un enlace nuevo.",
      );
      return;
    }
    onAuthenticated(user);
  }

  async function requestPasswordReset() {
    const client = requireAccount();
    const normalizedEmail = normalizeEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new Error("Escribe un correo electrónico válido.");
    }

    await client.createRecovery({
      email: normalizedEmail,
      url: appwriteRedirectUrl("recover-password"),
    });
    setEmail(normalizedEmail);
    setMode("recovery-sent");
    setMessage(
      "Enviamos un enlace para restablecer tu contraseña. Revisa también la carpeta de spam.",
    );
  }

  async function resetPassword() {
    const client = requireAccount();
    if (!recoveryUserId || !recoverySecret) {
      throw new Error(
        "El enlace de recuperación está incompleto. Solicita uno nuevo.",
      );
    }
    validatePassword(password, passwordConfirmation);

    await client.updateRecovery({
      userId: recoveryUserId,
      secret: recoverySecret,
      password,
    });
    clearAuthParameters();
    setRecoveryUserId("");
    setRecoverySecret("");
    setPassword("");
    setPasswordConfirmation("");
    setMode("login");
    setMessage(
      "Contraseña actualizada. Ya puedes iniciar sesión con la nueva contraseña.",
    );
  }

  async function resendRecoveryEmail() {
    setSubmitting(true);
    setMessage("");
    try {
      const client = requireAccount();
      await client.createRecovery({
        email: normalizeEmail(email),
        url: appwriteRedirectUrl("recover-password"),
      });
      setMessage(
        "Enviamos un enlace nuevo. Revisa también la carpeta de spam.",
      );
    } catch (error) {
      setMessage(authMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      if (mode === "register") {
        await register();
      } else if (mode === "verify") {
        await confirmVerifiedEmail();
      } else if (mode === "forgot") {
        await requestPasswordReset();
      } else if (mode === "reset") {
        await resetPassword();
      } else {
        await login();
      }
    } catch (error) {
      setMessage(authMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="auth-loading" aria-live="polite">
        <span className="brand-mark">
          <i />
          <b>UP</b>
        </span>
        <p>Conectando tu espacio de aprendizaje…</p>
      </main>
    );
  }

  const heading =
    mode === "login"
      ? "Bienvenido de nuevo"
      : mode === "register"
        ? "Crea tu cuenta"
        : mode === "verify"
          ? "Verifica tu correo"
          : mode === "forgot" || mode === "recovery-sent"
            ? "Recupera tu acceso"
            : "Crea una contraseña nueva";

  return (
    <main className="auth-shell">
      <section className="auth-brand-panel" aria-label="UP Training Center">
        <div className="auth-brand-lockup">
          <span className="brand-mark brand-mark--large">
            <i />
            <b>UP</b>
          </span>
          <span className="brand-name brand-name--light">
            <strong>UP</strong>
            <small>Training Center</small>
          </span>
        </div>
        <div>
          <span className="eyebrow">FORMACIÓN TECNOLÓGICA</span>
          <h1>Tu progreso viaja contigo.</h1>
          <p>
            Aprende en computadora, Android o iPhone y continúa exactamente
            donde te quedaste.
          </p>
        </div>
        <div className="auth-trust-list">
          <span>
            <b>01</b> Correo verificado antes del primer acceso
          </span>
          <span>
            <b>02</b> Progreso sincronizado entre dispositivos
          </span>
          <span>
            <b>03</b> Copia local para continuar sin conexión
          </span>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <span className="eyebrow">CUENTA UP SEGURA</span>
          <h2>{heading}</h2>
          <p className="auth-intro">
            {mode === "login"
              ? "Usa los mismos datos en cualquiera de tus dispositivos."
              : mode === "register"
                ? "Tu cuenta y progreso se guardarán en Appwrite."
                : mode === "forgot"
                  ? "Te enviaremos un enlace seguro a tu correo."
                  : mode === "recovery-sent"
                    ? `El enlace fue enviado a ${email}.`
                    : mode === "verify"
                      ? `Enviamos el enlace de activación a ${email}.`
                      : "El enlace de recuperación ya fue validado."}
          </p>

          {(mode === "login" || mode === "register") && (
            <div
              className="auth-tabs"
              role="tablist"
              aria-label="Acceso a la cuenta"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "login"}
                className={mode === "login" ? "active" : ""}
                onClick={() => changeMode("login")}
              >
                Iniciar sesión
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "register"}
                className={mode === "register" ? "active" : ""}
                onClick={() => changeMode("register")}
              >
                Crear cuenta
              </button>
            </div>
          )}

          {!cloudConfiguration.ready && (
            <p className="auth-message auth-message--info" role="status">
              Falta conectar el servicio central de cuentas:{" "}
              {cloudConfiguration.missing.join(" y ")}.
            </p>
          )}

          {mode === "recovery-sent" ? (
            <div className="auth-form">
              {message && (
                <p className="auth-message" role="status">
                  {message}
                </p>
              )}
            </div>
          ) : (
            <form className="auth-form" onSubmit={submit}>
              {mode === "verify" ? (
                <p className="auth-message auth-message--info" role="status">
                  Abre el enlace del correo. Si lo abriste en otro navegador,
                  vuelve aquí y pulsa el botón para comprobar la activación.
                </p>
              ) : mode === "reset" ? (
                <>
                  <label>
                    <span>Contraseña nueva</span>
                    <span className="password-field">
                      <input
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        placeholder="Mínimo 8 caracteres"
                        minLength={8}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                      >
                        {showPassword ? "Ocultar" : "Mostrar"}
                      </button>
                    </span>
                  </label>
                  <label>
                    <span>Confirma la contraseña</span>
                    <input
                      type={showPassword ? "text" : "password"}
                      autoComplete="new-password"
                      value={passwordConfirmation}
                      onChange={(event) =>
                        setPasswordConfirmation(event.target.value)
                      }
                      placeholder="Repite tu contraseña"
                      minLength={8}
                      required
                    />
                  </label>
                </>
              ) : (
                <>
                  <label>
                    <span>Correo electrónico</span>
                    <input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="nombre@empresa.com"
                      required
                    />
                  </label>
                  {mode !== "forgot" && (
                    <>
                      <label>
                        <span>Nombre de usuario</span>
                        <input
                          type="text"
                          autoComplete="username"
                          value={username}
                          onChange={(event) => setUsername(event.target.value)}
                          placeholder="tu.usuario"
                          minLength={3}
                          maxLength={24}
                          required
                        />
                      </label>
                      <label>
                        <span>Contraseña</span>
                        <span className="password-field">
                          <input
                            type={showPassword ? "text" : "password"}
                            autoComplete={
                              mode === "login"
                                ? "current-password"
                                : "new-password"
                            }
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            placeholder="Mínimo 8 caracteres"
                            minLength={8}
                            required
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPassword((visible) => !visible)
                            }
                            aria-label={
                              showPassword
                                ? "Ocultar contraseña"
                                : "Mostrar contraseña"
                            }
                          >
                            {showPassword ? "Ocultar" : "Mostrar"}
                          </button>
                        </span>
                      </label>
                      {mode === "register" && (
                        <label>
                          <span>Confirma la contraseña</span>
                          <input
                            type={showPassword ? "text" : "password"}
                            autoComplete="new-password"
                            value={passwordConfirmation}
                            onChange={(event) =>
                              setPasswordConfirmation(event.target.value)
                            }
                            placeholder="Repite tu contraseña"
                            minLength={8}
                            required
                          />
                        </label>
                      )}
                    </>
                  )}
                </>
              )}

              {message && (
                <p className="auth-message" role="alert">
                  {message}
                </p>
              )}

              <button
                className="auth-submit"
                type="submit"
                disabled={submitting || !cloudConfiguration.ready}
              >
                {submitting
                  ? "Verificando…"
                  : mode === "login"
                    ? "Entrar a mi formación"
                    : mode === "register"
                      ? "Crear cuenta"
                      : mode === "verify"
                        ? "Ya verifiqué mi correo"
                        : mode === "forgot"
                          ? "Enviar enlace"
                          : "Cambiar contraseña"}
                <span aria-hidden="true">→</span>
              </button>
            </form>
          )}

          {mode === "verify" && (
            <div className="auth-secondary-actions">
              <button
                type="button"
                disabled={submitting}
                onClick={() => void resendVerification()}
              >
                Reenviar enlace
              </button>
              <button type="button" onClick={() => void returnToLogin()}>
                Volver al inicio
              </button>
            </div>
          )}
          {mode === "login" && (
            <div className="auth-secondary-actions">
              <button type="button" onClick={() => changeMode("forgot")}>
                Olvidé mi contraseña
              </button>
            </div>
          )}
          {mode === "forgot" && (
            <div className="auth-secondary-actions">
              <button type="button" onClick={() => changeMode("login")}>
                Volver al inicio
              </button>
            </div>
          )}
          {mode === "recovery-sent" && (
            <div className="auth-secondary-actions">
              <button
                type="button"
                disabled={submitting}
                onClick={() => void resendRecoveryEmail()}
              >
                Reenviar enlace
              </button>
              <button type="button" onClick={() => changeMode("login")}>
                Volver al inicio
              </button>
            </div>
          )}
          {mode === "reset" && (
            <div className="auth-secondary-actions">
              <button type="button" onClick={() => void returnToLogin()}>
                Cancelar y volver
              </button>
            </div>
          )}

          <p className="auth-privacy">
            Appwrite protege la identidad y nunca entrega tu contraseña a UP
            Training Center. El progreso se limita a tu propia cuenta.
          </p>
        </div>
      </section>
    </main>
  );
}
