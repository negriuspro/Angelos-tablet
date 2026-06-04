package com.angelos.app

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.SharedPreferences
import android.content.pm.PackageManager
import android.graphics.Color
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat

class MainActivity : AppCompatActivity(), RecognitionListener {

    private lateinit var webView: WebView
    private lateinit var prefs: SharedPreferences
    private var speechRecognizer: SpeechRecognizer? = null
    private val handler = Handler(Looper.getMainLooper())
    private var retryDelay = 3_000L

    private val serverUrl: String
        get() = prefs.getString("angelos_url", DEFAULT_URL) ?: DEFAULT_URL

    companion object {
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

        val rootLayout = FrameLayout(this).apply {
            layoutParams = ViewGroup.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
            )
            setBackgroundColor(Color.parseColor("#0a0f1a"))
        }

        webView = WebView(this).apply {
            visibility = View.INVISIBLE
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
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
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
                    mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
                }
            }
        }

        val splashText = TextView(this).apply {
            text = "AngelOS\nConectando al servidor..."
            setTextColor(Color.WHITE)
            textSize = 24f
            gravity = Gravity.CENTER
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT,
                Gravity.CENTER
            )
        }

        rootLayout.addView(webView)
        rootLayout.addView(splashText)
        setContentView(rootLayout)

        // Forzar que el texto esté al frente
        splashText.bringToFront()

        webView.webViewClient = object : WebViewClient() {
            override fun onPageStarted(view: WebView?, url: String?, favicon: android.graphics.Bitmap?) {
                super.onPageStarted(view, url, favicon)
                // Mientras carga, ocultamos el WebView para que no se vea blanco
                if (url == serverUrl) {
                    webView.visibility = View.INVISIBLE
                    splashText.visibility = View.VISIBLE
                    splashText.bringToFront()
                }
            }

            override fun onPageFinished(view: WebView, url: String) {
                // Solo mostrar si cargó la URL real
                if (url == serverUrl) {
                    view.visibility = View.VISIBLE
                    splashText.visibility = View.GONE
                    view.evaluateJavascript("window.ANDROID_NATIVE = true;", null)
                    retryDelay = 3_000L
                }
            }

            @Suppress("OverridingDeprecatedMember", "DEPRECATION")
            override fun onReceivedError(
                view: WebView, errorCode: Int, description: String, failingUrl: String
            ) {
                // Bloqueamos la pantalla blanca del navegador
                view.stopLoading()
                view.loadUrl("about:blank")
                view.visibility = View.INVISIBLE
                
                splashText.visibility = View.VISIBLE
                splashText.bringToFront()
                splashText.text = "Servidor no encontrado\nIP: $serverUrl\nReintentando en ${retryDelay/1000}s..."

                handler.removeCallbacksAndMessages(null)
                handler.postDelayed({
                    splashText.text = "AngelOS\nConectando..."
                    view.loadUrl(serverUrl)
                    retryDelay = minOf(retryDelay * 2, 60_000L)
                }, retryDelay)
            }
        }

        webView.loadUrl(serverUrl)

        if (hasPermissions()) initSpeech()
        else ActivityCompat.requestPermissions(this, PERMS, PERM_CODE)
    }

    private fun initSpeech() {
        if (!SpeechRecognizer.isRecognitionAvailable(this)) return
        speechRecognizer = SpeechRecognizer.createSpeechRecognizer(this)
        speechRecognizer?.setRecognitionListener(this)
        startListening()
    }

    private fun startListening() {
        val intent = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH).apply {
            putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            putExtra(RecognizerIntent.EXTRA_LANGUAGE, "es-ES")
            putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
        }
        try {
            speechRecognizer?.startListening(intent)
        } catch (_: Exception) {
            handler.postDelayed(::startListening, 1000)
        }
    }

    override fun onResults(results: Bundle) {
        val text = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull() ?: ""
        if (text.isNotBlank()) injectResult(text, true)
        handler.postDelayed(::startListening, 400)
    }

    override fun onPartialResults(partialResults: Bundle) {
        val text = partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull() ?: return
        injectResult(text, false)
    }

    override fun onError(error: Int) {
        val delay = if (error == SpeechRecognizer.ERROR_RECOGNIZER_BUSY) 1200L else 500L
        handler.postDelayed(::startListening, delay)
    }

    override fun onReadyForSpeech(params: Bundle?) {}
    override fun onBeginningOfSpeech() {}
    override fun onRmsChanged(rmsdB: Float) {}
    override fun onBufferReceived(buffer: ByteArray?) {}
    override fun onEndOfSpeech() {}
    override fun onEvent(eventType: Int, params: Bundle?) {}

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
