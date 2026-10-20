import { KIND_LABELS, type Kind } from "../utils/bitacora";

/** Chip de tipo de entrada; el color sale de --kind-<tipo>-bg/fg. */
export function KindChip({ kind }: { kind: Kind }) {
  return (
    <span className="kind-chip" data-kind={kind}>
      {KIND_LABELS[kind]}
    </span>
  );
}
