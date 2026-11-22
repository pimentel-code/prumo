package io.github.pimentelcode.prumo;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import androidx.core.content.ContextCompat;

/** Recebe a hora do alarme (e o celular ligando) e chama o despertador. */
public class AlarmeReceiver extends BroadcastReceiver {
    static final String TOCAR = "io.github.pimentelcode.prumo.TOCAR";

    @Override
    public void onReceive(Context c, Intent i) {
        String acao = i.getAction();
        if (TOCAR.equals(acao)) {
            Alarmes.disparou(c, i.getIntExtra("id", 0));
            Intent s = new Intent(c, AlarmeService.class).setAction(AlarmeService.INICIAR);
            s.putExtras(i);
            ContextCompat.startForegroundService(c, s);
        } else if (Intent.ACTION_BOOT_COMPLETED.equals(acao)
                || Intent.ACTION_MY_PACKAGE_REPLACED.equals(acao)) {
            Alarmes.reagendarSalvos(c);
        }
    }
}
