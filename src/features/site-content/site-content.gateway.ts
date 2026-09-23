import type { ContentGateway } from "./site-content.types";
import { staticGateway } from "./static-gateway";

// The one place that chooses where public content comes from. Only the static
// adapter exists for now.
export function getContentGateway(): ContentGateway {
  return staticGateway;
}
