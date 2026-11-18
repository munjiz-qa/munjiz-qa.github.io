package qa.munjiz.basiracaller;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/** البحث عن رقم في خادم بصيرة كولر، مع قائمة محلية للأرقام المزعجة تعمل دون إنترنت. */
final class Lookup {
    static final class Result {
        String e164, name, category; int score, reports; boolean verified, unknown = true;
    }

    static String normalize(String raw) {
        if (raw == null) return null;
        StringBuilder b = new StringBuilder();
        for (char c : raw.toCharArray()) {
            if (c >= '٠' && c <= '٩') b.append((char) ('0' + (c - '٠')));
            else if ((c >= '0' && c <= '9') || c == '+') b.append(c);
        }
        String d = b.toString();
        if (d.startsWith("00")) d = "+" + d.substring(2);
        if (!d.startsWith("+")) {
            d = d.replace("+", "");
            if (d.length() == 8) d = "+974" + d; else d = "+" + d;
        }
        return d.matches("^\\+[1-9][0-9]{6,14}$") ? d : null;
    }

    /** العرض الموحّد للأرقام القطرية: +974 5555 1234 */
    static String format(String e164) {
        if (e164 == null) return "";
        if (e164.startsWith("+974") && e164.length() == 12) return "+974 " + e164.substring(4, 8) + " " + e164.substring(8);
        return e164;
    }

    private static String post(String fn, JSONObject body, int timeoutMs) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(Config.URL + "/rest/v1/rpc/" + fn).openConnection();
        c.setConnectTimeout(timeoutMs); c.setReadTimeout(timeoutMs);
        c.setRequestMethod("POST"); c.setDoOutput(true);
        c.setRequestProperty("Content-Type", "application/json");
        c.setRequestProperty("apikey", Config.KEY);
        c.setRequestProperty("Authorization", "Bearer " + Config.KEY);
        try (OutputStream o = c.getOutputStream()) { o.write(body.toString().getBytes(StandardCharsets.UTF_8)); }
        int code = c.getResponseCode();
        InputStream in = code < 400 ? c.getInputStream() : c.getErrorStream();
        ByteArrayOutputStream bo = new ByteArrayOutputStream(); byte[] buf = new byte[4096]; int n;
        while (in != null && (n = in.read(buf)) > 0) bo.write(buf, 0, n);
        if (code >= 400) throw new Exception("HTTP " + code);
        return bo.toString("UTF-8");
    }

    static Result online(String number, int timeoutMs) throws Exception {
        JSONObject a = new JSONObject(); a.put("p_number", number); a.put("p_count", true);
        JSONObject j = new JSONObject(post("bc_lookup", a, timeoutMs));
        Result r = new Result();
        r.e164 = j.optString("e164", number);
        r.name = j.isNull("name") ? null : j.optString("name", null);
        r.category = j.optString("category", "personal");
        r.score = j.optInt("spam_score", 0);
        r.reports = j.optInt("reports", 0);
        r.verified = j.optBoolean("verified", false);
        r.unknown = j.optBoolean("unknown", false);
        return r;
    }

    static Result offline(Context ctx, String e164) {
        try {
            JSONArray arr = new JSONArray(prefs(ctx).getString("spam", "[]"));
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.getJSONObject(i);
                if (e164.equals(o.optString("e164"))) {
                    Result r = new Result(); r.e164 = e164; r.unknown = false;
                    r.name = o.isNull("name") ? null : o.optString("name", null);
                    r.category = o.optString("category"); r.score = o.optInt("score");
                    return r;
                }
            }
        } catch (Exception ignored) {}
        return null;
    }

    /** يحدّث قائمة الأرقام المزعجة المخزّنة على الهاتف. */
    static int syncSpamList(Context ctx) throws Exception {
        JSONObject a = new JSONObject(); a.put("p_min", 30);
        String s = post("bc_spam_list", a, 15000);
        JSONArray arr = new JSONArray(s);
        prefs(ctx).edit().putString("spam", s).putLong("synced", System.currentTimeMillis()).apply();
        return arr.length();
    }

    static SharedPreferences prefs(Context ctx) { return ctx.getSharedPreferences("bc", Context.MODE_PRIVATE); }

    static String label(Result r) {
        if (r.score >= 60) return "خطر مرتفع";
        if (r.score >= 30) return "يُنصح بالحذر";
        return r.unknown ? "رقم غير معروف" : "لا توجد مؤشرات خطر";
    }

    static String category(String c) {
        if (c == null) return "";
        switch (c) {
            case "business": return "منشأة تجارية";
            case "government": return "جهة حكومية";
            case "spam": return "مزعج";
            case "fraud": return "احتيال محتمل";
            case "telemarketing": return "تسويق هاتفي";
            case "robocall": return "اتصال آلي";
            default: return "شخصي";
        }
    }
}
