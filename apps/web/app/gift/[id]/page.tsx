import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { GiftView } from "./gift-view";

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <GiftView />
    </Suspense>
  );
}
