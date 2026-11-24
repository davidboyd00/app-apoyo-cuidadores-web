import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { api, type Schemas } from "../lib/api";

// --- Consentimiento (Ley 21.719) ---------------------------------------------

export function useConsent() {
  return useQuery({
    queryKey: ["me", "consent"],
    queryFn: () => api.get<Schemas["ConsentStatus"]>("/me/consent"),
  });
}

export function useAcceptConsent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (version: string) =>
      api.post<Schemas["ConsentStatus"]>("/me/consent", { version }),
    onSuccess: (data) => {
      qc.setQueryData(["me", "consent"], data);
    },
  });
}

// --- Perfil ------------------------------------------------------------------

export function useProfile() {
  return useQuery({
    queryKey: ["me", "profile"],
    queryFn: () => api.get<Schemas["Profile"]>("/me/profile"),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Schemas["ProfileUpdate"]) =>
      api.put<Schemas["Profile"]>("/me/profile", payload),
    onSuccess: (data) => qc.setQueryData(["me", "profile"], data),
  });
}

// --- Pacientes ---------------------------------------------------------------

export function usePatients() {
  return useQuery({
    queryKey: ["patients"],
    queryFn: () => api.get<Schemas["Patient"][]>("/patients"),
  });
}

export function usePatient(id: string | undefined) {
  return useQuery({
    enabled: !!id,
    queryKey: ["patients", id],
    queryFn: () => api.get<Schemas["Patient"]>(`/patients/${id}`),
  });
}

export function useCreatePatient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Schemas["PatientCreate"]) =>
      api.post<Schemas["Patient"]>("/patients", payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients"] });
    },
  });
}

// --- Bitácora ---------------------------------------------------------------

type EntryKind = Schemas["Entry"]["kind"];

// Query string del feed. `kind` y `antes` se filtran en el servidor.
function urlEntradas(
  patientId: string | undefined,
  params: { limit: number; kind?: EntryKind; antes?: string }
) {
  const qs = new URLSearchParams({ limit: String(params.limit) });
  if (params.kind) qs.set("kind", params.kind);
  if (params.antes) qs.set("antes", params.antes);
  return `/patients/${patientId}/entries?${qs}`;
}

export function usePatientEntries(
  patientId: string | undefined,
  options: { kind?: EntryKind; limit?: number } = {}
) {
  const { kind, limit = 50 } = options;
  return useQuery({
    enabled: !!patientId,
    queryKey: ["patients", patientId, "entries", { kind, limit }],
    queryFn: () => api.get<Schemas["Entry"][]>(urlEntradas(patientId, { limit, kind })),
  });
}

const PAGINA_BITACORA = 30;

/**
 * Feed paginado con "Ver más": cada página pide las entradas anteriores a
 * la última recibida (`antes`). La key cuelga de "entries", así crear,
 * editar, borrar y el realtime la siguen invalidando.
 */
export function useBitacora(patientId: string | undefined, kind?: EntryKind) {
  return useInfiniteQuery({
    enabled: !!patientId,
    queryKey: ["patients", patientId, "entries", "feed", { kind }],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.get<Schemas["Entry"][]>(
        urlEntradas(patientId, { limit: PAGINA_BITACORA, kind, antes: pageParam })
      ),
    // Página incompleta = no hay más; si no, el cursor es la última fecha.
    getNextPageParam: (ultima) =>
      ultima.length < PAGINA_BITACORA ? undefined : ultima[ultima.length - 1].occurred_at,
  });
}

// Historial inmutable: nunca se edita ni se borra la fila. Editar agrega una
// revisión (con motivo) y "borrar" es una anulación terminal (con motivo). La
// bitácora vigente oculta las anuladas. RLS decide quién puede; si bloquea, el
// backend responde con un `detail` en español que mostramos tal cual.
export function useRevisarEntry(patientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      entryId,
      cambios,
    }: {
      entryId: string;
      cambios: Schemas["EntryRevisionEditar"];
    }) =>
      api.post<Schemas["Entry"]>(
        `/patients/${patientId}/entries/${entryId}/revisiones`,
        cambios
      ),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["patients", patientId, "entries"] });
    },
  });
}

export function useAnularEntry(patientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ entryId, motivo }: { entryId: string; motivo: string }) =>
      api.post<Schemas["Entry"]>(
        `/patients/${patientId}/entries/${entryId}/anulacion`,
        { motivo }
      ),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["patients", patientId, "entries"] });
    },
  });
}

