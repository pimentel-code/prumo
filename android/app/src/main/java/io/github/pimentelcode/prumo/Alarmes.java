package io.github.pimentelcode.prumo;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** Agenda os alarmes do Prumo no despertador do Android e lembra deles
 *  (para reagendar depois de reiniciar o celular). */
public final class Alarmes {
    private static final String PREFS = "prumo_alarmes", CHAVE = "lista";

    private Alarmes() {}

    static JSONArray ler(Context c) {
        try { return new JSONArray(c.getSharedPreferences(PREFS, 0).getString(CHAVE, "[]")); }
        catch (JSONException e) { return new JSONArray(); }
    }

    private static void gravar(Context c, JSONArray a) {
        c.getSharedPreferences(PREFS, 0).edit().putString(CHAVE, a.toString()).apply();
    }

    private static PendingIntent disparo(Context c, JSONObject a) {
        Intent i = new Intent(c, AlarmeReceiver.class)
            .setAction(AlarmeReceiver.TOCAR)
            .putExtra("id", a.optInt("id"))
            .putExtra("titulo", a.optString("titulo", "Alarme"))
            .putExtra("texto", a.optString("texto", ""))
            .putExtra("at", a.optLong("at"));
        return PendingIntent.getBroadcast(c, a.optInt("id"), i,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void agendar(Context c, JSONObject a) {
        long at = a.optLong("at");
        if (at <= System.currentTimeMillis()) return;
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        PendingIntent abrir = PendingIntent.getActivity(c, 0, new Intent(c, MainActivity.class),
            PendingIntent.FLAG_IMMUTABLE);
        try {
            // setAlarmClock = prioridade de despertador: fura a economia de bateria
            // e mostra o reloginho na barra do celular.
            am.setAlarmClock(new AlarmManager.AlarmClockInfo(at, abrir), disparo(c, a));
        } catch (SecurityException e) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, disparo(c, a));
        }
    }

    private static void cancelar(Context c, JSONObject a) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        am.cancel(disparo(c, a));
    }

    /** Troca a lista inteira pelos alarmes que o app mandou. Adiamentos ("soneca") ficam. */
    static synchronized void definir(Context c, JSONArray novos) {
        long agora = System.currentTimeMillis();
        JSONArray velhos = ler(c), lista = new JSONArray();
        for (int i = 0; i < velhos.length(); i++) {
            JSONObject v = velhos.optJSONObject(i);
            if (v == null) continue;
            if (v.optBoolean("adiado") && v.optLong("at") > agora) lista.put(v);
            else cancelar(c, v);
        }
        for (int i = 0; i < novos.length(); i++) {
            JSONObject n = novos.optJSONObject(i);
            if (n == null || n.optLong("at") <= agora) continue;
            agendar(c, n);
            lista.put(n);
        }
        gravar(c, lista);
    }

    /** Soneca: o mesmo alarme de novo daqui a pouco. */
    static synchronized void adiar(Context c, int idOriginal, String titulo, String texto, long at) {
        int id = (idOriginal & 0x3fffffff) | 0x40000000;
        JSONArray velhos = ler(c), lista = new JSONArray();
        for (int i = 0; i < velhos.length(); i++) {
            JSONObject v = velhos.optJSONObject(i);
            if (v != null && v.optInt("id") != id) lista.put(v);
        }
        try {
            JSONObject a = new JSONObject().put("id", id).put("at", at)
                .put("titulo", titulo).put("texto", texto).put("adiado", true);
            agendar(c, a);
            lista.put(a);
        } catch (JSONException ignorado) {}
        gravar(c, lista);
    }

    static synchronized void disparou(Context c, int id) {
        JSONArray velhos = ler(c), lista = new JSONArray();
        for (int i = 0; i < velhos.length(); i++) {
            JSONObject v = velhos.optJSONObject(i);
            if (v != null && v.optInt("id") != id) lista.put(v);
        }
        gravar(c, lista);
    }

    /** Depois de reiniciar o celular o Android esquece os alarmes: põe de volta. */
    static synchronized void reagendarSalvos(Context c) {
        long agora = System.currentTimeMillis();
        JSONArray velhos = ler(c), lista = new JSONArray();
        for (int i = 0; i < velhos.length(); i++) {
            JSONObject v = velhos.optJSONObject(i);
            if (v == null || v.optLong("at") <= agora) continue;
            agendar(c, v);
            lista.put(v);
        }
        gravar(c, lista);
    }
}
