import { sequence } from "@sveltejs/kit/hooks";
import {
	pulseHandle,
	createPulseFlushHook,
	createPulseErrorHook,
} from "@autumnsgrove/lattice/pulse";

export const handle = sequence(pulseHandle({ app: "amber" }), createPulseFlushHook());
export const handleError = createPulseErrorHook({ app: "amber" });
