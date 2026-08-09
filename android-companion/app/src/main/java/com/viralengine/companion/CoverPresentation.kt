package com.viralengine.companion

import android.app.Presentation
import android.content.Context
import android.os.Build
import android.os.Bundle
import android.os.PowerManager
import android.provider.Settings
import android.view.Display
import android.view.Window
import android.view.WindowManager
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient

class CoverPresentation(
    private val outerContext: Context,
    display: Display,
    private val urlToLoad: String
) : Presentation(outerContext, display) {

    private lateinit var webView: WebView
    private var wakeLock: PowerManager.WakeLock? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // 1. Force hardware screen awake & display overlay flags
        window?.let { win ->
            win.requestFeature(Window.FEATURE_NO_TITLE)
            
            // Set System Overlay Type so MagicOS Power Manager keeps Display 1 OLED panel ON
            if (Settings.canDrawOverlays(outerContext)) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                    win.setType(WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY)
                } else {
                    @Suppress("DEPRECATION")
                    win.setType(WindowManager.LayoutParams.TYPE_PHONE)
                }
            }

            win.addFlags(
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
            )
        }

        // 2. Hardware WakeLock with ACQUIRE_CAUSES_WAKEUP to force OLED panel power on 180°
        try {
            val pm = outerContext.getSystemService(Context.POWER_SERVICE) as PowerManager
            @Suppress("DEPRECATION")
            wakeLock = pm.newWakeLock(
                PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP,
                "ViralCompanion:CoverWakeLock"
            )
            wakeLock?.acquire(30 * 60 * 1000L) // 30 mins
        } catch (e: Exception) {
            e.printStackTrace()
        }

        setContentView(R.layout.presentation_cover)

        webView = findViewById(R.id.coverWebView)
        setupWebView()
        webView.loadUrl(urlToLoad)
    }

    override fun onStop() {
        super.onStop()
        try {
            if (wakeLock?.isHeld == true) {
                wakeLock?.release()
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    private fun setupWebView() {
        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.allowFileAccess = true
        settings.allowContentAccess = true

        webView.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView?, url: String?): Boolean {
                if (url != null) {
                    view?.loadUrl(url)
                }
                return true
            }
        }
    }
}
