package com.acims.mobility.location

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.location.Priority
import io.socket.client.IO
import io.socket.client.Socket
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.Executors

/**
 * ACMIS Driver Foreground Location Service
 *
 * Uses FusedLocationProviderClient + continuous LocationRequest (PRIORITY_HIGH_ACCURACY, 3000ms)
 * + LocationCallback to stream real hardware GPS coordinates over Socket.IO (`driverLocationUpdate`)
 * to the ACMIS Node.js server (`bus:<busId>` room).
 *
 * Zero artificial movement (`latitude += 0.002` / `longitude -= 0.002` is strictly forbidden).
 */
class DriverLocationForegroundService : Service() {

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private lateinit var locationCallback: LocationCallback

    private var socket: Socket? = null
    private var driverId: String = "driver-arun"
    private var busId: String = "bus-12"
    private var serverUrl: String = "http://10.0.2.2:3000"
    private val ioExecutor = Executors.newSingleThreadExecutor()

    companion object {
        const val ACTION_START_TRACKING = "com.acims.mobility.action.START_TRACKING"
        const val ACTION_STOP_TRACKING = "com.acims.mobility.action.STOP_TRACKING"
        const val EXTRA_DRIVER_ID = "extra_driver_id"
        const val EXTRA_BUS_ID = "extra_bus_id"
        const val EXTRA_SERVER_URL = "extra_server_url"

        private const val NOTIFICATION_CHANNEL_ID = "acims_driver_gps_channel"
        private const val NOTIFICATION_ID = 1001
    }

    override fun onCreate() {
        super.onCreate()
        fusedLocationClient =
            LocationServices.getFusedLocationProviderClient(this)

        locationCallback = object : LocationCallback() {

            override fun onLocationResult(
                result: LocationResult
            ) {

                for (location in result.locations) {

                    val latitude = location.latitude
                    val longitude = location.longitude
                    val accuracy = location.accuracy
                    // Convert m/s from Android Location.speed to km/h
                    val speed = location.speed * 3.6f
                    val bearing = location.bearing

                    sendLocationToServer(
                        latitude,
                        longitude,
                        accuracy,
                        speed,
                        bearing
                    )
                }
            }
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        when (intent?.action) {
            ACTION_STOP_TRACKING -> {
                stopLiveLocationUpdates()
                stopForeground(STOP_FOREGROUND_REMOVE)
                stopSelf()
                return START_NOT_STICKY
            }
            ACTION_START_TRACKING, null -> {
                driverId = intent?.getStringExtra(EXTRA_DRIVER_ID) ?: driverId
                busId = intent?.getStringExtra(EXTRA_BUS_ID) ?: busId
                serverUrl = intent?.getStringExtra(EXTRA_SERVER_URL) ?: serverUrl

                startForeground(NOTIFICATION_ID, buildForegroundNotification())
                connectSocketAndJoinRoom()
                startLiveLocationUpdates()
            }
        }
        return START_STICKY
    }

    private fun connectSocketAndJoinRoom() {
        try {
            socket?.disconnect()
            val options = IO.Options.builder()
                .setPath("/socket.io")
                .setReconnection(true)
                .build()

            socket = IO.socket(serverUrl, options).apply {
                on(Socket.EVENT_CONNECT) {
                    val joinPayload = JSONObject().apply {
                        put("busId", busId)
                    }
                    emit("joinBusRoom", joinPayload)
                }
                connect()
            }
        } catch (_: Exception) {
            // HTTP POST fallback in sendLocationToServer remains active
        }
    }

    @SuppressLint("MissingPermission")
    private fun startLiveLocationUpdates() {
        val locationRequest =
            LocationRequest.Builder(
                Priority.PRIORITY_HIGH_ACCURACY,
                3000L
            )
            .setMinUpdateIntervalMillis(1500L)
            .setWaitForAccurateLocation(false)
            .build()

        fusedLocationClient.requestLocationUpdates(
            locationRequest,
            locationCallback,
            Looper.getMainLooper()
        )
    }

    private fun stopLiveLocationUpdates() {
        fusedLocationClient.removeLocationUpdates(
            locationCallback
        )
        socket?.let {
            val leavePayload = JSONObject().apply {
                put("busId", busId)
            }
            it.emit("leaveBusRoom", leavePayload)
            it.disconnect()
        }
        socket = null
    }

    /**
     * Emits the real Android hardware GPS fix over Socket.IO (`driverLocationUpdate`)
     * and persists it to the ACMIS backend (`POST /api/bus/location`).
     */
    private fun sendLocationToServer(
        latitude: Double,
        longitude: Double,
        accuracy: Float,
        speed: Float,
        bearing: Float
    ) {
        val timestamp = System.currentTimeMillis()
        val payload = JSONObject().apply {
            put("driverId", driverId)
            put("busId", busId)
            put("latitude", latitude)
            put("longitude", longitude)
            put("accuracy", accuracy.toDouble())
            put("speed", speed.toDouble())
            put("bearing", bearing.toDouble())
            put("timestamp", timestamp)
        }

        // 1. Emit immediately via Socket.IO to ACMIS Node.js server (`bus:<busId>` room)
        socket?.let { s ->
            if (s.connected()) {
                s.emit("driverLocationUpdate", payload)
            }
        }

        // 2. Also persist via HTTP POST /api/bus/location for resilience
        ioExecutor.execute {
            try {
                val url = URL("$serverUrl/api/bus/location")
                val conn = (url.openConnection() as HttpURLConnection).apply {
                    requestMethod = "POST"
                    doOutput = true
                    connectTimeout = 5000
                    readTimeout = 5000
                    setRequestProperty("Content-Type", "application/json")
                    setRequestProperty("x-acims-driver-id", driverId)
                    setRequestProperty("x-acims-user-id", driverId)
                    setRequestProperty("x-acims-role", "DRIVER")
                }
                conn.outputStream.use { os ->
                    os.write(payload.toString().toByteArray(Charsets.UTF_8))
                }
                conn.responseCode
                conn.disconnect()
            } catch (_: Exception) {
                // Socket.IO reconnection handles transient drops
            }
        }
    }

    private fun buildForegroundNotification(): Notification {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "ACMIS Live Bus GPS Tracking",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Continuous real-time GPS broadcasting for ACMIS campus buses"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager?.createNotificationChannel(channel)
        }

        return NotificationCompat.Builder(this, NOTIFICATION_CHANNEL_ID)
            .setContentTitle("ACMIS Bus Tracking Active ($busId)")
            .setContentText("Streaming real GPS coordinates for $driverId")
            .setSmallIcon(android.R.drawable.ic_menu_mylocation)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .build()
    }

    override fun onDestroy() {
        stopLiveLocationUpdates()
        ioExecutor.shutdownNow()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
