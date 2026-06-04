package com.angelos.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.view.View
import android.view.WindowManager
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

/**
 * AngelOS — WebView wrapper para tablet Android legacy (API 19+)
 *
 * Migrado desde: daniel/android/JarvisApp/MainActivity.kt
 * Cambios respecto al original:
 *  - URL centralizada: carga AngelOS en vez de Daniel directamente
 *  - IP configurable desde SharedPreferences (editable en Settings de AngelOS)
 *  - STT nativo disponible para todos los módulos (no solo Daniel)
 *  - Manejo de errores mejorado con retry exponencial
 */
class MainActivity : AppCompatActivity(), RecognitionListener {

    private lateinit var webView: WebView
    private lateinit var prefs: SharedPreferences
    private var speechRecognizer: SpeechRecognizer? = null
    private val handler = Handler(Looper.getMainLooper())
    private var retryDelay = 3_000L

    private val serverUrl: String
        get() = prefs.getString("angelos_url", DEFAULT_URL) ?: DEFAULT_URL

    companion object {
        // IP del servidor Ubuntu — editable desde Configuración de AngelOS
        const val DEFAULT_URL = "http://192.168.100.6:3005"
        val PERMS     = arrayOf(Manifest.permission.RECORD_AUDIO)
        const val PERM_CODE = 1001
    }

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        prefs = getSharedPreferences("angelos", MODE_PRIVATE)

        hideSystemUI()
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)

        webView = WebView(this).apply {
            settings.apply {
                javaScriptEnabled        = true
                domStorageEnabled        = true
                allowFileAccess          = false
                cacheMode                = WebSettings.LOAD_CACHE_ELSE_NETWORK
                setSupportZoom(false)
                builtInZoomControls      = false
                displayZoomControls      = false
                loadWithOverviewMode     = true
                useWideViewPort          = true
                // Permite HTTP en Android 9+ (servidor local sin HTTPS)
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
                    mixedContentMode = android.webkit.WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                }
            }
        }

        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView, url: String) {
                // Indica al JS que STT nativo Android está disponible
                view.evaluateJavascript("window.ANDROID_NATIVE = true;", null)
                retryDelay = 3_000L
            }

            @Suppress("OverridingDeprecatedMember", "DEPRECATION")
            override fun onReceivedError(
                view: WebView, errorCode: Int, description: String, failingUrl: String
            ) {
                handler.postDelayed({
                    view.loadUrl(serverUrl)
                    retryDelay = minOf(retryDelay * 2, 60_000L)
                }, retryDelay)
            }
        }

        setContentView(webView)
        webView.loadUrl(serverUrl)

        if (hasPermissions()) initSpeech()
        else ActivityCompat.requestPermissions(this, PERMS, PERM_CODE)
    }

    // ── STT nativo Android ────────────────────────────────────────────────────

    private fun initSpeech() {
        if (!SpeechRecognizer.isRecognitionAvailable(this)) return
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this)
        speechRecognizer?.setRecognitionListener(this)
        startListening()
    }

    private fun startListening() {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,
                     RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE,            "es-ES")
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, "es-ES")
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS,     true)
            putExtra(RecognizerIntent.EXTRA_MAX_RESULTS,         1)
        }
        try {
            speechRecognizer?.startListening(intent)
        } catch (_: Exception) {
            handler.postDelayed(::startListening, 1_000)
        }
    }

    // ── RecognitionListener — envía resultado al módulo activo en AngelOS ────

    override fun onPartialResults(partialResults: Bundle) {
        val text = partialResults
            .getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            ?.firstOrNull() ?: return
        injectResult(text, false)
    }

    override fun onResults(results: Bundle) {
        val text = results
            .getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)
            ?.firstOrNull() ?: ""
        if (text.isNotBlank()) injectResult(text, true)
        handler.postDelayed(::startListening, 400)
    }

    override fun onError(error: Int) {
        val delay = if (error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY) 1_200L else 500L
        handler.postDelayed(::startListening, delay)
    }

    override fun onReadyForSpeech(params: Bundle?)    {}
    override fun onBeginningOfSpeech()                {}
    override fun onRmsChanged(rmsdB: Float)           {}
    override fun onBufferReceived(buffer: ByteArray?) {}
    override fun onEndOfSpeech()                      {}
    override fun onEvent(eventType: Int, params: Bundle?) {}

    // ── Helpers ───────────────────────────────────────────────────────────────

    private fun injectResult(text: String, isFinal: Boolean) {
        val safe = text.replace("\\", "\\\\").replace("'", "\\'")
        webView.evaluateJavascript("window.onNativeResult && window.onNativeResult('$safe',$isFinal)", null)
    }

    private fun hasPermissions() = PERMS.all {
        ContextCompat.checkSelfPermission(this, it) == PackageManager.PERMISSION_GRANTED
    }

    override fun onRequestPermissionsResult(code: Int, perms: Array<String>, results: IntArray) {
        super.onRequestPermissionsResult(code, perms, results)
        if (code == PERM_CODE && hasPermissions()) initSpeech()
    }

    @Suppress("DEPRECATION")
    override fun onBackPressed() {
        if (webView.canGoBack()) webView.goBack()
    }

    override fun onDestroy() {
        super.onDestroy()
        speechRecognizer?.destroy()
        webView.destroy()
    }

    @Suppress("DEPRECATION")
    private fun hideSystemUI() {
        window.decorView.systemUiVisibility = (
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            or View.SYSTEM_UI_FLAG_FULLSCREEN
            or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        )
    }

    @Suppress("DEPRECATION")
    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemUI()
    }
}
