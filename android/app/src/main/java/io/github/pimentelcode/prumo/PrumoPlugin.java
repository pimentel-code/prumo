package io.github.pimentelcode.prumo;

import android.Manifest;
import android.app.Activity;
import android.app.NotificationManager;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import android.view.inputmethod.InputMethodManager;
import android.webkit.WebView;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;
import org.json.JSONArray;
import org.json.JSONException;

/** Ponte entre o app (JavaScript) e as partes nativas do Prumo: alarme, voz e widget. */
@CapacitorPlugin(name = "Prumo", permissions = {
    @Permission(alias = "microfone", strings = { Manifest.permission.RECORD_AUDIO })
})
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

    /* ---------- versão nova do app ---------- */

    /** O Android só deixa um app instalar outro (aqui: a versão nova dele mesmo)
     *  depois que a pessoa liga "Permitir desta fonte" uma vez. */
    @PluginMethod
    public void podeInstalar(PluginCall call) {
        JSObject r = new JSObject();
        r.put("pode", Build.VERSION.SDK_INT < 26 || getContext().getPackageManager().canRequestPackageInstalls());
        call.resolve(r);
    }

    @PluginMethod
    public void abrirPermissaoInstalar(PluginCall call) {
        Intent i = Build.VERSION.SDK_INT >= 26
            ? new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()))
            : new Intent(Settings.ACTION_SECURITY_SETTINGS);
        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try { getContext().startActivity(i); } catch (Exception e) { /* tela inexistente */ }
        call.resolve();
    }

    /** Baixa o APK da versão nova (só do repositório do Prumo) e abre o
     *  instalador do Android. O Android confere a assinatura: só aceita se
     *  o APK foi assinado com a mesma chave do app instalado. */
    @PluginMethod
    public void instalarAtualizacao(PluginCall call) {
        String url = call.getString("url", "");
        if (!url.startsWith("https://github.com/pimentel-code/prumo/releases/download/")) {
            call.reject("Endereço de atualização estranho; nada foi baixado.", "URL");
            return;
        }
        new Thread(() -> {
            File destino = new File(getContext().getCacheDir(), "prumo-atualizacao.apk");
            try {
                HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
                c.setInstanceFollowRedirects(true);
                c.setConnectTimeout(20000);
                c.setReadTimeout(60000);
                if (c.getResponseCode() != 200) throw new Exception("HTTP " + c.getResponseCode());
                try (InputStream in = c.getInputStream(); OutputStream out = new FileOutputStream(destino)) {
                    byte[] buf = new byte[64 * 1024];
                    for (int n; (n = in.read(buf)) > 0; ) out.write(buf, 0, n);
                }
                Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", destino);
                Intent i = new Intent(Intent.ACTION_VIEW)
                    .setDataAndType(uri, "application/vnd.android.package-archive")
                    .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                getContext().startActivity(i);
                call.resolve();
            } catch (Exception e) {
                call.reject("Não consegui baixar a versão nova. Confira a internet e tente de novo.", "DOWNLOAD");
            }
        }).start();
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

    /* ---------- Escuta direta (esfera): microfone sem a janelinha do Google ---------- */

    private SpeechRecognizer reconhecedor;

    /** Ouve pelo microfone, avisando o volume ("vozVolume") e o texto parcial ("vozParcial"). */
    @PluginMethod
    public void escutar(PluginCall call) {
        if (getPermissionState("microfone") != PermissionState.GRANTED) {
            requestPermissionForAlias("microfone", call, "aoPermitirMicrofone");
            return;
        }
        comecarEscuta(call);
    }

    @PermissionCallback
    private void aoPermitirMicrofone(PluginCall call) {
        if (getPermissionState("microfone") == PermissionState.GRANTED) comecarEscuta(call);
        else call.reject("Sem permissão do microfone.", "SEM_PERMISSAO");
    }

    private void comecarEscuta(final PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (!SpeechRecognizer.isRecognitionAvailable(getContext())) {
                call.reject("Reconhecimento de voz indisponível.", "SEM_VOZ");
                return;
            }
            destruirReconhecedor();
            reconhecedor = SpeechRecognizer.createSpeechRecognizer(getContext());
            final boolean[] respondido = { false };
            reconhecedor.setRecognitionListener(new RecognitionListener() {
                @Override public void onReadyForSpeech(Bundle b) {}
                @Override public void onBeginningOfSpeech() {}
                @Override public void onBufferReceived(byte[] b) {}
                @Override public void onEndOfSpeech() {}
                @Override public void onEvent(int tipo, Bundle b) {}

                @Override public void onRmsChanged(float rms) {
                    JSObject d = new JSObject();
                    d.put("rms", rms);
                    notifyListeners("vozVolume", d);
                }

                @Override public void onPartialResults(Bundle b) {
                    ArrayList<String> t = b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    if (t == null || t.isEmpty()) return;
                    JSObject d = new JSObject();
                    d.put("texto", t.get(0));
                    notifyListeners("vozParcial", d);
                }

                @Override public void onResults(Bundle b) {
                    if (respondido[0]) return;
                    respondido[0] = true;
                    ArrayList<String> t = b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                    JSObject r = new JSObject();
                    r.put("texto", (t != null && !t.isEmpty()) ? t.get(0) : "");
                    call.resolve(r);
                    destruirReconhecedor();
                }

                @Override public void onError(int erro) {
                    if (respondido[0]) return;
                    respondido[0] = true;
                    if (erro == SpeechRecognizer.ERROR_NO_MATCH || erro == SpeechRecognizer.ERROR_SPEECH_TIMEOUT
                            || erro == SpeechRecognizer.ERROR_CLIENT) {
                        JSObject r = new JSObject();
                        r.put("texto", "");
                        call.resolve(r);
                    } else if (erro == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) {
                        call.reject("Sem permissão do microfone.", "SEM_PERMISSAO");
                    } else {
                        call.reject("Não consegui ouvir (erro " + erro + ").", "ERRO_VOZ");
                    }
                    destruirReconhecedor();
                }
            });
            Intent i = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
                .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                .putExtra(RecognizerIntent.EXTRA_LANGUAGE, "pt-BR")
                .putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "pt-BR")
                .putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
                .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            reconhecedor.startListening(i);
        });
    }

    /** Toque no microfone de novo: para de ouvir e entrega o que já ouviu. */
    @PluginMethod
    public void pararEscuta(PluginCall call) {
        getActivity().runOnUiThread(() -> { if (reconhecedor != null) reconhecedor.stopListening(); });
        call.resolve();
    }

    private void destruirReconhecedor() {
        if (reconhecedor != null) {
            try { reconhecedor.destroy(); } catch (Exception e) {}
            reconhecedor = null;
        }
    }

    @Override
    protected void handleOnDestroy() {
        destruirReconhecedor();
    }
}
