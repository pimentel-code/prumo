package io.github.pimentelcode.prumo;

import android.content.Intent;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    /** Ações vindas do widget e dos atalhos do ícone. */
    static final String ACAO_FALAR = "io.github.pimentelcode.prumo.FALAR";
    static final String ACAO_ANOTAR = "io.github.pimentelcode.prumo.ANOTAR";

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PrumoPlugin.class);   // alarme, voz e widget (código nativo do Prumo)
        super.onCreate(savedInstanceState);
        guardarPedido(getIntent());
    }

    /** O app já estava aberto (launchMode singleTask): o pedido chega aqui. */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        guardarPedido(intent);
    }

    /** Fica guardado até o JavaScript buscar (acaoPendente), na abertura ou ao voltar do fundo. */
    private void guardarPedido(Intent intent) {
        if (intent == null || intent.getAction() == null) return;
        if (ACAO_FALAR.equals(intent.getAction())) PrumoPlugin.pedido = "falar";
        else if (ACAO_ANOTAR.equals(intent.getAction())) PrumoPlugin.pedido = "anotar";
    }
}
