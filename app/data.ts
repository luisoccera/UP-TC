export type TrackId =
  | "csharp"
  | "java"
  | "sql"
  | "efcore"
  | "mvc"
  | "ajax"
  | "microservices";

export type Track = {
  id: TrackId;
  code: string;
  name: string;
  description: string;
  color: string;
  weeks: string;
  modules: string[];
};

export type Lesson = {
  id: string;
  track: TrackId;
  eyebrow: string;
  title: string;
  description: string;
  minutes: number;
  level: "Base" | "Intermedio" | "Avanzado";
  interview: boolean;
};

export type Exercise = {
  id: string;
  track: TrackId;
  language: string;
  title: string;
  brief: string;
  prompt: string;
  starter: string;
  hints: string[];
  required: { pattern: string; feedback: string }[];
  success: string;
};

export type InterviewQuestion = {
  id: string;
  track: TrackId;
  companyType: string;
  difficulty: "Junior" | "Mid" | "Senior";
  minutes: number;
  title: string;
  question: string;
  answer: string;
  signals: string[];
};

export const tracks: Track[] = [
  {
    id: "csharp",
    code: "C#",
    name: "C# profesional",
    description: "Del lenguaje y LINQ a concurrencia, testing y diseño mantenible.",
    color: "#7b61ff",
    weeks: "1–8",
    modules: ["Tipos y null safety", "POO y SOLID", "LINQ", "Async/await", "Testing"],
  },
  {
    id: "java",
    code: "Jv",
    name: "Java moderno",
    description: "Colecciones, streams, concurrencia, JVM y Spring como contraste.",
    color: "#ff7548",
    weeks: "5–12",
    modules: ["Core Java", "Colecciones", "Streams", "JVM", "Spring Boot"],
  },
  {
    id: "sql",
    code: "DB",
    name: "SQL y datos",
    description: "Modelado relacional, consultas reales, índices y rendimiento.",
    color: "#167f89",
    weeks: "9–15",
    modules: ["Modelado", "Joins", "Agregaciones", "Índices", "Transacciones"],
  },
  {
    id: "efcore",
    code: "EF",
    name: "Entity Framework Core",
    description: "Mapeo, consultas, migraciones y diagnóstico de rendimiento.",
    color: "#aa68d8",
    weeks: "14–19",
    modules: ["DbContext", "Relaciones", "LINQ a SQL", "Migraciones", "Optimización"],
  },
  {
    id: "mvc",
    code: "MV",
    name: "ASP.NET MVC y APIs",
    description: "HTTP, MVC, APIs REST, seguridad, validación y observabilidad.",
    color: "#3178c6",
    weeks: "18–25",
    modules: ["HTTP", "MVC", "Web API", "Auth", "Testing de integración"],
  },
  {
    id: "ajax",
    code: "AX",
    name: "AJAX y experiencia web",
    description: "Fetch, asincronía, estados de UI y comunicación robusta.",
    color: "#e6a52e",
    weeks: "22–27",
    modules: ["DOM", "Fetch", "Errores", "Accesibilidad", "Rendimiento"],
  },
  {
    id: "microservices",
    code: "µS",
    name: "Microservicios",
    description: "Límites, mensajería, resiliencia, datos y operación distribuida.",
    color: "#53657a",
    weeks: "26–36",
    modules: ["DDD", "Mensajería", "Resiliencia", "Observabilidad", "Despliegue"],
  },
];

