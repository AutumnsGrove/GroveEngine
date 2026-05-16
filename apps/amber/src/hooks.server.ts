import { pulseHandle, createPulseErrorHook } from "@autumnsgrove/lattice/pulse";

export const handle = pulseHandle({ app: "amber" });
export const handleError = createPulseErrorHook({ app: "amber" });
