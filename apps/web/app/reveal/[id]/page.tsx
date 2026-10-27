import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { RevealView } from "./reveal-view";

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <RevealView />
    </Suspense>
  );
}
