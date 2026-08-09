package com.viralengine.companion

import android.content.Context
import android.hardware.display.DisplayManager
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
import android.view.Display
import android.widget.Toast

class FoldPrompterTileService : TileService() {

    private var currentPresentation: CoverPresentation? = null

    override fun onClick() {
        super.onClick()

        val tile = qsTile ?: return
        val isInactive = tile.state == Tile.STATE_INACTIVE || tile.state == Tile.STATE_UNAVAILABLE

        if (isInactive) {
            launchOnCoverDisplay()
        } else {
            stopCoverDisplay()
        }
    }

    private fun launchOnCoverDisplay() {
        val displayManager = getSystemService(Context.DISPLAY_SERVICE) as DisplayManager
        val displays = displayManager.displays

        // Find secondary cover display (Display ID != 0)
        val coverDisplay = displays.firstOrNull { it.displayId != Display.DEFAULT_DISPLAY }

        if (coverDisplay == null) {
            Toast.makeText(this, "Внешний экран не обнаружен на устройстве", Toast.LENGTH_LONG).show()
            return
        }

        val prefs = getSharedPreferences("viral_companion_prefs", Context.MODE_PRIVATE)
        val savedUrl = prefs.getString("prompter_url", "https://viralengine.ru") ?: "https://viralengine.ru"

        try {
            currentPresentation?.dismiss()
            currentPresentation = CoverPresentation(this, coverDisplay, savedUrl)
            currentPresentation?.show()

            qsTile?.apply {
                state = Tile.STATE_ACTIVE
                updateTile()
            }

            Toast.makeText(this, "Суфлёр запущен на внешнем экране (180°)!", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Toast.makeText(this, "Ошибка запуска: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    private fun stopCoverDisplay() {
        try {
            currentPresentation?.dismiss()
            currentPresentation = null

            qsTile?.apply {
                state = Tile.STATE_INACTIVE
                updateTile()
            }
            Toast.makeText(this, "Суфлёр на внешнем экране остановлен", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            // Ignore dismiss errors
        }
    }

    override fun onStartListening() {
        super.onStartListening()
        qsTile?.apply {
            state = if (currentPresentation?.isShowing == true) Tile.STATE_ACTIVE else Tile.STATE_INACTIVE
            updateTile()
        }
    }
}
