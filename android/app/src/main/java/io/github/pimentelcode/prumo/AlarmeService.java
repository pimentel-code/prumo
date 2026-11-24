package io.github.pimentelcode.prumo;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioAttributes;
import android.media.MediaPlayer;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.os.VibratorManager;
import androidx.core.app.NotificationCompat;
import androidx.core.app.ServiceCompat;

/** O despertador: toca o som de alarme do celular em volta e vibra até
 *  a pessoa parar ou adiar (ou 10 minutos, como um relógio comum). */
public class AlarmeService extends Service {
    static final String INICIAR = "io.github.pimentelcode.prumo.ALARME_INICIAR";
    static final String PARAR = "io.github.pimentelcode.prumo.ALARME_PARAR";
    static final String ADIAR = "io.github.pimentelcode.prumo.ALARME_ADIAR";
    static final String FECHAR_TELA = "io.github.pimentelcode.prumo.ALARME_FECHAR_TELA";
    static final String CANAL = "alarme";
    private static final int NOTIFICACAO = 4242;
    private static final long LIMITE = 10 * 60 * 1000L;
    static final long SONECA = 10 * 60 * 1000L;

    private MediaPlayer player;
    private Ringtone reserva;
    private Vibrator vibrador;
    private final Handler relogio = new Handler(Looper.getMainLooper());
    private int id;
    private String titulo = "Alarme", texto = "";

    @Override public IBinder onBind(Intent i) { return null; }

    @Override
    public int onStartCommand(Intent i, int flags, int startId) {
        String acao = i == null ? null : i.getAction();
        if (INICIAR.equals(acao)) {
            pararSom();
            id = i.getIntExtra("id", 0);
            titulo = valor(i.getStringExtra("titulo"), "Alarme");
            texto = valor(i.getStringExtra("texto"), "");
            criarCanal();
            ServiceCompat.startForeground(this, NOTIFICACAO, montar(),
                Build.VERSION.SDK_INT >= 29 ? ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK : 0);
            tocar();
            abrirTela();
            relogio.removeCallbacksAndMessages(null);
            relogio.postDelayed(this::encerrar, LIMITE);
        } else if (ADIAR.equals(acao)) {
            Alarmes.adiar(this, id, titulo, texto, System.currentTimeMillis() + SONECA);
            encerrar();
        } else {
            encerrar();
        }
        return START_NOT_STICKY;
    }

    private static String valor(String s, String padrao) { return s == null || s.isEmpty() ? padrao : s; }

    private void criarCanal() {
        if (Build.VERSION.SDK_INT < 26) return;
        NotificationChannel canal = new NotificationChannel(CANAL, "Alarmes", NotificationManager.IMPORTANCE_HIGH);
        canal.setDescription("Alarme que toca até você parar");
        canal.setSound(null, null);          // o som quem toca é o próprio serviço, em volta
        canal.enableVibration(false);
        canal.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        getSystemService(NotificationManager.class).createNotificationChannel(canal);
    }

    private PendingIntent acao(String a, int codigo) {
        return PendingIntent.getService(this, codigo, new Intent(this, AlarmeService.class).setAction(a),
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private Intent intentTela() {
        return new Intent(this, AlarmeActivity.class)
            .putExtra("titulo", titulo).putExtra("texto", texto)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION);
    }

    /** Bloqueado, quem acende a tela é a notificação de tela cheia. Desbloqueado,
     *  o Android mostraria só uma faixa no alto: aqui a tela do alarme é aberta
     *  direto (precisa de "aparecer sobre outros apps"; sem ela o Android ignora
     *  o pedido e fica a faixa com Parar/Adiar, como antes). */
    private void abrirTela() {
        try { startActivity(intentTela()); } catch (Exception ignorado) {}
    }

    private Notification montar() {
        Intent tela = intentTela();
        PendingIntent telaCheia = PendingIntent.getActivity(this, 7, tela,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Builder(this, CANAL)
            .setSmallIcon(R.drawable.ic_stat_prumo)
            .setColor(0xFFEC4899)
            .setContentTitle("⏰ " + titulo)
            .setContentText(texto.isEmpty() ? "Alarme do Prumo" : texto)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setOngoing(true)
            .setAutoCancel(false)
            .setFullScreenIntent(telaCheia, true)
            .setContentIntent(telaCheia)
            .addAction(0, "Adiar 10 min", acao(ADIAR, 2))
            .addAction(0, "Parar", acao(PARAR, 1))
            .build();
    }

    private void tocar() {
        AudioAttributes audio = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();
        Uri som = RingtoneManager.getActualDefaultRingtoneUri(this, RingtoneManager.TYPE_ALARM);
        if (som == null) som = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
        if (som == null) som = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
        try {
            player = new MediaPlayer();
            player.setAudioAttributes(audio);
            player.setDataSource(this, som);
            player.setLooping(true);
            player.prepare();
            player.start();
        } catch (Exception e) {
            if (player != null) { player.release(); player = null; }
            reserva = RingtoneManager.getRingtone(this, som);
            if (reserva != null) {
                reserva.setAudioAttributes(audio);
                if (Build.VERSION.SDK_INT >= 28) reserva.setLooping(true);
                reserva.play();
            }
        }
        vibrador = Build.VERSION.SDK_INT >= 31
            ? ((VibratorManager) getSystemService(VIBRATOR_MANAGER_SERVICE)).getDefaultVibrator()
            : (Vibrator) getSystemService(VIBRATOR_SERVICE);
        if (vibrador != null && vibrador.hasVibrator()) {
            long[] ritmo = {0, 900, 700};
            if (Build.VERSION.SDK_INT >= 26) vibrador.vibrate(VibrationEffect.createWaveform(ritmo, 0), audio);
            else vibrador.vibrate(ritmo, 0);
        }
    }

    private void pararSom() {
        if (player != null) { try { player.stop(); } catch (Exception ignorado) {} player.release(); player = null; }
        if (reserva != null) { reserva.stop(); reserva = null; }
        if (vibrador != null) { vibrador.cancel(); vibrador = null; }
    }

    private void encerrar() {
        relogio.removeCallbacksAndMessages(null);
        pararSom();
        sendBroadcast(new Intent(FECHAR_TELA).setPackage(getPackageName()));
        ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    @Override public void onDestroy() { relogio.removeCallbacksAndMessages(null); pararSom(); super.onDestroy(); }
}
