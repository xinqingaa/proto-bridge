import type { PreviewExtension } from "@/workbench/preview/extensions/model";

// Business content stays in the prototype. Ordinary DS props/theme values do not
// register parallel resources; genuine DS extensions belong to their base page.
export default [] satisfies PreviewExtension[];
