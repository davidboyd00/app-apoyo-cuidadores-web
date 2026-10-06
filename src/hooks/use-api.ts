import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

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

export function usePatientEntries(
  patientId: string | undefined,
  options: { kind?: EntryKind; limit?: number } = {}
) {
  const { kind, limit = 50 } = options;
  return useQuery({
    enabled: !!patientId,
    queryKey: ["patients", patientId, "entries", { kind, limit }],
    queryFn: async () => {
      const data = await api.get<Schemas["Entry"][]>(
        `/patients/${patientId}/entries?limit=${limit}`
      );
      return kind ? data.filter((e) => e.kind === kind) : data;
    },
  });
}

export function useCreateEntry(patientId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Schemas["EntryCreate"]) =>
      api.post<Schemas["Entry"]>(`/patients/${patientId}/entries`, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["patients", patientId, "entries"] });
    },
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
