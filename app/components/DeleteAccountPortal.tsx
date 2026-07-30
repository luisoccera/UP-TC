"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { deleteCurrentAccount } from "../accountRepository";
import {
  cloudConfiguration,
  requireSupabase,
} from "../supabaseClient";

type VerifiedAccount = {
  id: string;
  email: string;
  username: string;
};

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("es-MX");
}

export function DeleteAccountPortal() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [account, setAccount] = useState<VerifiedAccount | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [message, setMessage] = useState("");

  async function authenticate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    try {
      const client = requireSupabase();
      const { data, error } = await client.auth.signInWithPassword({
        email: normalize(email),
        password,
      });
      if (error) throw error;

      const { data: profile, error: profileError } = await client
        .from("profiles")
        .select("email, username")
        .eq("id", data.user.id)
        .single();
      if (
        profileError ||
        !profile ||
        normalize(profile.username) !== normalize(username)
      ) {
        await client.auth.signOut({ scope: "local" });
        throw new Error("invalid");
      }

      setAccount({
        id: data.user.id,
        email: profile.email,
        username: profile.username,
      });
      setPassword("");
    } catch {
      setMessage("El correo, usuario o contraseña no coinciden.");
    } finally {
      setSubmitting(false);
    }
  }

  async function removeAccount() {
    if (!account || confirmation !== "ELIMINAR") return;
    setSubmitting(true);
    setMessage("");
    try {
      await deleteCurrentAccount(account.id);
      setDeleted(true);
      setAccount(null);
      setConfirmation("");
    } catch {
      setMessage(
        "No se pudo eliminar la cuenta. Revisa tu conexión e inténtalo de nuevo.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="delete-portal">
      <section className="delete-portal-card">
        <Link className="delete-portal-brand" href="/">
          <span className="brand-mark"><i /><b>UP</b></span>
          <span className="brand-name">
            <strong>UP</strong>
            <small>Training Center</small>
          </span>
        </Link>

        {deleted ? (
          <div className="delete-portal-result" role="status">
            <span aria-hidden="true">✓</span>
            <h1>Cuenta eliminada</h1>
            <p>
              La identidad, el perfil y el progreso central asociado fueron
              eliminados definitivamente.
            </p>
            <Link href="/">Volver a UP Training Center</Link>
          </div>
        ) : account ? (
          <div className="delete-portal-content">
            <span className="eyebrow">CONFIRMACIÓN FINAL</span>
            <h1>Eliminar cuenta y datos</h1>
            <p>
              Estás por eliminar la cuenta <strong>{account.username}</strong>{" "}
              ({account.email}) y todo su progreso. Esta acción no se puede
              deshacer.
            </p>
            <label>
              <span>Escribe ELIMINAR para confirmar</span>
              <input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                autoComplete="off"
                placeholder="ELIMINAR"
              />
            </label>
            {message && <p className="auth-message" role="alert">{message}</p>}
            <button
              className="danger-button"
              type="button"
              disabled={submitting || confirmation !== "ELIMINAR"}
              onClick={() => void removeAccount()}
            >
              {submitting ? "Eliminando cuenta…" : "Eliminar definitivamente"}
            </button>
          </div>
        ) : (
          <div className="delete-portal-content">
            <span className="eyebrow">CUENTA Y PRIVACIDAD</span>
            <h1>Solicita la eliminación de tu cuenta</h1>
            <p>
              Confirma tu identidad. Eliminaremos tu usuario y todo el progreso
              asociado a UP Training Center.
            </p>

            {!cloudConfiguration.ready && (
              <p className="auth-message auth-message--info" role="status">
                El portal todavía no está conectado al servicio central.
              </p>
            )}

            <form className="auth-form" onSubmit={authenticate}>
              <label>
                <span>Correo electrónico</span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
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
                  required
                />
              </label>
              <label>
                <span>Contraseña</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
              </label>
              {message && <p className="auth-message" role="alert">{message}</p>}
              <button
                className="auth-submit"
                type="submit"
                disabled={submitting || !cloudConfiguration.ready}
              >
                {submitting ? "Verificando…" : "Continuar"}
                <span aria-hidden="true">→</span>
              </button>
            </form>
          </div>
        )}

        <p className="delete-portal-note">
          También puedes eliminar tu cuenta dentro de la aplicación en
          Progreso › Cuenta y privacidad.
        </p>
      </section>
    </main>
  );
}