// KPI de relevo familiar (autores distintos en los últimos 7 días). La key
// cuelga de "entries" a propósito: crear/editar/borrar entradas y el
// realtime ya invalidan ese prefijo, así el badge se actualiza solo.
export function useRelevo(patientId: string | undefined) {
  return useQuery({
    enabled: !!patientId,
    queryKey: ["patients", patientId, "entries", "metrics", "relevo"],
    queryFn: () =>
      api.get<Schemas["RelevoMetric"]>(`/patients/${patientId}/metrics/relevo`),
  });
}

// --- Red de cuidado ---------------------------------------------------------

export function useMembers(patientId: string | undefined) {
  return useQuery({
    enabled: !!patientId,
    queryKey: ["patients", patientId, "members"],
    queryFn: () =>
      api.get<Schemas["CareMember"][]>(`/patients/${patientId}/members`),
  });
}

export function useInviteMember(patientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Schemas["MemberInvite"]) =>
      api.post<Schemas["CareMember"]>(
        `/patients/${patientId}/members`,
        payload
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients", patientId, "members"] });
    },
  });
}

export function useRemoveMember(patientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: string) =>
      api.delete<void>(`/patients/${patientId}/members/${userId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients", patientId, "members"] });
    },
  });
}

// --- Historial de una entrada (original + correcciones) ----------------------

export function useHistorialEntrada(patientId: string | undefined, entryId: string, activo: boolean) {
  return useQuery({
    enabled: !!patientId && activo,
    queryKey: ["patients", patientId, "entries", "historial", entryId],
    queryFn: () =>
      api.get<Schemas["EntryHistorial"]>(`/patients/${patientId}/entries/${entryId}/historial`),
  });
}

/** Entradas vigentes desde `desde` (hasta 200). Para el resumen de un turno
 * y para mostrar las entradas que citó el asistente. */
export function useEntradasDesde(patientId: string | undefined, desde: string | undefined) {
  return useQuery({
    enabled: !!patientId && !!desde,
    queryKey: ["patients", patientId, "entries", "desde", desde],
    queryFn: () => {
      const qs = new URLSearchParams({ limit: "200", desde: desde ?? "" });
      return api.get<Schemas["Entry"][]>(`/patients/${patientId}/entries?${qs}`);
    },
  });
}

// --- Turnos de cuidado (relevo) ----------------------------------------------

export function useTurnos(patientId: string | undefined) {
  return useQuery({
    enabled: !!patientId,
    queryKey: ["patients", patientId, "turnos"],
    queryFn: () => api.get<Schemas["Turno"][]>(`/patients/${patientId}/turnos`),
    refetchInterval: 60_000, // "de turno ahora" cambia con la hora
  });
}

export function useCrearTurno(patientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Schemas["TurnoCreate"]) =>
      api.post<Schemas["Turno"]>(`/patients/${patientId}/turnos`, payload),
    onSettled: () => qc.invalidateQueries({ queryKey: ["patients", patientId, "turnos"] }),
  });
}

export function useEliminarTurno(patientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (turnoId: string) => api.delete<void>(`/patients/${patientId}/turnos/${turnoId}`),
    onSettled: () => qc.invalidateQueries({ queryKey: ["patients", patientId, "turnos"] }),
  });
}

// --- Medicamentos y dosis ----------------------------------------------------

export function useMedicamentos(patientId: string | undefined) {
  return useQuery({
    enabled: !!patientId,
    queryKey: ["patients", patientId, "medications"],
    queryFn: () => api.get<Schemas["Medication"][]>(`/patients/${patientId}/medications`),
  });
}

export function useCrearMedicamento(patientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Schemas["MedicationCreate"]) =>
      api.post<Schemas["Medication"]>(`/patients/${patientId}/medications`, payload),
    onSettled: () => qc.invalidateQueries({ queryKey: ["patients", patientId, "medications"] }),
  });
}

export function useDesactivarMedicamento(patientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (medicationId: string) =>
      api.post<Schemas["Medication"]>(
        `/patients/${patientId}/medications/${medicationId}/desactivar`
      ),
    onSettled: () => qc.invalidateQueries({ queryKey: ["patients", patientId, "medications"] }),
  });
}

export function useProximasDosis(patientId: string | undefined, horas = 24) {
  return useQuery({
    enabled: !!patientId,
    queryKey: ["patients", patientId, "medications", "upcoming", horas],
    queryFn: () =>
      api.get<Schemas["UpcomingDose"][]>(
        `/patients/${patientId}/medications/upcoming?within_hours=${horas}`
      ),
    refetchInterval: 5 * 60_000,
  });
}

export function useAdherencia(patientId: string | undefined, dias = 7) {
  return useQuery({
    enabled: !!patientId,
    queryKey: ["patients", patientId, "medications", "adherence", dias],
    queryFn: () => {
      const hasta = new Date();
      const desde = new Date(hasta.getTime() - dias * 86_400_000);
      const qs = new URLSearchParams({ desde: desde.toISOString(), hasta: hasta.toISOString() });
      return api.get<Schemas["AdherenceReport"]>(
        `/patients/${patientId}/medications/adherence?${qs}`
      );
    },
  });
}

/** Dosis ya registradas de un medicamento (para marcar las de hoy). */
export function useDosisRegistradas(patientId: string | undefined, medicationId: string) {
  return useQuery({
    enabled: !!patientId,
    queryKey: ["patients", patientId, "medications", medicationId, "doses"],
    queryFn: () =>
      api.get<Schemas["MedicationDose"][]>(
        `/patients/${patientId}/medications/${medicationId}/doses`
      ),
  });
}

// --- Asistente IA -------------------------------------------------------------

export function useMensajesAsistente(patientId: string | undefined) {
  return useQuery({
    enabled: !!patientId,
    queryKey: ["patients", patientId, "assistant", "messages"],
    queryFn: () =>
      api.get<Schemas["AssistantMessage"][]>(`/patients/${patientId}/assistant/messages?limit=20`),
  });
}

export function usePreguntar(patientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Schemas["AssistantQuery"]) =>
      api.post<Schemas["AssistantAnswer"]>(`/patients/${patientId}/assistant/ask`, payload),
    onSettled: () => qc.invalidateQueries({ queryKey: ["patients", patientId, "assistant"] }),
  });
}

export function useMetricaAsistente(patientId: string | undefined) {
  return useQuery({
    enabled: !!patientId,
    queryKey: ["patients", patientId, "assistant", "metrica"],
    queryFn: () =>
      api.get<Schemas["AsistenteMetric"]>(`/patients/${patientId}/metrics/asistente`),
  });
}

// --- Resúmenes médicos ----------------------------------------------------------

export function useResumenes(patientId: string | undefined) {
  return useQuery({
    enabled: !!patientId,
    queryKey: ["patients", patientId, "summaries"],
    queryFn: () => api.get<Schemas["Summary"][]>(`/patients/${patientId}/summaries`),
    // Mientras alguno se está generando, se consulta cada 3 s (respaldo de Realtime).
    refetchInterval: (q) =>
      q.state.data?.some((r) => r.estado === "generando") ? 3000 : false,
  });
}

export function useResumen(patientId: string | undefined, summaryId: string | undefined) {
  return useQuery({
    enabled: !!patientId && !!summaryId,
    queryKey: ["patients", patientId, "summaries", summaryId],
    queryFn: () => api.get<Schemas["Summary"]>(`/patients/${patientId}/summaries/${summaryId}`),
    refetchInterval: (q) => (q.state.data?.estado === "generando" ? 3000 : false),
  });
}

export function useGenerarResumen(patientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dias, forzar }: { dias: number; forzar?: boolean }) =>
      api.post<Schemas["Summary"]>(
        `/patients/${patientId}/summaries?dias=${dias}${forzar ? "&forzar=true" : ""}`
      ),
    onSettled: () => qc.invalidateQueries({ queryKey: ["patients", patientId, "summaries"] }),
  });
}

// --- Centros y farmacias ----------------------------------------------------------

// Son miles: región, tipo y texto (nombre, comuna o dirección) se filtran en
// el servidor. `limite` acota lo que se muestra.
export function useCentros(filtros: { region?: string; tipo?: string; q?: string }, limite = 100) {
  return useQuery({
    queryKey: ["centers", filtros, limite],
    queryFn: () => {
      const qs = new URLSearchParams({ limit: String(limite) });
      if (filtros.region) qs.set("region", filtros.region);
      if (filtros.tipo) qs.set("tipo", filtros.tipo);
      if (filtros.q) qs.set("q", filtros.q);
      return api.get<Schemas["Center"][]>(`/centers?${qs}`);
    },
    staleTime: 60 * 60_000,
    placeholderData: (anterior) => anterior,
  });
}

// --- Derechos ARCO (Ley 21.719) -----------------------------------------------------

export function useExportarDatos() {
  return useMutation({
    mutationFn: () => api.get<Schemas["DataExport"]>("/me/data-export"),
  });
}

export function useEliminarCuenta() {
  return useMutation({
    mutationFn: () => api.delete<void>("/me?confirmar=true"),
  });
}
