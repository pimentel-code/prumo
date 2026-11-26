package io.github.pimentelcode.prumo;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Hora de um lembrete da série ("a cada 20 min") e os botões Parar/Feito dele. */
public class LembreteReceiver extends BroadcastReceiver {
    static final String LEMBRAR = "io.github.pimentelcode.prumo.LEMBRAR";
    static final String PARAR = "io.github.pimentelcode.prumo.LEMBRETE_PARAR";
    static final String FEITO = "io.github.pimentelcode.prumo.LEMBRETE_FEITO";

    @Override
    public void onReceive(Context c, Intent i) {
        String acao = i.getAction();
        if (LEMBRAR.equals(acao)) Lembretes.mostrar(c, i);
        else if (PARAR.equals(acao) || FEITO.equals(acao)) {
            Lembretes.responder(c, PARAR.equals(acao) ? "parar" : "feito",
                i.getIntExtra("serie", 0), i.getStringExtra("item"));
        }
    }
}
