package io.github.pimentelcode.prumo;

import android.app.Activity;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.core.content.ContextCompat;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/** Tela do alarme: acende o celular por cima do bloqueio, com Parar e Adiar. */
public class AlarmeActivity extends Activity {
    private final BroadcastReceiver fechar = new BroadcastReceiver() {
        @Override public void onReceive(Context c, Intent i) { finish(); }
    };

    @Override
    protected void onCreate(Bundle salvo) {
        super.onCreate(salvo);
        if (Build.VERSION.SDK_INT >= 27) { setShowWhenLocked(true); setTurnScreenOn(true); }
        else getWindow().addFlags(WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
                | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        // Visual "esfera" (23/11/2026): o mesmo degradê do ícone, de cima (azul) a baixo (laranja).
        getWindow().setStatusBarColor(0xFF5A74F8);
        getWindow().setNavigationBarColor(0xFFF98A4E);

        String titulo = getIntent().getStringExtra("titulo");
        String texto = getIntent().getStringExtra("texto");

        LinearLayout tela = new LinearLayout(this);
        tela.setOrientation(LinearLayout.VERTICAL);
        tela.setGravity(Gravity.CENTER);
        tela.setBackground(new GradientDrawable(GradientDrawable.Orientation.TOP_BOTTOM,
            new int[] { 0xFF5A74F8, 0xFF8B5CF6, 0xFFEC4899, 0xFFF98A4E }));
        int m = dp(28);
        tela.setPadding(m, m, m, m);

        tela.addView(texto(new SimpleDateFormat("HH:mm", Locale.getDefault()).format(new Date()), 72, true));
        tela.addView(texto("⏰ " + (titulo == null ? "Alarme" : titulo), 28, true));
        if (texto != null && !texto.isEmpty()) tela.addView(texto(texto, 18, false));

        LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(
            LinearLayout.LayoutParams.MATCH_PARENT, dp(64));
        lp.topMargin = dp(18);
        Button adiar = botao("Adiar 10 min", Color.TRANSPARENT, Color.WHITE);
        adiar.setOnClickListener(v -> mandar(AlarmeService.ADIAR));
        Button parar = botao("Parar", Color.WHITE, 0xFFB83A8E);
        parar.setOnClickListener(v -> mandar(AlarmeService.PARAR));
        LinearLayout.LayoutParams lpTopo = new LinearLayout.LayoutParams(lp);
        lpTopo.topMargin = dp(56);
        tela.addView(adiar, lpTopo);
        tela.addView(parar, lp);
        setContentView(tela);

        ContextCompat.registerReceiver(this, fechar, new IntentFilter(AlarmeService.FECHAR_TELA),
            ContextCompat.RECEIVER_NOT_EXPORTED);
    }

    private void mandar(String acao) {
        startService(new Intent(this, AlarmeService.class).setAction(acao));
        finish();
    }

    private TextView texto(String s, int sp, boolean negrito) {
        TextView t = new TextView(this);
        t.setText(s);
        t.setTextColor(Color.WHITE);
        t.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        t.setGravity(Gravity.CENTER);
        if (negrito) t.setTypeface(Typeface.DEFAULT_BOLD);
        t.setPadding(0, dp(6), 0, dp(6));
        return t;
    }

    private Button botao(String s, int fundo, int cor) {
        Button b = new Button(this);
        b.setText(s);
        b.setAllCaps(false);
        b.setTextSize(TypedValue.COMPLEX_UNIT_SP, 20);
        b.setTextColor(cor);
        GradientDrawable g = new GradientDrawable();
        g.setColor(fundo);
        g.setCornerRadius(dp(18));
        g.setStroke(dp(2), Color.WHITE);
        b.setBackground(g);
        return b;
    }

    private int dp(int v) { return Math.round(v * getResources().getDisplayMetrics().density); }

    @Override protected void onDestroy() {
        try { unregisterReceiver(fechar); } catch (Exception ignorado) {}
        super.onDestroy();
    }
}
