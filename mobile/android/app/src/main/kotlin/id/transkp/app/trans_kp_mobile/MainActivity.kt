package id.transkp.app.trans_kp_mobile

import android.content.Intent
import android.nfc.NfcAdapter
import android.provider.Settings
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val channelName = "id.transkp.app/nfc_settings"

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName)
            .setMethodCallHandler { call, result ->
                when (call.method) {
                    "openNfcSettings" -> {
                        try {
                            startActivity(Intent(Settings.ACTION_NFC_SETTINGS))
                            result.success(true)
                        } catch (e: Exception) {
                            try {
                                startActivity(Intent(Settings.ACTION_WIRELESS_SETTINGS))
                                result.success(true)
                            } catch (e2: Exception) {
                                result.success(false)
                            }
                        }
                    }
                    "nfcState" -> {
                        val adapter = NfcAdapter.getDefaultAdapter(this)
                        result.success(
                            when {
                                adapter == null -> "not_supported"
                                adapter.isEnabled -> "available"
                                else -> "disabled"
                            }
                        )
                    }
                    else -> result.notImplemented()
                }
            }
    }
}
