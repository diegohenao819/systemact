import { createClient } from "@/lib/supabase/server";
import { type EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const redirectTo = request.nextUrl.clone();

  redirectTo.pathname = next;
  redirectTo.searchParams.delete("token_hash");
  redirectTo.searchParams.delete("type");
  redirectTo.searchParams.delete("code");
  redirectTo.searchParams.delete("next");

  const errorRedirect = request.nextUrl.clone();
  errorRedirect.pathname = "/auth/error";

  try {
    const supabase = await createClient();

    if (token_hash && type) {
      const { error } = await supabase.auth.verifyOtp({
        type,
        token_hash,
      });

      if (!error) {
        return NextResponse.redirect(redirectTo);
      }

      errorRedirect.searchParams.set("error", error.message);
      return NextResponse.redirect(errorRedirect);
    }

    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (!error) {
        return NextResponse.redirect(redirectTo);
      }

      errorRedirect.searchParams.set("error", error.message);
      return NextResponse.redirect(errorRedirect);
    }

    errorRedirect.searchParams.set("error", "No token hash, type o code");
    return NextResponse.redirect(errorRedirect);
  } catch (error) {
    errorRedirect.searchParams.set(
      "error",
      error instanceof Error ? error.message : "Error al confirmar la cuenta",
    );
    return NextResponse.redirect(errorRedirect);
  }
}
