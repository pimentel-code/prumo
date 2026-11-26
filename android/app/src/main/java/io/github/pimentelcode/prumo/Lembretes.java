package io.github.pimentelcode.prumo;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/** Lembrete que se repete ("a cada 20 minutos"), com notificação própria do Prumo.
 *
 *  Por que não pelo plugin de notificações (25/11/2026, pedido dele): cada aviso da série
 *  virava uma notificação nova e elas se ACUMULAVAM na barra. Aqui:
 *   - todos os avisos da série usam o MESMO número de notificação → o novo SUBSTITUI o
 *     anterior (nunca há mais de um na barra);
 *   - cada um SOME sozinho depois de "sumir" ms (metade do intervalo: a cada 10 min,
 *     some em 5 min);
 *   - "Parar" e "Feito" funcionam sem abrir o app: cancelam o resto da série aqui mesmo e
 *     deixam o pedido guardado para o app aplicar quando abrir (acoesLembrete). */
public final class Lembretes {
    static final String CANAL = "avisos";
    private static final String PREFS = "prumo_lembretes", CHAVE = "lista", CHAVE_ACOES = "acoes";

    private Lembretes() {}

    static JSONArray ler(Context c, String chave) {
        try { return new JSONArray(c.getSharedPreferences(PREFS, 0).getString(chave, "[]")); }
        catch (JSONException e) { return new JSONArray(); }
    }

    private static void gravar(Context c, String chave, JSONArray a) {
        c.getSharedPreferences(PREFS, 0).edit().putString(chave, a.toString()).apply();
    }

    private static PendingIntent disparo(Context c, JSONObject a) {
        Intent i = new Intent(c, LembreteReceiver.class)
            .setAction(LembreteReceiver.LEMBRAR)
            .putExtra("id", a.optInt("id"))
            .putExtra("serie", a.optInt("serie"))
            .putExtra("item", a.optString("item", ""))
            .putExtra("titulo", a.optString("titulo", "Lembrete"))
            .putExtra("sumir", a.optLong("sumir", 0));
        return PendingIntent.getBroadcast(c, a.optInt("id"), i,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private static void agendar(Context c, JSONObject a) {
        long at = a.optLong("at");
        if (at <= System.currentTimeMillis()) return;
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        try {
            // Exato (USE_EXACT_ALARM já está no manifesto): "a cada 10 min" precisa ser a cada 10 min.
            am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, disparo(c, a));
        } catch (SecurityException e) {
            am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, disparo(c, a));
        }
    }

    private static void cancelar(Context c, JSONObject a) {
        AlarmManager am = (AlarmManager) c.getSystemService(Context.ALARM_SERVICE);
        am.cancel(disparo(c, a));
    }

    /** Item com "Parar"/"Feito" ainda não visto pelo app: não reagenda a série dele. */
    private static boolean temAcaoPendente(Context c, String item) {
        JSONArray acoes = ler(c, CHAVE_ACOES);
        for (int i = 0; i < acoes.length(); i++) {
            JSONObject a = acoes.optJSONObject(i);
            if (a != null && item.equals(a.optString("item"))) return true;
        }
        return false;
    }

    /** Troca a lista inteira pelos lembretes que o app mandou. */
    static synchronized void definir(Context c, JSONArray novos) {
        long agora = System.currentTimeMillis();
        JSONArray velhos = ler(c, CHAVE), lista = new JSONArray();
        for (int i = 0; i < velhos.length(); i++) {
            JSONObject v = velhos.optJSONObject(i);
            if (v != null) cancelar(c, v);
        }
        for (int i = 0; i < novos.length(); i++) {
            JSONObject n = novos.optJSONObject(i);
            if (n == null || n.optLong("at") <= agora || temAcaoPendente(c, n.optString("item"))) continue;
            agendar(c, n);
            lista.put(n);
        }
        gravar(c, CHAVE, lista);
    }

