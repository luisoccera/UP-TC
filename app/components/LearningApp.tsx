"use client";

import {
  ChangeEvent,
  CSSProperties,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  exercises,
  interviewQuestions,
  lessons,
  trackById,
  tracks,
  type Exercise,
  type TrackId,
} from "../data";
import {
  openLocalDatabase,
  PROGRESS_STORE_NAME,
} from "../localDatabase";
import {
  AuthGate,
  clearLocalSession,
  type SessionUser,
} from "./AuthGate";

type ViewId = "today" | "path" | "lab" | "interviews" | "progress";

type Feedback = {
  kind: "idle" | "error" | "success";
  title: string;
  message: string;
};

type ProgressState = {
  xp: number;
  streak: number;
  lastStudyDate: string;
  completedLessons: string[];
  completedExercises: string[];
  practicedInterviews: string[];
  attempts: Record<string, number>;
  mastery: Record<TrackId, number>;
  recentActivity: { id: string; label: string; detail: string; at: string }[];
};

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const defaultMastery: Record<TrackId, number> = {
  csharp: 0,
  java: 0,
  sql: 0,
  efcore: 0,
  mvc: 0,
  ajax: 0,
  microservices: 0,
};

const initialProgress: ProgressState = {
  xp: 0,
  streak: 0,
  lastStudyDate: "",
  completedLessons: [],
  completedExercises: [],
  practicedInterviews: [],
  attempts: {},
  mastery: defaultMastery,
  recentActivity: [],
};

const navigation: { id: ViewId; label: string; glyph: string }[] = [
  { id: "today", label: "Hoy", glyph: "⌂" },
  { id: "path", label: "Mi ruta", glyph: "↗" },
  { id: "lab", label: "Laboratorio", glyph: "{ }" },
  { id: "interviews", label: "Entrevistas", glyph: "◎" },
  { id: "progress", label: "Progreso", glyph: "▥" },
];

function progressKey(userId: string) {
  return `user:${userId}`;
}

async function readSavedProgress(userId: string): Promise<ProgressState | null> {
  const database = await openLocalDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PROGRESS_STORE_NAME, "readonly");
    const store = transaction.objectStore(PROGRESS_STORE_NAME);
    const request = store.get(progressKey(userId));
    request.onsuccess = () =>
      resolve((request.result as ProgressState) ?? null);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

async function saveProgress(
  progress: ProgressState,
  userId: string,
): Promise<void> {
  const database = await openLocalDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(PROGRESS_STORE_NAME, "readwrite");
    const store = transaction.objectStore(PROGRESS_STORE_NAME);
    store.put(progress, progressKey(userId));
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

function isProgressState(value: unknown): value is ProgressState {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ProgressState>;
  return (
    typeof candidate.xp === "number" &&
    typeof candidate.streak === "number" &&
    Array.isArray(candidate.completedLessons) &&
    Array.isArray(candidate.completedExercises) &&
    typeof candidate.mastery === "object"
  );
}

function isoDay(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function previousIsoDay() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return isoDay(date);
}

function withStudyTouch(progress: ProgressState): ProgressState {
  const today = isoDay();
  if (progress.lastStudyDate === today) return progress;
  return {
    ...progress,
    lastStudyDate: today,
    streak: progress.lastStudyDate === previousIsoDay() ? progress.streak + 1 : 1,
  };
}

function activity(label: string, detail: string) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    label,
    detail,
    at: new Intl.DateTimeFormat("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date()),
  };
}

function percentage(value: number, total: number) {
  return total === 0 ? 0 : Math.round((value / total) * 100);
}

function calculateMastery(
  completedLessons: string[],
  completedExercises: string[],
  practicedInterviews: string[],
): Record<TrackId, number> {
  return Object.fromEntries(
    tracks.map((track) => {
      const trackLessons = lessons.filter((lesson) => lesson.track === track.id);
      const trackExercises = exercises.filter(
        (exercise) => exercise.track === track.id,
      );
      const trackInterviews = interviewQuestions.filter(
        (question) => question.track === track.id,
      );
      const availableEvidence =
        trackLessons.length * 25 +
        trackExercises.length * 40 +
        trackInterviews.length * 15;
      const demonstratedEvidence =
        trackLessons.filter((lesson) => completedLessons.includes(lesson.id))
          .length *
          25 +
        trackExercises.filter((exercise) =>
          completedExercises.includes(exercise.id),
        ).length *
          40 +
        trackInterviews.filter((question) =>
          practicedInterviews.includes(question.id),
        ).length *
          15;

      return [
        track.id,
        percentage(demonstratedEvidence, availableEvidence),
      ];
    }),
  ) as Record<TrackId, number>;
}

