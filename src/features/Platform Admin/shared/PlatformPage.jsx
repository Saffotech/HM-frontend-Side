import { Suspense } from "react";

/** Suspense boundary for one platform route. Keeps the shell mounted while a page chunk loads. */
export default function PlatformPage({ children }) {
  return (
    <Suspense fallback={<p className="panel-copy" role="status">Loading…</p>}>
      {children}
    </Suspense>
  );
}
