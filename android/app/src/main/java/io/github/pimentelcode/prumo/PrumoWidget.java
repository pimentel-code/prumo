package io.github.pimentelcode.prumo;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import java.text.NumberFormat;
import java.util.Calendar;
import java.util.Locale;
import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Widget da tela principal: dois botões (Falar e Anotar) e um resumo do dia.
 *
 * O app (JavaScript) manda o resumo a cada salvamento — gasto de hoje e a lista
 * dos próximos compromissos/tarefas. Aqui só se escolhe o que mostrar AGORA,
 * para o widget continuar certo mesmo com o app fechado (ex.: virou o dia).
 * O Android chama onUpdate a cada 30 min (widget_prumo_info.xml).
 */
public class PrumoWidget extends AppWidgetProvider {
    static final String PREFS = "prumo_widget";
    static final String CHAVE = "dados";

    private static final String[] SEMANA = {"dom", "seg", "ter", "qua", "qui", "sex", "sáb"};

    @Override
    public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids) {
        for (int id : ids) mgr.updateAppWidget(id, montar(ctx));
    }

    static void atualizarTodos(Context ctx) {
        AppWidgetManager mgr = AppWidgetManager.getInstance(ctx);
        int[] ids = mgr.getAppWidgetIds(new ComponentName(ctx, PrumoWidget.class));
        for (int id : ids) mgr.updateAppWidget(id, montar(ctx));
    }

    private static PendingIntent abrir(Context ctx, String acao, int codigo) {
        Intent i = new Intent(ctx, MainActivity.class);
        if (acao != null) i.setAction(acao);
        else i.setAction(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        return PendingIntent.getActivity(ctx, codigo, i,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    static RemoteViews montar(Context ctx) {
        RemoteViews v = new RemoteViews(ctx.getPackageName(), R.layout.widget_prumo);
        v.setOnClickPendingIntent(R.id.widget_falar, abrir(ctx, MainActivity.ACAO_FALAR, 1));
        v.setOnClickPendingIntent(R.id.widget_anotar, abrir(ctx, MainActivity.ACAO_ANOTAR, 2));
        v.setOnClickPendingIntent(R.id.widget_textos, abrir(ctx, null, 3));

        String linha1 = "Toque em Falar ou Anotar";
        String linha2 = "Gastos, compromissos e tarefas";
        try {
            String bruto = ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(CHAVE, null);
            if (bruto != null) {
                JSONObject d = new JSONObject(bruto);
                Calendar agora = Calendar.getInstance();
                String hoje = iso(agora);

                double gasto = hoje.equals(d.optString("dia")) ? d.optDouble("gastoHoje", 0) : 0;
                NumberFormat moeda = NumberFormat.getCurrencyInstance(new Locale("pt", "BR"));
                linha1 = "Gasto hoje: " + moeda.format(gasto).replace(' ', ' ');

                linha2 = null;
                JSONArray prox = d.optJSONArray("proximos");
                if (prox != null) {
                    String agoraHM = String.format(Locale.ROOT, "%02d:%02d",
                        agora.get(Calendar.HOUR_OF_DAY), agora.get(Calendar.MINUTE));
                    for (int k = 0; k < prox.length(); k++) {
                        JSONObject p = prox.getJSONObject(k);
                        String data = p.optString("data"), hora = p.optString("hora");
                        if (data.compareTo(hoje) < 0) continue;
                        if (data.equals(hoje) && !hora.isEmpty() && hora.compareTo(agoraHM) < 0) continue;
                        String icone = "tarefa".equals(p.optString("tipo")) ? "☑ " : "📅 ";
                        linha2 = icone + p.optString("titulo") + " · " + quando(data, hoje) + (hora.isEmpty() ? "" : " " + hora);
                        break;
                    }
                }
                if (linha2 == null) {
                    int atrasados = d.optInt("atrasados", 0);
                    linha2 = atrasados > 0
                        ? "🧹 " + atrasados + (atrasados == 1 ? " coisa ficou" : " coisas ficaram") + " para trás"
                        : "Nada marcado daqui pra frente";
                }
            }
        } catch (Exception e) {
            // resumo ilegível: fica o texto padrão, os botões continuam funcionando
        }
        v.setTextViewText(R.id.widget_linha1, linha1);
        v.setTextViewText(R.id.widget_linha2, linha2);
        return v;
    }

    private static String iso(Calendar c) {
        return String.format(Locale.ROOT, "%04d-%02d-%02d",
            c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1, c.get(Calendar.DAY_OF_MONTH));
    }

    /** "hoje", "amanhã", "qui" (até 6 dias) ou "12/12". */
    private static String quando(String data, String hoje) {
        try {
            Calendar c = Calendar.getInstance();
            c.set(Integer.parseInt(data.substring(0, 4)), Integer.parseInt(data.substring(5, 7)) - 1,
                  Integer.parseInt(data.substring(8, 10)), 0, 0, 0);
            Calendar h = Calendar.getInstance();
            h.set(Calendar.HOUR_OF_DAY, 0); h.set(Calendar.MINUTE, 0); h.set(Calendar.SECOND, 0);
            long dias = Math.round((c.getTimeInMillis() - h.getTimeInMillis()) / 86400000.0);
            if (dias <= 0) return "hoje";
            if (dias == 1) return "amanhã";
            if (dias < 7) return SEMANA[c.get(Calendar.DAY_OF_WEEK) - 1];
            return data.substring(8, 10) + "/" + data.substring(5, 7);
        } catch (Exception e) {
            return data;
        }
    }
}
