import { Suspense } from "react";
import { Spinner } from "@/components/ui";
import { HomeView } from "./home-view";

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <HomeView />
    </Suspense>
  );
}