export const lessons: Lesson[] = [
  {
    id: "cs-nullability",
    track: "csharp",
    eyebrow: "C# · Fundamentos sólidos",
    title: "Nullability sin sorpresas",
    description: "Diseña contratos que hagan imposible esconder un null peligroso.",
    minutes: 18,
    level: "Base",
    interview: true,
  },
  {
    id: "cs-linq",
    track: "csharp",
    eyebrow: "C# · Colecciones",
    title: "LINQ: costo y legibilidad",
    description: "Transforma datos sin enumeraciones duplicadas ni consultas opacas.",
    minutes: 24,
    level: "Intermedio",
    interview: true,
  },
  {
    id: "java-streams",
    track: "java",
    eyebrow: "Java · Programación funcional",
    title: "Streams con intención",
    description: "Domina map, filter y reduce, y reconoce cuándo un bucle es mejor.",
    minutes: 26,
    level: "Intermedio",
    interview: true,
  },
  {
    id: "sql-joins",
    track: "sql",
    eyebrow: "SQL · Consultas reales",
    title: "Joins que no duplican datos",
    description: "Razona sobre cardinalidad antes de escribir una sola cláusula.",
    minutes: 22,
    level: "Base",
    interview: true,
  },
  {
    id: "ef-n-plus-one",
    track: "efcore",
    eyebrow: "EF Core · Rendimiento",
    title: "Detecta el problema N+1",
    description: "Lee consultas, mide viajes a la base y elige la carga correcta.",
    minutes: 28,
    level: "Avanzado",
    interview: true,
  },
  {
    id: "mvc-pipeline",
    track: "mvc",
    eyebrow: "ASP.NET · Arquitectura",
    title: "El pipeline de una petición",
    description: "Sigue una petición desde middleware hasta la respuesta final.",
    minutes: 25,
    level: "Intermedio",
    interview: true,
  },
  {
    id: "ajax-states",
    track: "ajax",
    eyebrow: "Web · Asincronía",
    title: "UI resistente a redes reales",
    description: "Modela carga, éxito, vacío, reintento, cancelación y error.",
    minutes: 20,
    level: "Intermedio",
    interview: false,
  },
  {
    id: "micro-boundaries",
    track: "microservices",
    eyebrow: "Microservicios · Diseño",
    title: "Límites antes que servicios",
    description: "Encuentra capacidades de negocio sin crear un monolito distribuido.",
    minutes: 32,
    level: "Avanzado",
    interview: true,
  },
];

export const exercises: Exercise[] = [
  {
    id: "ex-cs-null",
    track: "csharp",
    language: "C#",
    title: "Repara un saludo inseguro",
    brief: "Una API puede devolver un apodo nulo. Corrige el contrato y conserva una salida útil.",
    prompt: "Declara nickname como nullable y usa el operador ?? para mostrar “Invitado” cuando no exista.",
    starter: `string nickname = profile.Nickname;\nConsole.WriteLine($"Hola, {nickname}");`,
    hints: [
      "En C#, el signo ? hace explícito que una referencia puede ser null.",
      "El operador ?? elige el valor de la derecha cuando el de la izquierda es null.",
    ],
    required: [
      {
        pattern: "string\\s*\\?\\s*nickname",
        feedback: "El contrato aún afirma que nickname nunca es null. Decláralo como string?.",
      },
      {
        pattern: "nickname\\s*\\?\\?",
        feedback: "Ya expresaste el riesgo, pero aún falta un valor alternativo con el operador ??.",
      },
      {
        pattern: "Invitado",
        feedback: "Usa exactamente “Invitado” como salida segura para que el comportamiento sea visible.",
      },
    ],
    success:
      "Bien: el tipo comunica el riesgo y ?? resuelve el caso vacío sin lanzar una excepción. En una entrevista explica también por qué string.Empty no siempre representa lo mismo que ausencia.",
  },
  {
    id: "ex-sql-orders",
    track: "sql",
    language: "SQL",
    title: "Clientes con actividad real",
    brief: "Producto necesita un reporte con el total de pedidos por cliente, incluso para clientes sin pedidos.",
    prompt: "Usa LEFT JOIN, COUNT y GROUP BY. Devuelve CustomerId y OrderCount.",
    starter: `SELECT c.Id AS CustomerId\nFROM Customers c;`,
    hints: [
      "Si deben aparecer clientes sin pedidos, INNER JOIN descarta demasiado.",
      "Agrupa por la clave estable del cliente, no por el objeto completo.",
    ],
    required: [
      {
        pattern: "left\\s+join\\s+orders",
        feedback: "INNER JOIN perdería los clientes sin pedidos. Necesitas LEFT JOIN con Orders.",
      },
      {
        pattern: "count\\s*\\(",
        feedback: "Falta calcular OrderCount con COUNT sobre una columna de Orders.",
      },
      {
        pattern: "group\\s+by\\s+c\\.id",
        feedback: "La agregación necesita GROUP BY c.Id para producir una fila por cliente.",
      },
    ],
    success:
      "Correcto: preservas a todos los clientes y agregas pedidos por clave. El siguiente paso profesional es revisar el plan de ejecución y un índice sobre Orders.CustomerId.",
  },
  {
    id: "ex-java-optional",
    track: "java",
    language: "Java",
    title: "Optional sin get() peligroso",
    brief: "El repositorio puede no encontrar un usuario. Evita NoSuchElementException.",
    prompt: "Sustituye get() por orElseThrow con una excepción que explique qué usuario falta.",
    starter: `Optional<User> user = repository.findById(id);\nreturn user.get();`,
    hints: [
      "Optional.get() oculta qué hacer cuando el valor no existe.",
      "orElseThrow acepta un Supplier de la excepción.",
    ],
    required: [
      {
        pattern: "\\.orElseThrow\\s*\\(",
        feedback: "Aún se extrae el valor sin modelar el caso ausente. Usa orElseThrow(...).",
      },
      {
        pattern: "new\\s+\\w*Exception",
        feedback: "Incluye una excepción explícita para que el fallo tenga significado de dominio.",
      },
    ],
    success:
      "Bien: el caso ausente ya forma parte del flujo y el error gana contexto. En código real conviene una excepción de dominio y mapearla a HTTP 404 en el borde.",
  },
];

