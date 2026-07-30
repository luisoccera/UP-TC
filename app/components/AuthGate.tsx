"use client";

import { FormEvent, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  cloudConfiguration,
  requireSupabase,
  supabase,
} from "../supabaseClient";

export type SessionUser = {
  id: string;
  email: string;
  username: string;
};

type AuthMode = "login" | "register" | "verify" | "forgot" | "reset";

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

  if (message.includes("invalid login credentials")) {
    return "El correo, usuario o contraseña no coinciden.";
  }
  if (message.includes("email not confirmed")) {
    return "Confirma el correo antes de iniciar sesión.";
  }
  if (
    message.includes("duplicate") ||
    message.includes("already") ||
    message.includes("database error")
  ) {
    return "Ese correo o nombre de usuario ya está registrado.";
  }
  if (message.includes("token") || message.includes("otp")) {
    return "El código no es válido o ya venció. Solicita uno nuevo.";
  }
  if (message.includes("fetch") || message.includes("network")) {
    return "No hay conexión con el servicio de cuentas. Revisa tu internet.";
  }
  return error instanceof Error
    ? error.message
    : "No se pudo verificar la cuenta. Intenta de nuevo.";
}

async function sessionUser(user: User): Promise<SessionUser> {
  const client = requireSupabase();
  const { data, error } = await client
    .from("profiles")
    .select("email, username")
    .eq("id", user.id)
    .single();
  if (error || !data) {
    throw new Error(
      "La cuenta existe, pero el perfil central no está disponible. Revisa la migración de Supabase.",
    );
  }

  return {
    id: user.id,
    email: data.email,
    username: data.username,
  };
}