    /** Chegou a hora: mostra (substituindo o anterior da mesma série) e marca para sumir. */
    static synchronized void mostrar(Context c, Intent i) {
        int id = i.getIntExtra("id", 0), serie = i.getIntExtra("serie", id);
        String item = i.getStringExtra("item"), titulo = i.getStringExtra("titulo");
        long sumir = i.getLongExtra("sumir", 0);

        JSONArray velhos = ler(c, CHAVE), lista = new JSONArray();         // este já tocou: sai da lista
        for (int k = 0; k < velhos.length(); k++) {
            JSONObject v = velhos.optJSONObject(k);
            if (v != null && v.optInt("id") != id) lista.put(v);
        }
        gravar(c, CHAVE, lista);

        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CANAL) == null) {
            nm.createNotificationChannel(new NotificationChannel(CANAL, "Avisos do Prumo", NotificationManager.IMPORTANCE_HIGH));
        }
        Intent abrir = new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
        NotificationCompat.Builder b = new NotificationCompat.Builder(c, CANAL)
            .setSmallIcon(R.drawable.ic_stat_prumo)
            .setContentTitle(titulo == null || titulo.isEmpty() ? "Lembrete" : titulo)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setCategory(NotificationCompat.CATEGORY_REMINDER)
            .setAutoCancel(true)
            .setOnlyAlertOnce(false)                                       // o substituto também toca/vibra
            .setContentIntent(PendingIntent.getActivity(c, serie, abrir, PendingIntent.FLAG_IMMUTABLE))
            .addAction(0, "Parar", botao(c, LembreteReceiver.PARAR, serie, item))
            .addAction(0, "Feito", botao(c, LembreteReceiver.FEITO, serie, item));
        if (sumir > 0) b.setTimeoutAfter(sumir);
        nm.notify(serie, b.build());
    }

    private static PendingIntent botao(Context c, String acao, int serie, String item) {
        Intent i = new Intent(c, LembreteReceiver.class).setAction(acao)
            .putExtra("serie", serie).putExtra("item", item);
        return PendingIntent.getBroadcast(c, serie * 2 + (LembreteReceiver.PARAR.equals(acao) ? 0 : 1), i,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    /** "Parar" ou "Feito" na notificação: tira da barra, cancela o resto e guarda o pedido para o app. */
    static synchronized void responder(Context c, String acao, int serie, String item) {
        c.getSystemService(NotificationManager.class).cancel(serie);
        JSONArray velhos = ler(c, CHAVE), lista = new JSONArray();
        for (int k = 0; k < velhos.length(); k++) {
            JSONObject v = velhos.optJSONObject(k);
            if (v == null) continue;
            if (v.optInt("serie") == serie) cancelar(c, v); else lista.put(v);
        }
        gravar(c, CHAVE, lista);
        JSONArray acoes = ler(c, CHAVE_ACOES);
        try {
            acoes.put(new JSONObject().put("item", item).put("acao", acao).put("quando", System.currentTimeMillis()));
        } catch (JSONException ignorado) {}
        gravar(c, CHAVE_ACOES, acoes);
    }

    /** O app pega os "Parar"/"Feito" que aconteceram com ele fechado (e a lista é zerada). */
    static synchronized JSONArray pegarAcoes(Context c) {
        JSONArray a = ler(c, CHAVE_ACOES);
        gravar(c, CHAVE_ACOES, new JSONArray());
        return a;
    }

    /** Depois de reiniciar o celular o Android esquece: põe de volta. */
    static synchronized void reagendarSalvos(Context c) {
        long agora = System.currentTimeMillis();
        JSONArray velhos = ler(c, CHAVE), lista = new JSONArray();
        for (int i = 0; i < velhos.length(); i++) {
            JSONObject v = velhos.optJSONObject(i);
            if (v == null || v.optLong("at") <= agora) continue;
            agendar(c, v);
            lista.put(v);
        }
        gravar(c, CHAVE, lista);
    }
}