function normalizeProgress(stored: ProgressState): ProgressState {
  const completedLessons = stored.completedLessons.filter((id) =>
    lessons.some((lesson) => lesson.id === id),
  );
  const completedExercises = stored.completedExercises.filter((id) =>
    exercises.some((exercise) => exercise.id === id),
  );
  const practicedInterviews = (stored.practicedInterviews ?? []).filter((id) =>
    interviewQuestions.some((question) => question.id === id),
  );
  const attempts = Object.fromEntries(
    Object.entries(stored.attempts ?? {}).filter(
      ([id, count]) =>
        exercises.some((exercise) => exercise.id === id) &&
        Number.isFinite(count) &&
        count > 0,
    ),
  );
  const hasStudyEvidence =
    completedLessons.length +
      completedExercises.length +
      practicedInterviews.length >
      0 || Object.keys(attempts).length > 0;

  return {
    ...initialProgress,
    ...stored,
    xp:
      completedLessons.length * 25 +
      completedExercises.length * 40 +
      practicedInterviews.length * 15,
    streak: hasStudyEvidence ? Math.max(1, stored.streak ?? 1) : 0,
    completedLessons,
    completedExercises,
    practicedInterviews,
    attempts,
    mastery: calculateMastery(
      completedLessons,
      completedExercises,
      practicedInterviews,
    ),
    recentActivity: stored.recentActivity ?? [],
  };
}

function StatusPill({ saved }: { saved: boolean }) {
  return (
    <div className="save-status" aria-live="polite">
      <span className={saved ? "status-dot" : "status-dot status-dot--saving"} />
      {saved ? "Guardado en este dispositivo" : "Guardando progreso…"}
    </div>
  );
}

function TrackMark({ trackId }: { trackId: TrackId }) {
  const track = trackById[trackId];
  return (
    <span
      className="track-mark"
      style={{ "--track-color": track.color } as CSSProperties}
      aria-hidden="true"
    >
      {track.code}
    </span>
  );
}

