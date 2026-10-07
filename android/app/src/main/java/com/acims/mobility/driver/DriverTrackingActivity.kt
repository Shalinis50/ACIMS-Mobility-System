package com.acims.mobility.driver

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import com.acims.mobility.location.DriverLocationForegroundService
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationServices
import com.google.android.gms.maps.CameraUpdateFactory
import com.google.android.gms.maps.GoogleMap
import com.google.android.gms.maps.MapsApiSettings
import com.google.android.gms.maps.OnMapReadyCallback
import com.google.android.gms.maps.model.LatLng

/**
 * ACMIS Driver Activity
 *
 * Requests runtime location permissions (`ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `POST_NOTIFICATIONS`),
 * uses `fusedLocationClient.lastLocation` ONLY for initial map camera positioning,
 * and starts/stops `DriverLocationForegroundService` for continuous real-time GPS streaming.
 */
class DriverTrackingActivity : AppCompatActivity(), OnMapReadyCallback {

    private lateinit var fusedLocationClient: FusedLocationProviderClient
    private var googleMap: GoogleMap? = null

    private var driverId: String = "driver-arun"
    private var busId: String = "bus-12"
    private var serverUrl: String = "http://10.0.2.2:3000"

    companion object {
        private const val LOCATION_PERMISSION_REQUEST_CODE = 2001
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        MapsApiSettings.addInternalUsageAttributionId(this, "gmp_mcp_codeassist_v1_aistudio")

        fusedLocationClient =
            LocationServices.getFusedLocationProviderClient(this)

        driverId = intent.getStringExtra("driverId") ?: driverId
        busId = intent.getStringExtra("busId") ?: busId
        serverUrl = intent.getStringExtra("serverUrl") ?: serverUrl
    }

    override fun onMapReady(map: GoogleMap) {
        googleMap = map
        if (hasLocationPermissions()) {
            positionCameraWithInitialLastLocation()
        } else {
            requestRequiredPermissions()
        }
    }

    /**
     * Note: `lastLocation` is used strictly once to initially position the driver's map camera.
     * Continuous live tracking is performed via `LocationRequest` + `LocationCallback` in
     * `DriverLocationForegroundService`.
     */
    @SuppressLint("MissingPermission")
    private fun positionCameraWithInitialLastLocation() {
        googleMap?.isMyLocationEnabled = true
        fusedLocationClient.lastLocation.addOnSuccessListener { location ->
            if (location != null) {
                val initialLatLng = LatLng(location.latitude, location.longitude)
                googleMap?.moveCamera(CameraUpdateFactory.newLatLngZoom(initialLatLng, 16f))
            }
        }
    }

    fun startDriverTrip(selectedBusId: String = busId, currentDriverId: String = driverId) {
        busId = selectedBusId
        driverId = currentDriverId

        if (!hasLocationPermissions()) {
            requestRequiredPermissions()
            return
        }

        val serviceIntent = Intent(this, DriverLocationForegroundService::class.java).apply {
            action = DriverLocationForegroundService.ACTION_START_TRACKING
            putExtra(DriverLocationForegroundService.EXTRA_DRIVER_ID, driverId)
            putExtra(DriverLocationForegroundService.EXTRA_BUS_ID, busId)
            putExtra(DriverLocationForegroundService.EXTRA_SERVER_URL, serverUrl)
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            ContextCompat.startForegroundService(this, serviceIntent)
        } else {
            startService(serviceIntent)
        }
    }

    fun stopDriverTrip() {
        val stopIntent = Intent(this, DriverLocationForegroundService::class.java).apply {
            action = DriverLocationForegroundService.ACTION_STOP_TRACKING
        }
        startService(stopIntent)
    }

    private fun hasLocationPermissions(): Boolean {
        val fineGranted = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.ACCESS_FINE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        val coarseGranted = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.ACCESS_COARSE_LOCATION
        ) == PackageManager.PERMISSION_GRANTED
        return fineGranted && coarseGranted
    }

    private fun requestRequiredPermissions() {
        val permissions = mutableListOf(
            Manifest.permission.ACCESS_FINE_LOCATION,
            Manifest.permission.ACCESS_COARSE_LOCATION
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            permissions.add(Manifest.permission.POST_NOTIFICATIONS)
        }
        ActivityCompat.requestPermissions(
            this,
            permissions.toTypedArray(),
            LOCATION_PERMISSION_REQUEST_CODE
        )
    }

    override fun onRequestPermissionsResult(
        requestCode: Int,
        permissions: Array<out String>,
        grantResults: IntArray
    ) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode == LOCATION_PERMISSION_REQUEST_CODE && hasLocationPermissions()) {
            positionCameraWithInitialLastLocation()
            startDriverTrip(busId, driverId)
        }
    }
}