export const interviewQuestions: InterviewQuestion[] = [
  {
    id: "iq-dependency-lifetime",
    track: "mvc",
    companyType: "SaaS · Backend",
    difficulty: "Mid",
    minutes: 12,
    title: "¿Transient, Scoped o Singleton?",
    question:
      "Un servicio Singleton depende de un DbContext registrado como Scoped. ¿Qué problema existe y cómo rediseñarías la dependencia?",
    answer:
      "El Singleton puede capturar una dependencia Scoped y conservarla fuera de su solicitud, provocando estado compartido, uso concurrente y un ciclo de vida incorrecto. La opción preferida es hacer Scoped el consumidor. Si el trabajo realmente vive fuera de la solicitud, se crea un scope explícito con IServiceScopeFactory o se usa IDbContextFactory, manteniendo corto el ciclo del contexto.",
    signals: ["Detecta captive dependency", "Habla de thread safety", "Propone un límite de vida explícito"],
  },
  {
    id: "iq-index",
    track: "sql",
    companyType: "Fintech · Datos",
    difficulty: "Mid",
    minutes: 15,
    title: "La consulta es correcta, pero tarda 8 segundos",
    question:
      "Una consulta filtra Orders por CustomerId y CreatedAt, ordena por CreatedAt y devuelve Status y Total. ¿Cómo la diagnosticas antes de cambiar código?",
    answer:
      "Primero se mide con el plan real de ejecución y estadísticas de I/O/tiempo. Se revisan cardinalidad, scans, lookups, bloqueos y parámetros. Un índice compuesto (CustomerId, CreatedAt) puede sostener filtro y orden; Status y Total podrían incluirse si el patrón lo justifica. El índice se valida contra el costo de escritura y con datos representativos.",
    signals: ["Mide antes de optimizar", "Lee el plan", "Explica orden e inclusión del índice"],
  },
  {
    id: "iq-distributed-transaction",
    track: "microservices",
    companyType: "Marketplace · Plataforma",
    difficulty: "Senior",
    minutes: 25,
    title: "Pago aceptado, pedido no confirmado",
    question:
      "Pago y Pedidos son servicios separados. El cobro fue exitoso, pero el evento de confirmación no llegó. Diseña una solución que no dependa de una transacción distribuida.",
    answer:
      "El servicio de Pago persiste el cambio y el evento en una misma transacción local mediante Outbox. Un publicador reintenta hasta entregarlo; Pedidos consume con una clave idempotente e Inbox o registro de mensajes. Se definen estados intermedios, reintentos con backoff, cola de fallos y una compensación de negocio. Correlation IDs, métricas y trazas permiten operar la inconsistencia temporal.",
    signals: ["Outbox transaccional", "Consumidor idempotente", "Compensación y observabilidad"],
  },
  {
    id: "iq-linq-enumeration",
    track: "csharp",
    companyType: "Consultoría · .NET",
    difficulty: "Junior",
    minutes: 10,
    title: "¿Qué significa ejecución diferida en LINQ?",
    question:
      "Una consulta LINQ se enumera dos veces y su origen es una llamada costosa. ¿Qué puede ocurrir y qué alternativas tienes?",
    answer:
      "Muchos operadores LINQ devuelven IEnumerable y ejecutan el pipeline al enumerarse, no al declararse. Dos enumeraciones pueden repetir trabajo o producir resultados diferentes si el origen cambia. Se puede materializar una vez con ToList cuando se necesita una instantánea, conservar la consulta si la reevaluación es intencional, o cambiar la API para exponer claramente el costo.",
    signals: ["Explica cuándo se ejecuta", "Reconoce el costo repetido", "No materializa por reflejo"],
  },
];

export const trackById = Object.fromEntries(
  tracks.map((track) => [track.id, track]),
) as Record<TrackId, Track>;