export async function clearCloudSession() {
  if (!supabase) return;
  await supabase.auth.signOut({ scope: "local" });
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
  const [verificationCode, setVerificationCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;

    async function restoreSession() {
      if (!supabase) {
        if (alive) setCheckingSession(false);
        return;
      }

      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (error) throw error;
        if (user?.email_confirmed_at && alive) {
          onAuthenticated(await sessionUser(user));
        }
      } catch {
        await clearCloudSession();
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
    setVerificationCode("");
  }

  async function register() {
    const client = requireSupabase();
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

    const { data, error } = await client.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: { username: normalizedUsername },
      },
    });
    if (error) throw error;

    if (data.session && data.user?.email_confirmed_at) {
      onAuthenticated(await sessionUser(data.user));
      return;
    }

    setEmail(normalizedEmail);
    setUsername(normalizedUsername);
    setPassword("");
    setPasswordConfirmation("");
    setMode("verify");
    setMessage(
      "Enviamos un código a tu correo. Escríbelo aquí para activar la cuenta.",
    );
  }

  async function verifyEmail() {
    const client = requireSupabase();
    if (!/^\d{6,10}$/.test(verificationCode.trim())) {
      throw new Error("Escribe el código numérico que recibiste por correo.");
    }

    const { data, error } = await client.auth.verifyOtp({
      email: normalizeEmail(email),
      token: verificationCode.trim(),
      type: "email",
    });
    if (error) throw error;
    if (!data.user) throw new Error("No se pudo activar la cuenta.");
    onAuthenticated(await sessionUser(data.user));
  }

  async function resendCode() {
    setSubmitting(true);
    setMessage("");
    try {
      const client = requireSupabase();
      const { error } = await client.auth.resend({
        email: normalizeEmail(email),
        type: "signup",
      });
      if (error) throw error;
      setMessage(
        "Enviamos un código nuevo. Revisa también la carpeta de spam.",
      );
    } catch (error) {
      setMessage(authMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function login() {
    const client = requireSupabase();
    const normalizedEmail = normalizeEmail(email);
    const normalizedUsername = normalizeUsername(username);
    const { data, error } = await client.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });
    if (error) throw error;
    if (!data.user.email_confirmed_at) {
      await clearCloudSession();
      throw new Error("Confirma el correo antes de iniciar sesión.");
    }

    const user = await sessionUser(data.user);
    if (normalizeUsername(user.username) !== normalizedUsername) {
      await clearCloudSession();
      throw new Error("El correo, usuario o contraseña no coinciden.");
    }
    onAuthenticated(user);
  }

  async function requestPasswordReset() {
    const client = requireSupabase();
    const normalizedEmail = normalizeEmail(email);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      throw new Error("Escribe un correo electrónico válido.");
    }

    const { error } = await client.auth.resetPasswordForEmail(normalizedEmail);
    if (error) throw error;
    setEmail(normalizedEmail);
    setMode("reset");
    setMessage(
      "Enviamos un código para restablecer tu contraseña. Revisa también la carpeta de spam.",
    );
  }

  async function resetPassword() {
    const client = requireSupabase();
    if (!/^\d{6,10}$/.test(verificationCode.trim())) {
      throw new Error("Escribe el código numérico que recibiste por correo.");
    }
    validatePassword(password, passwordConfirmation);

    const { data, error } = await client.auth.verifyOtp({
      email: normalizeEmail(email),
      token: verificationCode.trim(),
      type: "recovery",
    });
    if (error) throw error;
    if (!data.user) throw new Error("No se pudo verificar la recuperación.");

    const { error: updateError } = await client.auth.updateUser({ password });
    if (updateError) throw updateError;
    onAuthenticated(await sessionUser(data.user));
  }

  async function resendRecoveryCode() {
    setSubmitting(true);
    setMessage("");
    try {
      const client = requireSupabase();
      const { error } = await client.auth.resetPasswordForEmail(
        normalizeEmail(email),
      );
      if (error) throw error;
      setMessage("Enviamos un código nuevo. Revisa también la carpeta de spam.");
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
        await verifyEmail();
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
        <span className="brand-mark"><i /><b>UP</b></span>
        <p>Conectando tu espacio de aprendizaje…</p>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <section className="auth-brand-panel" aria-label="UP Training Center">
        <div className="auth-brand-lockup">
          <span className="brand-mark brand-mark--large"><i /><b>UP</b></span>
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
          <span><b>01</b> Correo verificado antes del primer acceso</span>
          <span><b>02</b> Progreso sincronizado entre dispositivos</span>
          <span><b>03</b> Copia local para continuar sin conexión</span>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <span className="eyebrow">CUENTA UP SEGURA</span>
          <h2>
            {mode === "login"
              ? "Bienvenido de nuevo"
              : mode === "register"
                ? "Crea tu cuenta"
                : mode === "verify"
                  ? "Verifica tu correo"
                  : mode === "forgot"
                    ? "Recupera tu acceso"
                    : "Crea una contraseña nueva"}
          </h2>
          <p className="auth-intro">
            {mode === "login"
              ? "Usa los mismos datos en cualquiera de tus dispositivos."
              : mode === "register"
                ? "Tu cuenta y progreso se guardarán en la nube de UP."
                : mode === "forgot"
                  ? "Te enviaremos un código de recuperación a tu correo."
                  : `Enviamos un código a ${email}.`}
          </p>

          {(mode === "login" || mode === "register") && (
            <div className="auth-tabs" role="tablist" aria-label="Acceso a la cuenta">
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

          <form className="auth-form" onSubmit={submit}>
            {mode === "verify" ? (
              <label>
                <span>Código de verificación</span>
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={verificationCode}
                  onChange={(event) =>
                    setVerificationCode(event.target.value.replace(/\D/g, ""))
                  }
                  placeholder="000000"
                  minLength={6}
                  maxLength={10}
                  required
                />
              </label>
            ) : mode === "reset" ? (
              <>
                <label>
                  <span>Código de recuperación</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={verificationCode}
                    onChange={(event) =>
                      setVerificationCode(event.target.value.replace(/\D/g, ""))
                    }
                    placeholder="000000"
                    minLength={6}
                    maxLength={10}
                    required
                  />
                </label>
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
                          autoComplete={mode === "login" ? "current-password" : "new-password"}
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          placeholder="Mínimo 8 caracteres"
                          minLength={8}
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((visible) => !visible)}
                          aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
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
                      ? "Verificar y comenzar"
                      : mode === "forgot"
                        ? "Enviar código"
                        : "Cambiar contraseña"}
              <span aria-hidden="true">→</span>
            </button>
          </form>

          {mode === "verify" && (
            <div className="auth-secondary-actions">
              <button
                type="button"
                disabled={submitting}
                onClick={() => void resendCode()}
              >
                Reenviar código
              </button>
              <button type="button" onClick={() => changeMode("login")}>
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
          {mode === "reset" && (
            <div className="auth-secondary-actions">
              <button
                type="button"
                disabled={submitting}
                onClick={() => void resendRecoveryCode()}
              >
                Reenviar código
              </button>
              <button type="button" onClick={() => changeMode("login")}>
                Volver al inicio
              </button>
            </div>
          )}

          <p className="auth-privacy">
            Supabase gestiona la identidad y nunca entrega tu contraseña a UP
            Training Center. El progreso se limita a tu propia cuenta.
          </p>
        </div>
      </section>
    </main>
  );
}
