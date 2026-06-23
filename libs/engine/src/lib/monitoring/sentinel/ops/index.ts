import { registerOperations } from "./registry.js";
import { d1WriteOps, d1ReadOps } from "./d1-ops.js";
import { kvGetOps, kvPutOps } from "./kv-ops.js";
import { r2UploadOps, r2DownloadOps } from "./r2-ops.js";
import { authFlowOps, postCrudOps, mediaOps } from "./domain-ops.js";

registerOperations("d1_writes", d1WriteOps);
registerOperations("d1_reads", d1ReadOps);
registerOperations("kv_get", kvGetOps);
registerOperations("kv_put", kvPutOps);
registerOperations("r2_upload", r2UploadOps);
registerOperations("r2_download", r2DownloadOps);
registerOperations("auth_flows", authFlowOps);
registerOperations("post_crud", postCrudOps);
registerOperations("media_ops", mediaOps);

export type { OperationFn } from "./registry.js";
export { getOperation, executeOperation } from "./registry.js";
export { cleanupSentinelData } from "./cleanup.js";
