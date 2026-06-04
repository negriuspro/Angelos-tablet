package com.angelos.app

import android.app.Application
import android.content.Context
import androidx.multidex.MultiDex

class AngelApplication : Application() {
    override fun attachBaseContext(base: Context) {
        super.attachBaseContext(base)
        MultiDex.install(this)
    }
}
