package id.transkp.app.trans_kp_mobile

import android.content.Intent
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import io.flutter.embedding.android.FlutterActivity
import io.flutter.embedding.engine.FlutterEngine
import io.flutter.plugin.common.MethodChannel

class MainActivity : FlutterActivity() {
    private val channelName = "id.transkp.app/nfc"
    private var channel: MethodChannel? = null
    private var nfcAdapter: NfcAdapter? = null
    private var isScanning = false
    private val mainHandler = Handler(Looper.getMainLooper())

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        nfcAdapter = NfcAdapter.getDefaultAdapter(this)
    }

    override fun configureFlutterEngine(flutterEngine: FlutterEngine) {
        super.configureFlutterEngine(flutterEngine)
        channel = MethodChannel(flutterEngine.dartExecutor.binaryMessenger, channelName)
        channel?.setMethodCallHandler { call, result ->
            when (call.method) {
                "status" -> result.success(nfcStatus())
                "startScan" -> {
                    val status = nfcStatus()
                    if (status != "OK") {
                        result.success(status)
                    } else {
                        isScanning = true
                        enableReader()
                        result.success("OK")
                    }
                }
                "stopScan" -> {
                    isScanning = false
                    disableReader()
                    result.success(null)
                }
                "openSettings" -> {
                    try {
                        startActivity(Intent(Settings.ACTION_NFC_SETTINGS))
                    } catch (e: Exception) {
                        startActivity(Intent(Settings.ACTION_SETTINGS))
                    }
                    result.success(null)
                }
                else -> result.notImplemented()
            }
        }
    }

    private fun nfcStatus(): String {
        if (nfcAdapter == null) nfcAdapter = NfcAdapter.getDefaultAdapter(this)
        val adapter = nfcAdapter ?: return "NFC_NOT_SUPPORTED"
        return if (adapter.isEnabled) "OK" else "NFC_DISABLED"
    }

    private fun enableReader() {
        val adapter = nfcAdapter ?: return
        val flags = NfcAdapter.FLAG_READER_NFC_A or
                NfcAdapter.FLAG_READER_NFC_B or
                NfcAdapter.FLAG_READER_NFC_F or
                NfcAdapter.FLAG_READER_NFC_V or
                NfcAdapter.FLAG_READER_SKIP_NDEF_CHECK
        try {
            adapter.enableReaderMode(this, { tag: Tag -> onTagDiscovered(tag) }, flags, Bundle())
        } catch (e: Exception) {
            mainHandler.post { channel?.invokeMethod("onError", e.message ?: "Gagal mengaktifkan NFC") }
        }
    }

    private fun disableReader() {
        try {
            nfcAdapter?.disableReaderMode(this)
        } catch (_: Exception) {
        }
    }

    private fun onTagDiscovered(tag: Tag) {
        val uid = tag.id?.joinToString("") { "%02X".format(it) } ?: ""
        mainHandler.post {
            isScanning = false
            disableReader()
            if (uid.isEmpty()) {
                channel?.invokeMethod("onError", "UID kartu tidak terbaca")
            } else {
                channel?.invokeMethod("onTag", uid)
            }
        }
    }

    override fun onResume() {
        super.onResume()
        if (isScanning && nfcStatus() == "OK") enableReader()
    }

    override fun onPause() {
        if (isScanning) disableReader()
        super.onPause()
    }
}
