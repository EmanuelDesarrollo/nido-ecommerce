import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { CluesView } from "./clues-view";

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <CluesView />
    </Suspense>
  );
}
