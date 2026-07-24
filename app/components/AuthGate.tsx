"use client";

import { FormEvent, useEffect, useState } from "react";
import {
  openLocalDatabase,
  USERS_STORE_NAME,
} from "../localDatabase";

export type SessionUser = {
  id: string;
  email: string;
  username: string;
};

type StoredUser = SessionUser & {
  passwordHash: string;
  passwordSalt: string;
  createdAt: string;
};

type AuthMode = "login" | "register";

const SESSION_KEY = "up-training-center-session";
const PASSWORD_ITERATIONS = 210_000;

function normalizeEmail(value: string) {
  return value.trim().toLocaleLowerCase("es-MX");
}

function normalizeUsername(value: string) {
  return value.trim().toLocaleLowerCase("es-MX");
}

function bytesToBase64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes));
}

function base64ToBytes(value: string) {
  return Uint8Array.from(atob(value), (character) => character.charCodeAt(0));
}

async function protectPassword(password: string, salt: Uint8Array) {
  const saltBuffer = new ArrayBuffer(salt.byteLength);
  new Uint8Array(saltBuffer).set(salt);
  const passwordKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: saltBuffer,
      iterations: PASSWORD_ITERATIONS,
    },
    passwordKey,
    256,
  );
  return bytesToBase64(new Uint8Array(bits));
}

function hashesMatch(first: string, second: string) {
  if (first.length !== second.length) return false;
  let difference = 0;
  for (let index = 0; index < first.length; index += 1) {
    difference |= first.charCodeAt(index) ^ second.charCodeAt(index);
  }
  return difference === 0;
}

async function readUsers(): Promise<StoredUser[]> {
  const database = await openLocalDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(USERS_STORE_NAME, "readonly");
    const request = transaction.objectStore(USERS_STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as StoredUser[]);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

async function readUser(id: string): Promise<StoredUser | null> {
  const database = await openLocalDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(USERS_STORE_NAME, "readonly");
    const request = transaction.objectStore(USERS_STORE_NAME).get(id);
    request.onsuccess = () => resolve((request.result as StoredUser) ?? null);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

async function createUser(user: StoredUser): Promise<void> {
  const database = await openLocalDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(USERS_STORE_NAME, "readwrite");
    transaction.objectStore(USERS_STORE_NAME).add(user);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

function publicUser(user: StoredUser): SessionUser {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
  };
}

export function clearLocalSession() {
  localStorage.removeItem(SESSION_KEY);
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
  const [showPassword, setShowPassword] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let alive = true;

    async function restoreSession() {
      const savedUserId = localStorage.getItem(SESSION_KEY);
      if (!savedUserId) {
        if (alive) setCheckingSession(false);
        return;
      }

      try {
        const user = await readUser(savedUserId);
        if (user) {
          onAuthenticated(publicUser(user));
        } else {
          clearLocalSession();
        }
      } catch {
        clearLocalSession();
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
  }

  async function register() {
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
    if (password !== passwordConfirmation) {
      throw new Error("Las contraseñas no coinciden.");
    }

    const users = await readUsers();
    if (users.some((user) => user.email === normalizedEmail)) {
      throw new Error("Ese correo ya está registrado en este dispositivo.");
    }
    if (users.some((user) => user.username === normalizedUsername)) {
      throw new Error("Ese nombre de usuario ya está ocupado.");
    }

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const user: StoredUser = {
      id: crypto.randomUUID(),
      email: normalizedEmail,
      username: normalizedUsername,
      passwordHash: await protectPassword(password, salt),
      passwordSalt: bytesToBase64(salt),
      createdAt: new Date().toISOString(),
    };

    await createUser(user);
    localStorage.setItem(SESSION_KEY, user.id);
    onAuthenticated(publicUser(user));
  }

  async function login() {
    const normalizedEmail = normalizeEmail(email);
    const normalizedUsername = normalizeUsername(username);
    const users = await readUsers();
    const user = users.find(
      (candidate) =>
        candidate.email === normalizedEmail &&
        candidate.username === normalizedUsername,
    );

    if (!user) {
      throw new Error("El correo, usuario o contraseña no coinciden.");
    }

    const candidateHash = await protectPassword(
      password,
      base64ToBytes(user.passwordSalt),
    );
    if (!hashesMatch(candidateHash, user.passwordHash)) {
      throw new Error("El correo, usuario o contraseña no coinciden.");
    }

    localStorage.setItem(SESSION_KEY, user.id);
    onAuthenticated(publicUser(user));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      if (mode === "register") {
        await register();
      } else {
        await login();
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo verificar la cuenta. Intenta de nuevo.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="auth-loading" aria-live="polite">
        <span className="brand-mark"><i /><b>UP</b></span>
        <p>Protegiendo tu espacio de aprendizaje…</p>
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
          <h1>Tu progreso comienza contigo.</h1>
          <p>
            Aprende con práctica deliberada, retroalimentación útil y
            preparación para entrevistas reales.
          </p>
        </div>
        <div className="auth-trust-list">
          <span><b>01</b> Cuenta independiente por estudiante</span>
          <span><b>02</b> Progreso guardado en esta computadora</span>
          <span><b>03</b> Contraseña protegida, nunca almacenada como texto</span>
        </div>
      </section>

      <section className="auth-form-panel">
        <div className="auth-form-wrap">
          <span className="eyebrow">ACCESO LOCAL SEGURO</span>
          <h2>{mode === "login" ? "Bienvenido de nuevo" : "Crea tu cuenta"}</h2>
          <p className="auth-intro">
            {mode === "login"
              ? "Verifica tus tres datos para continuar justo donde te quedaste."
              : "Tu cuenta y avance permanecerán en este dispositivo."}
          </p>

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

          <form className="auth-form" onSubmit={submit}>
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

            {message && (
              <p className="auth-message" role="alert">
                {message}
              </p>
            )}

            <button className="auth-submit" type="submit" disabled={submitting}>
              {submitting
                ? "Verificando…"
                : mode === "login"
                  ? "Entrar a mi formación"
                  : "Crear cuenta y comenzar"}
              <span aria-hidden="true">→</span>
            </button>
          </form>

          <p className="auth-privacy">
            La verificación ocurre dentro de esta instalación. UP Training
            Center no recibe ni puede recuperar tu contraseña.
          </p>
        </div>
      </section>
    </main>
  );
}
