import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Suspense } from "react";

async function RootRedirect() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    redirect("/inicio");
  } else {
    redirect("/auth/login");
  }
   return null; 
}

export default function RootPage() {
  return (
    <Suspense>
      <RootRedirect />
    </Suspense>
  );
}