export function LearningApp() {
  const [currentUser, setCurrentUser] = useState<SessionUser | null>(null);
  const [activeView, setActiveView] = useState<ViewId>("today");
  const [progress, setProgress] = useState<ProgressState>(initialProgress);
  const [hydrated, setHydrated] = useState(false);
  const [saved, setSaved] = useState(true);
  const [activeExerciseId, setActiveExerciseId] = useState(exercises[0].id);
  const [codeByExercise, setCodeByExercise] = useState<Record<string, string>>(
    Object.fromEntries(exercises.map((exercise) => [exercise.id, exercise.starter])),
  );
  const [feedback, setFeedback] = useState<Feedback>({
    kind: "idle",
    title: "Tu turno",
    message: "Edita el código y comprueba tu solución. No se penalizan los intentos.",
  });
  const [hintIndex, setHintIndex] = useState(-1);
  const [selectedInterviewId, setSelectedInterviewId] = useState(
    interviewQuestions[0].id,
  );
  const [answerVisible, setAnswerVisible] = useState(false);
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [notice, setNotice] = useState("");
  const importInputRef = useRef<HTMLInputElement>(null);

  const activeExercise =
    exercises.find((exercise) => exercise.id === activeExerciseId) ?? exercises[0];
  const selectedInterview =
    interviewQuestions.find((question) => question.id === selectedInterviewId) ??
    interviewQuestions[0];

  const demonstratedMilestones =
    progress.completedLessons.length +
    progress.completedExercises.length +
    progress.practicedInterviews.length;

  const overallProgress = useMemo(
    () =>
      percentage(
        demonstratedMilestones,
        lessons.length + exercises.length + interviewQuestions.length,
      ),
    [demonstratedMilestones],
  );

  const totalAttempts = useMemo(
    () => Object.values(progress.attempts).reduce((sum, count) => sum + count, 0),
    [progress.attempts],
  );

  const authenticate = useCallback((user: SessionUser) => {
    setHydrated(false);
    setProgress(initialProgress);
    setCurrentUser(user);
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    let alive = true;
    readSavedProgress(currentUser.id)
      .then((stored) => {
        if (alive && stored && isProgressState(stored)) {
          setProgress(normalizeProgress(stored));
        }
      })
      .catch(() => {
        if (alive) {
          setNotice(
            "El navegador bloqueó el almacenamiento local. Puedes practicar, pero exporta tu avance antes de cerrar.",
          );
        }
      })
      .finally(() => {
        if (alive) setHydrated(true);
      });

    const onInstallReady = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onInstallReady);

    return () => {
      alive = false;
      window.removeEventListener("beforeinstallprompt", onInstallReady);
    };
  }, [currentUser]);

  useEffect(() => {
    if (!hydrated || !currentUser) return;
    const timer = window.setTimeout(() => {
      setSaved(false);
      saveProgress(progress, currentUser.id)
        .then(() => setSaved(true))
        .catch(() => {
          setSaved(false);
          setNotice(
            "No se pudo guardar automáticamente. Exporta una copia desde Progreso.",
          );
        });
    }, 280);
    return () => window.clearTimeout(timer);
  }, [currentUser, hydrated, progress]);

  function completeLesson(lessonId: string) {
    const lesson = lessons.find((item) => item.id === lessonId);
    if (!lesson) return;
    setProgress((current) => {
      if (current.completedLessons.includes(lessonId)) return current;
      const completedLessons = [...current.completedLessons, lessonId];
      const touched = withStudyTouch(current);
      return {
        ...touched,
        xp: touched.xp + 25,
        completedLessons,
        mastery: calculateMastery(
          completedLessons,
          touched.completedExercises,
          touched.practicedInterviews,
        ),
        recentActivity: [
          activity("Lección completada", lesson.title),
          ...touched.recentActivity,
        ].slice(0, 8),
      };
    });
    setNotice(`Lección completada: +25 XP en ${trackById[lesson.track].name}.`);
  }

  function changeExercise(exercise: Exercise) {
    setActiveExerciseId(exercise.id);
    setHintIndex(-1);
    setFeedback({
      kind: "idle",
      title: "Tu turno",
      message: "Edita el código y comprueba tu solución. No se penalizan los intentos.",
    });
  }

  function checkSolution() {
    const code = codeByExercise[activeExercise.id] ?? "";
    const failedRule = activeExercise.required.find(
      (rule) => !new RegExp(rule.pattern, "i").test(code),
    );

    setProgress((current) => {
      const touched = withStudyTouch(current);
      const attempted = {
        ...touched,
        attempts: {
          ...touched.attempts,
          [activeExercise.id]: (touched.attempts[activeExercise.id] ?? 0) + 1,
        },
      };

      if (
        failedRule ||
        attempted.completedExercises.includes(activeExercise.id)
      ) {
        return attempted;
      }

      const completedExercises = [
        ...attempted.completedExercises,
        activeExercise.id,
      ];
      return {
        ...attempted,
        xp: attempted.xp + 40,
        completedExercises,
        mastery: calculateMastery(
          attempted.completedLessons,
          completedExercises,
          attempted.practicedInterviews,
        ),
        recentActivity: [
          activity("Reto resuelto", activeExercise.title),
          ...attempted.recentActivity,
        ].slice(0, 8),
      };
    });

    if (failedRule) {
      setFeedback({
        kind: "error",
        title: "Aún no — ya encontraste una pista",
        message: failedRule.feedback,
      });
      return;
    }

    setFeedback({
      kind: "success",
      title: "Solución aceptada",
      message: activeExercise.success,
    });

  }

  function nextHint() {
    setHintIndex((current) =>
      Math.min(current + 1, activeExercise.hints.length - 1),
    );
  }

  function markInterviewPracticed() {
    setProgress((current) => {
      if (current.practicedInterviews.includes(selectedInterview.id)) {
        return current;
      }
      const touched = withStudyTouch(current);
      const practicedInterviews = [
        ...touched.practicedInterviews,
        selectedInterview.id,
      ];
      return {
        ...touched,
        xp: touched.xp + 15,
        practicedInterviews,
        mastery: calculateMastery(
          touched.completedLessons,
          touched.completedExercises,
          practicedInterviews,
        ),
        recentActivity: [
          activity("Entrevista practicada", selectedInterview.title),
          ...touched.recentActivity,
        ].slice(0, 8),
      };
    });
    setNotice("Práctica registrada: +15 XP.");
  }

  async function requestInstall() {
    if (navigator.userAgent.includes("Electron")) {
      setNotice("Ya estás usando la versión instalada de UP Training Center.");
      return;
    }
    if (!installPrompt) {
      setNotice(
        "En computadora abre el menú del navegador y elige “Instalar UP Training Center”. En iPhone usa Compartir › Añadir a pantalla de inicio.",
      );
      return;
    }
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setNotice(
      choice.outcome === "accepted"
        ? "UP Training Center quedó lista para instalarse."
        : "Puedes instalarla después desde el menú del navegador.",
    );
    setInstallPrompt(null);
  }

  function logout() {
    clearLocalSession();
    setHydrated(false);
    setCurrentUser(null);
    setProgress(initialProgress);
    setActiveView("today");
    setNotice("");
  }

  function exportProgress() {
    const payload = {
      app: "UP Training Center",
      version: 2,
      exportedAt: new Date().toISOString(),
      progress,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `up-training-center-progreso-${isoDay()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("Se descargó una copia de tu progreso.");
  }

  function importProgress(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    file
      .text()
      .then((content) => {
        const parsed = JSON.parse(content) as {
          progress?: unknown;
        };
        if (!isProgressState(parsed.progress)) {
          throw new Error("invalid");
        }
        setProgress(normalizeProgress(parsed.progress));
        setNotice("Progreso restaurado correctamente.");
      })
      .catch(() => {
        setNotice(
          "Ese archivo no contiene una copia válida de UP Training Center.",
        );
      })
      .finally(() => {
        event.target.value = "";
      });
  }

  function renderToday() {
    const focusLesson =
      lessons.find((lesson) => !progress.completedLessons.includes(lesson.id)) ??
      lessons[0];

    return (
      <div className="view-stack">
        <section className="page-heading">
          <div>
            <span className="eyebrow">TU SESIÓN · 35 MIN</span>
            <h1>Construye criterio, no sólo sintaxis.</h1>
            <p>
              Tu ruta conecta conceptos, código real y preguntas de entrevista
              para que puedas explicar cada decisión.
            </p>
          </div>
          <StatusPill saved={saved} />
        </section>

        <section className="focus-card">
          <div className="focus-copy">
            <div className="focus-meta">
              <TrackMark trackId={focusLesson.track} />
              <span>{focusLesson.eyebrow}</span>
              <span>•</span>
              <span>{focusLesson.minutes} min</span>
            </div>
            <h2>{focusLesson.title}</h2>
            <p>{focusLesson.description}</p>
            <div className="focus-actions">
              <button className="primary-button" onClick={() => setActiveView("lab")}>
                Continuar sesión <span aria-hidden="true">→</span>
              </button>
              <button
                className="text-button"
                onClick={() => completeLesson(focusLesson.id)}
                disabled={progress.completedLessons.includes(focusLesson.id)}
              >
                {progress.completedLessons.includes(focusLesson.id)
                  ? "Lección completada"
                  : "Marcar teoría como vista"}
              </button>
            </div>
          </div>
          <div className="focus-visual" aria-label="Vista previa del reto de código">
            <div className="code-window">
              <div className="window-bar">
                <span />
                <span />
                <span />
                <em>Program.cs</em>
              </div>
              <pre>
                <code>
                  <span className="code-purple">string?</span> nickname = profile.
                  <span className="code-blue">Nickname</span>;{"\n"}
                  {"Console."}<span className="code-blue">WriteLine</span>
                  {"($\"Hola, "}
                  <span className="code-green">
                    {"{nickname ?? \"Invitado\"}"}
                  </span>
                  {"\");"}
                </code>
              </pre>
            </div>
            <div className="coach-note">
              <span className="coach-icon">✓</span>
              <div>
                <strong>Buena decisión</strong>
                <p>El contrato ahora comunica que el valor puede estar ausente.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="dashboard-grid">
          <div className="section-card path-preview">
            <div className="section-title-row">
              <div>
                <span className="eyebrow">TU MAPA</span>
                <h2>Ruta de aprendizaje</h2>
              </div>
              <button className="link-button" onClick={() => setActiveView("path")}>
                Ver ruta completa
              </button>
            </div>
            <div className="compact-track-list">
              {tracks.slice(0, 4).map((track, index) => (
                <button
                  className="compact-track"
                  key={track.id}
                  onClick={() => setActiveView("path")}
                >
                  <span className="track-order">{String(index + 1).padStart(2, "0")}</span>
                  <TrackMark trackId={track.id} />
                  <span className="compact-track-copy">
                    <strong>{track.name}</strong>
                    <small>{track.modules.slice(0, 2).join(" · ")}</small>
                  </span>
                  <span className="mini-progress" aria-label={`${progress.mastery[track.id]}%`}>
                    <span style={{ width: `${progress.mastery[track.id]}%` }} />
                  </span>
                  <b>{progress.mastery[track.id]}%</b>
                </button>
              ))}
            </div>
          </div>

          <aside className="section-card weekly-card">
            <span className="eyebrow">ESTA SEMANA</span>
            <div className="weekly-score">
              <strong>{progress.xp}</strong>
              <span>XP</span>
            </div>
            <div className="week-bars" aria-label="Actividad de los últimos siete días">
              {[32, 60, 42, 88, 52, 18, 0].map((height, index) => (
                <div className="day-bar" key={index}>
                  <span style={{ height: `${Math.max(height, 8)}%` }} />
                  <small>{["L", "M", "X", "J", "V", "S", "D"][index]}</small>
                </div>
              ))}
            </div>
            <div className="weekly-stats">
              <div>
                <span>Racha</span>
                <strong>{progress.streak} día{progress.streak === 1 ? "" : "s"} 🔥</strong>
              </div>
              <div>
                <span>Precisión</span>
                <strong>
                  {totalAttempts
                    ? percentage(progress.completedExercises.length, totalAttempts)
                    : 0}
                  %
                </strong>
              </div>
            </div>
          </aside>
        </section>

        <section className="interview-strip">
          <div className="interview-strip-mark">◎</div>
          <div>
            <span className="eyebrow">PULSO DE ENTREVISTA</span>
            <h3>{interviewQuestions[0].title}</h3>
            <p>{interviewQuestions[0].question}</p>
          </div>
          <button
            className="secondary-button"
            onClick={() => {
              setSelectedInterviewId(interviewQuestions[0].id);
              setAnswerVisible(false);
              setActiveView("interviews");
            }}
          >
            Practicar ahora
          </button>
        </section>
      </div>
    );
  }

  function renderPath() {
    return (
      <div className="view-stack">
        <section className="page-heading page-heading--compact">
          <div>
            <span className="eyebrow">PLAN DE 36 SEMANAS · BASADO EN DOMINIO</span>
            <h1>Una ruta que conecta todo el stack.</h1>
            <p>
              Avanza al demostrar comprensión: explicación, implementación, depuración
              y decisión de diseño.
            </p>
          </div>
          <StatusPill saved={saved} />
        </section>

        <section className="principles-row" aria-label="Método de aprendizaje">
          <div><strong>01</strong><span>Comprende</span><small>modelo mental</small></div>
          <div><strong>02</strong><span>Implementa</span><small>práctica guiada</small></div>
          <div><strong>03</strong><span>Depura</span><small>errores reales</small></div>
          <div><strong>04</strong><span>Explica</span><small>modo entrevista</small></div>
          <div><strong>05</strong><span>Integra</span><small>proyecto de etapa</small></div>
        </section>

        <section className="roadmap">
          {tracks.map((track, index) => {
            const trackLessons = lessons.filter((lesson) => lesson.track === track.id);
            return (
              <article
                className="roadmap-row"
                key={track.id}
                style={{ "--track-color": track.color } as CSSProperties}
              >
                <div className="roadmap-index">
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <div className="roadmap-line" />
                </div>
                <TrackMark trackId={track.id} />
                <div className="roadmap-main">
                  <div className="roadmap-title">
                    <div>
                      <small>SEMANA {track.weeks}</small>
                      <h2>{track.name}</h2>
                    </div>
                    <span>{progress.mastery[track.id]}% dominio</span>
                  </div>
                  <p>{track.description}</p>
                  <div className="module-pills">
                    {track.modules.map((module) => (
                      <span key={module}>{module}</span>
                    ))}
                  </div>
                  {trackLessons.length > 0 && (
                    <div className="lesson-list">
                      {trackLessons.map((lesson) => {
                        const complete = progress.completedLessons.includes(lesson.id);
                        return (
                          <button
                            key={lesson.id}
                            className={`lesson-item${complete ? " lesson-item--complete" : ""}`}
                            onClick={() => completeLesson(lesson.id)}
                          >
                            <span className="lesson-check">{complete ? "✓" : "○"}</span>
                            <span>
                              <strong>{lesson.title}</strong>
                              <small>{lesson.minutes} min · {lesson.level}</small>
                            </span>
                            {lesson.interview && <em>ENTREVISTA</em>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      </div>
    );
  }

  function renderLab() {
    const currentCode = codeByExercise[activeExercise.id] ?? activeExercise.starter;
    return (
      <div className="view-stack">
        <section className="page-heading page-heading--compact">
          <div>
            <span className="eyebrow">LABORATORIO · RETROALIMENTACIÓN INMEDIATA</span>
            <h1>Aprende depurando decisiones.</h1>
            <p>
              Cada intento identifica el concepto faltante y te da una pista concreta,
              sin revelar la solución completa.
            </p>
          </div>
          <StatusPill saved={saved} />
        </section>

        <div className="exercise-tabs" role="tablist" aria-label="Retos disponibles">
          {exercises.map((exercise) => (
            <button
              key={exercise.id}
              role="tab"
              aria-selected={exercise.id === activeExercise.id}
              className={exercise.id === activeExercise.id ? "active" : ""}
              onClick={() => changeExercise(exercise)}
            >
              <TrackMark trackId={exercise.track} />
              <span>{exercise.language}</span>
              {progress.completedExercises.includes(exercise.id) && <b>✓</b>}
            </button>
          ))}
        </div>

        <section className="lab-grid">
          <div className="challenge-panel">
            <div className="challenge-heading">
              <div>
                <span className="eyebrow">{activeExercise.language} · RETO PRÁCTICO</span>
                <h2>{activeExercise.title}</h2>
              </div>
              <span className="xp-chip">+40 XP</span>
            </div>
            <p className="challenge-brief">{activeExercise.brief}</p>
            <div className="task-box">
              <span>OBJETIVO</span>
              <p>{activeExercise.prompt}</p>
            </div>
            <div className="hint-area">
              <div className="hint-heading">
                <span>Pistas graduadas</span>
                <button onClick={nextHint} disabled={hintIndex >= activeExercise.hints.length - 1}>
                  {hintIndex < 0 ? "Dame una pista" : "Siguiente pista"}
                </button>
              </div>
              {hintIndex >= 0 ? (
                <ol>
                  {activeExercise.hints.slice(0, hintIndex + 1).map((hint) => (
                    <li key={hint}>{hint}</li>
                  ))}
                </ol>
              ) : (
                <p className="muted-copy">
                  Intenta primero. Pedir una pista no reduce tu puntuación.
                </p>
              )}
            </div>
            <div className="concept-card">
              <strong>Concepto que entrenas</strong>
              <p>
                Un buen contrato hace visibles los casos límite antes de que lleguen
                a producción.
              </p>
            </div>
          </div>

          <div className="editor-panel">
            <div className="editor-toolbar">
              <div>
                <span />
                <span />
                <span />
              </div>
              <strong>{activeExercise.language}</strong>
              <small>intento {(progress.attempts[activeExercise.id] ?? 0) + 1}</small>
            </div>
            <label className="sr-only" htmlFor="code-editor">
              Código de tu solución
            </label>
            <textarea
              id="code-editor"
              className="code-editor"
              value={currentCode}
              spellCheck={false}
              onChange={(event) =>
                setCodeByExercise((current) => ({
                  ...current,
                  [activeExercise.id]: event.target.value,
                }))
              }
            />
            <div className={`feedback-box feedback-box--${feedback.kind}`} role="status">
              <span className="feedback-symbol">
                {feedback.kind === "success" ? "✓" : feedback.kind === "error" ? "!" : "→"}
              </span>
              <div>
                <strong>{feedback.title}</strong>
                <p>{feedback.message}</p>
              </div>
            </div>
            <div className="editor-actions">
              <button
                className="text-button"
                onClick={() =>
                  setCodeByExercise((current) => ({
                    ...current,
                    [activeExercise.id]: activeExercise.starter,
                  }))
                }
              >
                Restaurar código
              </button>
              <button className="primary-button" onClick={checkSolution}>
                Comprobar solución <span aria-hidden="true">⌘↵</span>
              </button>
            </div>
          </div>
        </section>
      </div>
    );
  }

  function renderInterviews() {
    return (
      <div className="view-stack">
        <section className="page-heading page-heading--compact">
          <div>
            <span className="eyebrow">SIMULADOR · RESPUESTA + REPREGUNTAS</span>
            <h1>Practica pensar en voz alta.</h1>
            <p>
              Problemas técnicos que miden razonamiento, trade-offs y comunicación,
              no memoria de definiciones.
            </p>
          </div>
          <StatusPill saved={saved} />
        </section>

        <section className="interview-layout">
          <div className="question-list">
            {interviewQuestions.map((question) => {
              const active = question.id === selectedInterview.id;
              const done = progress.practicedInterviews.includes(question.id);
              return (
                <button
                  key={question.id}
                  className={`question-card${active ? " question-card--active" : ""}`}
                  onClick={() => {
                    setSelectedInterviewId(question.id);
                    setAnswerVisible(false);
                  }}
                >
                  <TrackMark trackId={question.track} />
                  <span>
                    <small>{question.companyType}</small>
                    <strong>{question.title}</strong>
                    <em>{question.difficulty} · {question.minutes} min</em>
                  </span>
                  <b>{done ? "✓" : "→"}</b>
                </button>
              );
            })}
          </div>

          <article className="interview-stage">
            <div className="interview-stage-meta">
              <span>{selectedInterview.companyType}</span>
              <span>{selectedInterview.difficulty}</span>
              <span>{selectedInterview.minutes} minutos</span>
            </div>
            <h2>{selectedInterview.title}</h2>
            <blockquote>{selectedInterview.question}</blockquote>
            <div className="thinking-steps">
              <span>Antes de responder</span>
              <ol>
                <li>Aclara supuestos y restricciones.</li>
                <li>Expón una opción base antes de optimizar.</li>
                <li>Nombra el costo de tu decisión.</li>
              </ol>
            </div>
            {answerVisible ? (
              <div className="answer-panel">
                <span>RESPUESTA DE REFERENCIA</span>
                <p>{selectedInterview.answer}</p>
                <strong>Señales que busca el entrevistador</strong>
                <ul>
                  {selectedInterview.signals.map((signal) => (
                    <li key={signal}>{signal}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="answer-placeholder">
                <span>02:00</span>
                <p>Intenta responder durante dos minutos antes de ver la guía.</p>
              </div>
            )}
            <div className="interview-actions">
              <button
                className="secondary-button"
                onClick={() => setAnswerVisible((current) => !current)}
              >
                {answerVisible ? "Ocultar respuesta" : "Ver respuesta de referencia"}
              </button>
              <button
                className="primary-button"
                onClick={markInterviewPracticed}
                disabled={progress.practicedInterviews.includes(selectedInterview.id)}
              >
                {progress.practicedInterviews.includes(selectedInterview.id)
                  ? "Práctica registrada"
                  : "Registrar práctica +15 XP"}
              </button>
            </div>
          </article>
        </section>
      </div>
    );
  }

  function renderProgress() {
    return (
      <div className="view-stack">
        <section className="page-heading page-heading--compact">
          <div>
            <span className="eyebrow">PROGRESO LOCAL · TU INFORMACIÓN ES TUYA</span>
            <h1>Haz visible lo que ya dominas.</h1>
            <p>
              El avance se guarda en este dispositivo. Descarga una copia para
              moverlo a otra computadora o conservar un respaldo.
            </p>
          </div>
          <StatusPill saved={saved} />
        </section>

        <section className="metric-grid">
          <article className="metric-card metric-card--accent">
            <span>Dominio global</span>
            <strong>{overallProgress}%</strong>
            <div className="metric-progress"><span style={{ width: `${overallProgress}%` }} /></div>
            <small>
              {demonstratedMilestones}{" "}
              {demonstratedMilestones === 1
                ? "hito demostrado"
                : "hitos demostrados"}
            </small>
          </article>
          <article className="metric-card">
            <span>Experiencia</span>
            <strong>{progress.xp} <em>XP</em></strong>
            <small>Siguiente nivel en {Math.max(0, 500 - progress.xp)} XP</small>
          </article>
          <article className="metric-card">
            <span>Constancia</span>
            <strong>{progress.streak} <em>días</em></strong>
            <small>La racha crece al completar una actividad</small>
          </article>
          <article className="metric-card">
            <span>Iteraciones</span>
            <strong>{totalAttempts}</strong>
            <small>Intentar también es evidencia de aprendizaje</small>
          </article>
        </section>

        <section className="progress-layout">
          <div className="section-card mastery-card">
            <div className="section-title-row">
              <div>
                <span className="eyebrow">MAPA DE DOMINIO</span>
                <h2>Competencias</h2>
              </div>
            </div>
            <div className="mastery-list">
              {tracks.map((track) => (
                <div className="mastery-row" key={track.id}>
                  <TrackMark trackId={track.id} />
                  <span><strong>{track.name}</strong><small>{track.modules[0]} · {track.modules[1]}</small></span>
                  <div><span style={{ width: `${progress.mastery[track.id]}%`, background: track.color }} /></div>
                  <b>{progress.mastery[track.id]}%</b>
                </div>
              ))}
            </div>
          </div>

          <div className="progress-side">
            <article className="section-card data-card">
              <span className="eyebrow">RESPALDO PORTÁTIL</span>
              <h2>Lleva tu progreso contigo</h2>
              <p>Exporta un archivo privado y restáuralo en cualquier instalación.</p>
              <button className="primary-button" onClick={exportProgress}>
                Descargar progreso
              </button>
              <button className="secondary-button" onClick={() => importInputRef.current?.click()}>
                Restaurar desde archivo
              </button>
              <input
                ref={importInputRef}
                className="sr-only"
                type="file"
                accept="application/json,.json"
                onChange={importProgress}
              />
            </article>
            <article className="section-card activity-card">
              <span className="eyebrow">ACTIVIDAD RECIENTE</span>
              {progress.recentActivity.length ? (
                <ul>
                  {progress.recentActivity.slice(0, 5).map((item) => (
                    <li key={item.id}>
                      <span>✓</span>
                      <div><strong>{item.label}</strong><small>{item.detail}</small></div>
                      <time>{item.at}</time>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="empty-state">Completa tu primera actividad y aparecerá aquí.</p>
              )}
            </article>
          </div>
        </section>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthGate onAuthenticated={authenticate} />;
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => setActiveView("today")} aria-label="Ir al inicio">
          <span className="brand-mark"><i /><b>UP</b></span>
          <span className="brand-name"><strong>UP</strong><small>Training Center</small></span>
        </button>

        <nav aria-label="Navegación principal">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={activeView === item.id ? "active" : ""}
              onClick={() => setActiveView(item.id)}
            >
              <span className="nav-glyph" aria-hidden="true">{item.glyph}</span>
              <span>{item.label}</span>
              {item.id === "lab" && progress.completedExercises.length > 0 && (
                <b>{progress.completedExercises.length}</b>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-spacer" />

        <div className="sidebar-user">
          <span aria-hidden="true">
            {currentUser.username.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <strong>{currentUser.username}</strong>
            <small>{currentUser.email}</small>
          </div>
          <button type="button" onClick={logout} aria-label="Cerrar sesión">
            Salir
          </button>
        </div>

        <div className="sidebar-progress">
          <div
            className="progress-ring"
            style={{ "--progress": `${overallProgress * 3.6}deg` } as CSSProperties}
          >
            <span>{overallProgress}%</span>
          </div>
          <div><strong>Nivel 1</strong><small>Fundamentos</small></div>
        </div>

        <button className="install-button" onClick={requestInstall}>
          <span aria-hidden="true">↓</span>
          <span><strong>Instalar app</strong><small>Usar sin conexión</small></span>
        </button>
      </aside>

      <main className="main-content">
        <header className="mobile-header">
          <button className="brand" onClick={() => setActiveView("today")}>
            <span className="brand-mark"><i /><b>UP</b></span>
            <span className="brand-name"><strong>UP</strong><small>Training Center</small></span>
          </button>
          <button
            className="mobile-account"
            type="button"
            onClick={logout}
            aria-label={`Cerrar sesión de ${currentUser.username}`}
          >
            <span>{currentUser.username.slice(0, 1).toUpperCase()}</span>
            <small>Salir</small>
          </button>
        </header>

        {activeView === "today" && renderToday()}
        {activeView === "path" && renderPath()}
        {activeView === "lab" && renderLab()}
        {activeView === "interviews" && renderInterviews()}
        {activeView === "progress" && renderProgress()}
      </main>

      <nav className="mobile-nav" aria-label="Navegación móvil">
        {navigation.map((item) => (
          <button
            key={item.id}
            className={activeView === item.id ? "active" : ""}
            onClick={() => setActiveView(item.id)}
          >
            <span>{item.glyph}</span>
            <small>{item.label}</small>
          </button>
        ))}
      </nav>

      {notice && (
        <div className="toast" role="status">
          <span>{notice}</span>
          <button onClick={() => setNotice("")} aria-label="Cerrar aviso">×</button>
        </div>
      )}
    </div>
  );
}
