import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { NewGiftView } from "./new-gift-view";

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <NewGiftView />
    </Suspense>
  );
}
