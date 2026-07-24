# Plan de producto y aprendizaje de RutaStack

## Resultado buscado

RutaStack debe llevar a una persona desde fundamentos de programación hasta la
capacidad de diseñar, implementar, depurar y explicar un sistema backend
distribuido. Completar videos o leer texto no cuenta como dominio: cada etapa
exige evidencia práctica.

## Modelo pedagógico

Cada concepto pasa por cinco momentos:

1. **Comprender:** modelo mental, vocabulario y límites.
2. **Implementar:** práctica breve con una sola dificultad nueva.
3. **Depurar:** código defectuoso y retroalimentación diagnóstica.
4. **Explicar:** pregunta de entrevista y repreguntas.
5. **Integrar:** proyecto pequeño con decisiones y trade-offs.

El progreso combina:

- teoría completada;
- ejercicios correctos;
- número y tipo de intentos;
- repaso espaciado;
- entrevistas practicadas;
- proyecto de etapa evaluado con una rúbrica.

## Ruta profunda de 36 semanas

| Etapa | Semanas | Resultado demostrable |
| --- | ---: | --- |
| C# profesional | 1–8 | API de consola testeada, async y LINQ con criterio |
| Java moderno | 5–12 | Servicio equivalente y comparación razonada con C# |
| SQL y datos | 9–15 | Esquema normalizado, consultas, índices y transacciones |
| Entity Framework Core | 14–19 | Persistencia con migraciones y consultas medidas |
| ASP.NET MVC y Web API | 18–25 | API segura, validada, observable y con pruebas |
| AJAX y experiencia web | 22–27 | Cliente resistente a latencia, errores y cancelación |
| Microservicios | 26–36 | Sistema con límites, eventos, resiliencia y trazas |

La superposición es intencional: permite comparar conceptos y reutilizarlos en
contextos distintos.

## Retroalimentación

La retroalimentación debe ser:

- **diagnóstica:** nombra el concepto que falta;
- **gradual:** da una pista antes de mostrar una referencia;
- **accionable:** indica qué revisar en el intento actual;
- **explicativa:** al acertar, conecta la solución con producción;
- **segura:** el código arbitrario nunca se ejecuta dentro del proceso web.

El MVP usa evaluadores deterministas para retos guiados. La siguiente fase
introduce un runner aislado por contenedor, sin red, con CPU, memoria y tiempo
limitados. C#, Java y SQL tendrán imágenes separadas y casos de prueba ocultos.

## Banco de entrevistas

Cada pregunta registra:

- nivel objetivo: Junior, Mid o Senior;
- tipo de empresa y contexto;
- tiempo recomendado;
- respuesta de referencia;
- señales positivas;
- errores frecuentes;
- repreguntas y variaciones.

Categorías iniciales: lenguaje, POO/SOLID, estructuras de datos, SQL,
rendimiento, HTTP, seguridad, testing, concurrencia, diseño de APIs,
arquitectura distribuida y operación.

## Arquitectura por fases

### Fase 1 — MVP local-first

- PWA instalable en escritorio y móvil.
- React/Vinext con experiencia responsive.
- IndexedDB como fuente local de progreso.
- respaldo JSON portable.
- contenido versionado dentro del producto.
- service worker para abrir y estudiar sin conexión.

### Fase 2 — Evaluación real

- runner aislado de C#, Java y SQL;
- pruebas visibles y ocultas;
- comparación de salidas y análisis de compilación;
- telemetría pedagógica sin guardar código sensible;
- catálogo ampliado y sistema de repaso.

### Fase 3 — Cuenta y sincronización

- inicio de sesión opcional;
- sincronización cifrada entre dispositivos;
- resolución de conflictos offline;
- cohortes, metas y reportes personales;
- conservar exportación local para evitar dependencia del proveedor.

### Fase 4 — Preparación laboral

- simulaciones cronometradas;
- entrevistas de diseño de sistemas;
- proyectos de portafolio;
- rúbricas y revisión asistida;
- planes adaptativos según vacíos de dominio.

## Calidad y optimización

- navegación completa con teclado y objetivos táctiles amplios;
- contraste AA y soporte para movimiento reducido;
- contenido usable en 360 px y pantallas de escritorio;
- carga inicial sin bibliotecas visuales innecesarias;
- persistencia desacoplada del render;
- caché versionada y actualizable;
- presupuestos futuros: LCP menor a 2.5 s, INP menor a 200 ms y bundle inicial
  menor a 180 KB comprimidos.

## Decisiones conscientes del MVP

- No se ejecuta código arbitrario todavía: simularlo en el navegador sería
  inseguro y daría una falsa sensación de corrección.
- No hay cuenta obligatoria: el usuario puede empezar en segundos y mantiene
  propiedad del respaldo.
- El contenido inicial demuestra el sistema, pero el catálogo debe crecer con
  revisión técnica y pedagógica antes de considerarse un curso completo.
