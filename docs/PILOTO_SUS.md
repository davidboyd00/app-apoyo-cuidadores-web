# Piloto de usabilidad con cuidadores (EDT 5.2.1)

Pauta para las pruebas guiadas y la evaluación SUS. Lista para imprimir.

## Decisión clave: usar una cuenta de demostración

Las tareas se hacen sobre una **persona ficticia** ya cargada (cuenta de
demostración), **no con datos reales** de quien participa. Así:

- no se tratan datos de salud de terceros durante el piloto;
- todas las personas ven el mismo escenario (resultados comparables);
- el asistente de IA puede usar la capa gratuita sin exponer datos reales
  (ver `docs/DESPLIEGUE.md` §6 del backend).

Preparar: una cuenta de demostración por participante (o restablecer entre
sesiones) con la persona ficticia, 1 semana de registros, dos medicamentos y
un turno en curso. El script `tests/integracion/demo.py` del backend muestra
qué cargar.

## Participantes y sesión

- **5 a 8 cuidadores familiares**, idealmente con distintas edades y manejo
  de tecnología (al menos 2 mayores de 60).
- Sesión de **25 minutos**: 2 de bienvenida, 15 de tareas, 5 de SUS y 3 de
  preguntas abiertas.
- Cada participante usa **su propio celular** (o uno de prueba).
- **Consentimiento informado** firmado antes de empezar: objetivo, duración,
  que se evalúa la app y no a la persona, que puede retirarse cuando quiera,
  que no se graba su rostro (si se graba pantalla, pedirlo explícitamente).

Roles: una persona **facilita** (lee las tareas, no ayuda salvo que la
persona se rinda) y otra **observa** (anota tiempos, errores y comentarios).

## Tareas (leer en voz alta, una a la vez)

| # | Tarea | Éxito si… | Tiempo meta |
|---|---|---|---|
| 1 | "Anote que la señora Elba almorzó bien hoy." | Registro creado con tipo Alimentación | 1 min |
| 2 | "Dicte que le dio la pastilla de la presión." (si el teléfono permite dictar) | Registro con "Por voz" | 1 min |
| 3 | "Se equivocó en un registro suyo: corríjalo." | Registro "Editada" con motivo | 2 min |
| 4 | "¿Quién está de turno ahora y qué se anotó en su turno?" | Lo dice en voz alta | 1 min |
| 5 | "Marque como tomada la próxima dosis." | Dosis registrada | 1 min |
| 6 | "Pregúntele a la app cómo ha dormido esta semana y diga en qué registros se basó." | Abre "Basado en N registros" | 2 min |
| 7 | "Prepare un resumen del último mes para llevar al médico." | Abre la vista para imprimir | 2 min |
| 8 | "Active el modo avión y anote algo. Luego desactívelo." | Ve "Pendiente" y luego el registro enviado | 2 min |

Por tarea anotar: **éxito / éxito con ayuda / no logrado**, tiempo, errores
y frases textuales ("no sé dónde…").

## Cuestionario SUS

Marque de 1 (**muy en desacuerdo**) a 5 (**muy de acuerdo**):

| # | Afirmación | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| 1 | Creo que me gustaría usar esta aplicación con frecuencia. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 2 | Encontré la aplicación innecesariamente compleja. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 3 | Pensé que la aplicación era fácil de usar. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 4 | Creo que necesitaría ayuda de una persona con conocimientos técnicos para usar esta aplicación. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 5 | Las distintas funciones de la aplicación están bien integradas. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 6 | Pensé que había demasiada inconsistencia en la aplicación. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 7 | Imagino que la mayoría de las personas aprendería a usar esta aplicación muy rápido. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 8 | Encontré la aplicación muy difícil de usar. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 9 | Me sentí con confianza al usar la aplicación. | ☐ | ☐ | ☐ | ☐ | ☐ |
| 10 | Necesité aprender muchas cosas antes de poder usar la aplicación. | ☐ | ☐ | ☐ | ☐ | ☐ |

Pregunta de utilidad (para la meta de la EDT):

| | Afirmación | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|---|
| U | Esta aplicación me sería útil para coordinar el cuidado con mi familia. | ☐ | ☐ | ☐ | ☐ | ☐ |

Preguntas abiertas: ¿Qué fue lo más útil? ¿Qué le costó más? ¿Qué le
falta para usarla de verdad?

## Cómo calcular

- **Puntaje SUS por persona:** a las preguntas impares réstales 1; a las
  pares, réstalas de 5; suma todo y multiplica por 2,5. Resultado de 0 a 100.
  Ejemplo: respuestas 4,2,4,1,4,2,5,1,4,2 → (3+3+3+4+3+3+4+4+3+3) × 2,5 = 82,5.
- **Referencia:** 68 es el promedio de la industria; sobre 80 es muy bueno.
- **Meta EDT ">85% utilidad":** proponemos medirla como el **porcentaje de
  participantes que responde 4 o 5 en la pregunta U**. Si el equipo la
  definió como puntaje SUS ≥ 85, reportar ambos.
- **Tasa de éxito por tarea** = tareas logradas sin ayuda / total.

## Plantilla de resultados

| Participante | Edad | SUS | U (1-5) | Tareas sin ayuda (de 8) | Comentario clave |
|---|---|---|---|---|---|
| P1 | | | | | |
| P2 | | | | | |
| … | | | | | |
| **Promedio / %** | | | **% con 4-5:** | | |

Con los hallazgos, priorizar arreglos: lo que impidió completar una tarea
primero; lo que solo demoró, después.
