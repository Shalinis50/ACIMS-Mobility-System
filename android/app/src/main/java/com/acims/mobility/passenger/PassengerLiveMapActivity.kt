package com.acims.mobility.passenger

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.MapsApiSettings
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.model.LatLng
import com.google.android.gms.maps.model.Marker
import com.google.android.gms.maps.model.MarkerOptions
import io.socket.client.IO
import io.socket.client.Socket
import org.json.JSONObject

/**
 * ACMIS Passenger Live Bus Map Activity
 *
 * Joins the bus-specific Socket.IO room (`joinBusRoom` -> `bus:<busId>`),
 * receives real-time `busLocationUpdate` events from the ACMIS Node.js server,
 * and continuously updates a single persistent Google Maps marker (`busMarker`)
 * without recreating markers on every GPS tick.
 */
class PassengerLiveMapActivity : AppCompatActivity(), OnMapReadyCallback {

    private var googleMap: GoogleMap? = null
    private var busMarker: Marker? = null
    private var socket: Socket? = null

    private var busId: String = "bus-12"
    private var serverUrl: String = "http://10.0.2.2:3000"

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        MapsApiSettings.addInternalUsageAttributionId(this, "gmp_mcp_codeassist_v1_aistudio")

        busId = intent.getStringExtra("busId") ?: busId
        serverUrl = intent.getStringExtra("serverUrl") ?: serverUrl
    }

    override fun onMapReady(map: GoogleMap) {
        googleMap = map
        connectToBusRoom(busId)
    }

    fun switchBusRoom(nextBusId: String) {
        socket?.emit("leaveBusRoom", JSONObject().put("busId", busId))
        busId = nextBusId
        busMarker?.remove()
        busMarker = null
        socket?.emit("joinBusRoom", JSONObject().put("busId", busId))
    }

    private fun connectToBusRoom(targetBusId: String) {
        socket?.disconnect()
        val options = IO.Options.builder()
            .setPath("/socket.io")
            .setReconnection(true)
            .build()

        socket = IO.socket(serverUrl, options).apply {
            on(Socket.EVENT_CONNECT) {
                val joinPayload = JSONObject().apply {
                    put("busId", targetBusId)
                }
                emit("joinBusRoom", joinPayload)
            }

            on("busLocationUpdate") { args ->
                if (args.isNotEmpty()) {
                    val data = args[0] as? JSONObject ?: return@on
                    handleBusLocationUpdate(data)
                }
            }

            connect()
        }
    }

    private fun handleBusLocationUpdate(data: JSONObject) {
        val incomingBusId = data.optString("busId", busId)
        if (incomingBusId != busId) return

        val latitude = data.optDouble("latitude", Double.NaN)
        val longitude = data.optDouble("longitude", Double.NaN)
        if (latitude.isNaN() || longitude.isNaN()) return

        val bearing = data.optDouble("bearing", data.optDouble("heading", 0.0)).toFloat()
        val busNumber = data.optString("busNumber", busId.removePrefix("bus-"))
        val newLatLng = LatLng(latitude, longitude)

        runOnUiThread {
            val map = googleMap ?: return@runOnUiThread
            if (busMarker == null) {
                busMarker = map.addMarker(
                    MarkerOptions()
                        .position(newLatLng)
                        .title("Bus #$busNumber")
                        .rotation(bearing)
                        .flat(true)
                )
                map.animateCamera(CameraUpdateFactory.newLatLngZoom(newLatLng, 16f))
            } else {
                busMarker?.position = newLatLng
                busMarker?.rotation = bearing
                map.animateCamera(CameraUpdateFactory.newLatLng(newLatLng))
            }
        }
    }

    override fun onDestroy() {
        socket?.let {
            it.emit("leaveBusRoom", JSONObject().put("busId", busId))
            it.disconnect()
        }
        socket = null
        super.onDestroy()
    }
}
