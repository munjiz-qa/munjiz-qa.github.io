package qa.munjiz.basiracaller;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.net.Uri;
import android.telecom.Call;
import android.telecom.CallScreeningService;

/**
 * يستقبله النظام لحظة وصول مكالمة من رقم غير محفوظ: يبحث عن الرقم خلال ثوانٍ،
 * ثم يعرض اسم المتصل ومؤشر الخطر في إشعار فوري، ويرفض مكالمات الخطر المرتفع إن فعّل المستخدم ذلك.
 */
public class CallerService extends CallScreeningService {
    static final String CH = "bc_caller";

    @Override
    public void onScreenCall(Call.Details details) {
        if (details.getCallDirection() != Call.Details.DIRECTION_INCOMING || details.getHandle() == null) {
            respondToCall(details, new CallResponse.Builder().build());
            return;
        }
        final String e164 = Lookup.normalize(details.getHandle().getSchemeSpecificPart());
        new Thread(() -> {
            Lookup.Result r = null;
            if (e164 != null) {
                try { r = Lookup.online(e164, 3500); } catch (Exception ex) { r = Lookup.offline(this, e164); }
            }
            boolean block = r != null && r.score >= 70 && Lookup.prefs(this).getBoolean("autoBlock", false);
            CallResponse.Builder b = new CallResponse.Builder();
            if (block) b.setDisallowCall(true).setRejectCall(true).setSkipCallLog(false).setSkipNotification(false);
            respondToCall(details, b.build());
            if (r != null && (!r.unknown || r.score > 0)) notifyCaller(r, block);
        }).start();
    }

    private void notifyCaller(Lookup.Result r, boolean blocked) {
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm.getNotificationChannel(CH) == null) {
            NotificationChannel ch = new NotificationChannel(CH, "اسم المتصل", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("يعرض اسم المتصل ومؤشر الخطر لحظة الرنين");
            nm.createNotificationChannel(ch);
        }
        String title = (r.name != null ? r.name : "رقم مُبلَّغ عنه") + (r.verified ? " ✓" : "");
        String text = Lookup.format(r.e164) + " · " + Lookup.label(r) + " · مؤشر " + r.score
                + (r.reports > 0 ? " · " + r.reports + " بلاغ" : "");
        if (blocked) title = "رُفضت مكالمة احتيال: " + title;
        Intent open = new Intent(Intent.ACTION_VIEW, Uri.parse(Config.SITE + "?n=" + Uri.encode(r.e164) + "#search"));
        PendingIntent pi = PendingIntent.getActivity(this, r.e164.hashCode(), open, PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder nb = new Notification.Builder(this, CH)
                .setSmallIcon(R.drawable.ic_fg)
                .setColor(r.score >= 60 ? 0xFFD93C48 : 0xFF3A1C8C)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(new Notification.BigTextStyle().bigText(text))
                .setCategory(Notification.CATEGORY_CALL)
                .setContentIntent(pi)
                .setAutoCancel(true);
        if (!blocked) nb.setTimeoutAfter(60000);
        Notification n = nb.build();
        try { nm.notify(r.e164.hashCode(), n); } catch (SecurityException ignored) {}
    }
}
