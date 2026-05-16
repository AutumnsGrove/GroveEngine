import { pulseHandle, createPulseErrorHook } from "@autumnsgrove/lattice/pulse";

export const handle = pulseHandle({ app: "clearing" });
export const handleError = createPulseErrorHook({ app: "clearing" });
