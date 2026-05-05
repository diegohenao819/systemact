import { updateSession } from "@/lib/supabase/proxy";
import { type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/* (static files, image optimization, HMR and internals)
     * - favicon.ico, robots.txt, sitemap.xml (public metadata files)
     * - google*.html (Google Search Console verification files)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/|favicon.ico|robots.txt|sitemap.xml|google.*\\.html$|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
