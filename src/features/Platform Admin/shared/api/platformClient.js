import { API_BASE_URL, API_PREFIX } from "@/shared/constants";
import { executePlatformRequest } from "./platformHttp.js";
import { platformAuth } from "./platformSession.js";

/**
 * Platform registration calls go through this client.
 * The hospital api client logs the hospital session out on 401/403, so it is not used here.
 */
export function platformApi(endpoint, options = {}) {
  return executePlatformRequest(endpoint, options, {
    origin: `${API_BASE_URL}${API_PREFIX}`,
    auth: platformAuth,
    fetchImpl: globalThis.fetch.bind(globalThis),
  });
}
