// منجز · تصدير CSV لسجل الطلاب إلى Google Sheets عبر IMPORTDATA
// يُستدعى بالشكل: /functions/v1/mjs-sheet?token=<رمز المزامنة من لوحة الإدارة>
Deno.serve(async (req: Request) => {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_ANON_KEY")!;
  const r = await fetch(`${url}/rest/v1/rpc/mjs_export_csv`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_token: token }),
  });
  if (!r.ok) return new Response("رابط غير صالح", { status: 403, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  const csv: string = await r.json();
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "no-store" },
  });
});
