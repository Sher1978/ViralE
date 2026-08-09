package com.viralengine.companion

import android.app.ActivityOptions
import android.content.Context
import android.content.Intent
import android.hardware.display.DisplayManager
import android.net.Uri
import android.service.quicksettings.Tile
import android.service.quicksettings.TileService
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
        val coverDisplay = MainActivity.findCoverDisplay(displayManager)

        val prefs = getSharedPreferences("viral_companion_prefs", Context.MODE_PRIVATE)
        val savedUrl = prefs.getString("prompter_url", "https://virale.uno") ?: "https://virale.uno"

        if (coverDisplay != null) {
            try {
                currentPresentation?.dismiss()
                currentPresentation = CoverPresentation(this, coverDisplay, savedUrl)
                currentPresentation?.show()

                qsTile?.apply {
                    state = Tile.STATE_ACTIVE
                    updateTile()
                }

                Toast.makeText(this, "Суфлёр запущен на внешнем экране (180°)!", Toast.LENGTH_SHORT).show()
                return
            } catch (e: Exception) {
                // Fallback to Intent launch
            }
        }

        // Direct Intent fallback targeting Display 1 on Honor MagicOS
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(savedUrl))
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            val options = ActivityOptions.makeBasic()
            options.setLaunchDisplayId(1)
            startActivity(intent, options.toBundle())

            qsTile?.apply {
                state = Tile.STATE_ACTIVE
                updateTile()
            }

            Toast.makeText(this, "Суфлёр запущен на Display 1!", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Toast.makeText(this, "Не удалось запустить суфлёр: ${e.message}", Toast.LENGTH_LONG).show()
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
