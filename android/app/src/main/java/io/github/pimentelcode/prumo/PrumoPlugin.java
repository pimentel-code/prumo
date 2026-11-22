package io.github.pimentelcode.prumo;

import android.app.Activity;
import android.app.NotificationManager;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import android.speech.RecognizerIntent;
import android.view.inputmethod.InputMethodManager;
import android.webkit.WebView;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.ArrayList;
import org.json.JSONArray;
import org.json.JSONException;

/** Ponte entre o app (JavaScript) e as partes nativas do Prumo: alarme, voz e widget. */
@CapacitorPlugin(name = "Prumo")
public class PrumoPlugin extends Plugin {

    /** Pedido vindo do widget ou de um atalho do ícone: "falar" ou "anotar". */
    static volatile String pedido = null;

    @PluginMethod
    public void acaoPendente(PluginCall call) {
        JSObject r = new JSObject();
        r.put("acao", pedido);
        pedido = null;
        call.resolve(r);
    }

    /** O foco na caixa de texto não abre o teclado sozinho no Android: pede aqui. */
    @PluginMethod
    public void mostrarTeclado(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            WebView w = getBridge().getWebView();
            w.requestFocus();
            InputMethodManager imm = (InputMethodManager) getContext().getSystemService(android.content.Context.INPUT_METHOD_SERVICE);
            if (imm != null) w.postDelayed(() -> imm.showSoftInput(w, InputMethodManager.SHOW_IMPLICIT), 150);
            call.resolve();
        });
    }

    /** Recebe o resumo (JSON) do app e redesenha o widget da tela principal. */
    @PluginMethod
    public void atualizarWidget(PluginCall call) {
        String dados = call.getString("dados", "{}");
        getContext().getSharedPreferences(PrumoWidget.PREFS, android.content.Context.MODE_PRIVATE)
            .edit().putString(PrumoWidget.CHAVE, dados).apply();
        PrumoWidget.atualizarTodos(getContext());
        call.resolve();
    }

    /** Recebe a lista completa de alarmes: [{id, at (ms), titulo, texto}]. */
    @PluginMethod
    public void definirAlarmes(PluginCall call) {
        JSArray lista = call.getArray("alarmes", new JSArray());
        Alarmes.definir(getContext(), lista);
        call.resolve();
    }

    @PluginMethod
    public void testarAlarme(PluginCall call) {
        int segundos = call.getInt("segundos", 10);
        Alarmes.adiar(getContext(), 1, "Teste do Prumo", "Se está tocando, o alarme funciona.",
            System.currentTimeMillis() + segundos * 1000L);
        call.resolve();
    }

    /** O Android 14+ pode bloquear a tela cheia do alarme; diz se está liberada. */
    @PluginMethod
    public void estadoAlarme(PluginCall call) {
        JSObject r = new JSObject();
        boolean telaCheia = true;
        if (Build.VERSION.SDK_INT >= 34) {
            telaCheia = getContext().getSystemService(NotificationManager.class).canUseFullScreenIntent();
        }
        r.put("telaCheia", telaCheia);
        // Celular desbloqueado: o Android só deixa a tela do alarme abrir por cima
        // se o app puder "aparecer sobre outros apps".
        r.put("sobrepor", Build.VERSION.SDK_INT < 29 || Settings.canDrawOverlays(getContext()));
        call.resolve(r);
    }

    @PluginMethod
    public void abrirAjustesTelaCheia(PluginCall call) {
        Intent i;
        if (Build.VERSION.SDK_INT >= 34) {
            i = new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,
                Uri.parse("package:" + getContext().getPackageName()));
        } else {
            i = new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                Uri.parse("package:" + getContext().getPackageName()));
        }
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try { getContext().startActivity(i); } catch (Exception e) { /* tela inexistente */ }
        call.resolve();
    }

    @PluginMethod
    public void abrirAjustesSobrepor(PluginCall call) {
        Intent i = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
            Uri.parse("package:" + getContext().getPackageName()));
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try { getContext().startActivity(i); }
        catch (Exception e) {
            try {
                getContext().startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
                    Uri.parse("package:" + getContext().getPackageName())).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
            } catch (Exception ignorado) {}
        }
        call.resolve();
    }

    /** Abre o reconhecimento de voz do próprio Android e devolve o texto falado. */
    @PluginMethod
    public void ouvir(PluginCall call) {
        Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "pt-BR")
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "pt-BR")
            .putExtra(RecognizerIntent.EXTRA_PROMPT, "Fale o que quer anotar")
            .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
        try {
            startActivityForResult(call, i, "aoOuvir");
        } catch (ActivityNotFoundException e) {
            call.reject("Este celular não tem reconhecimento de voz instalado.", "SEM_VOZ");
        }
    }

    @ActivityCallback
    private void aoOuvir(PluginCall call, ActivityResult resultado) {
        if (call == null) return;
        JSObject r = new JSObject();
        String texto = "";
        if (resultado.getResultCode() == Activity.RESULT_OK && resultado.getData() != null) {
            ArrayList<String> ditos = resultado.getData().getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS);
            if (ditos != null && !ditos.isEmpty()) texto = ditos.get(0);
        }
        r.put("texto", texto);
        call.resolve(r);
    }
}
