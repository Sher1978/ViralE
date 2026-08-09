package com.viralengine.companion

import android.app.ActivityOptions
import android.content.Context
import android.content.Intent
import android.hardware.display.DisplayManager
import android.net.Uri
import android.os.Bundle
import android.provider.Settings
import android.view.Display
import android.widget.Button
import android.widget.EditText
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity

class MainActivity : AppCompatActivity() {

    private lateinit var editUrl: EditText
    private lateinit var btnSave: Button
    private lateinit var btnTest: Button
    private var testPresentation: CoverPresentation? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        editUrl = findViewById(R.id.editPrompterUrl)
        btnSave = findViewById(R.id.btnSaveUrl)
        btnTest = findViewById(R.id.btnTestCover)

        val prefs = getSharedPreferences("viral_companion_prefs", Context.MODE_PRIVATE)
        val currentUrl = prefs.getString("prompter_url", "https://virale.uno")
        editUrl.setText(currentUrl)

        btnSave.setOnClickListener {
            val newUrl = editUrl.text.toString().trim()
            if (newUrl.isNotEmpty()) {
                prefs.edit().putString("prompter_url", newUrl).apply()
                Toast.makeText(this, "Ссылка сохранена!", Toast.LENGTH_SHORT).show()
            }
        }

        btnTest.setOnClickListener {
            if (!Settings.canDrawOverlays(this)) {
                Toast.makeText(this, "Пожалуйста, разрешите 'Отображение поверх других окон'", Toast.LENGTH_LONG).show()
                val intent = Intent(
                    Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                    Uri.parse("package:$packageName")
                )
                startActivity(intent)
                return@setOnClickListener
            }

            val url = editUrl.text.toString().trim().ifEmpty { "https://virale.uno" }
            toggleTestCoverDisplay(url)
        }

        // Auto-check overlay permission on launch
        if (!Settings.canDrawOverlays(this)) {
            Toast.makeText(this, "Для включения экрана 180° включите 'Отображение поверх других окон'", Toast.LENGTH_LONG).show()
        }
    }

    private fun toggleTestCoverDisplay(url: String) {
        if (testPresentation?.isShowing == true) {
            testPresentation?.dismiss()
            testPresentation = null
            btnTest.text = "Тест: Включить Внешний Экран (180°)"
            Toast.makeText(this, "Тест завершен", Toast.LENGTH_SHORT).show()
            return
        }

        val displayManager = getSystemService(Context.DISPLAY_SERVICE) as DisplayManager
        val coverDisplay = findCoverDisplay(displayManager)

        if (coverDisplay != null) {
            try {
                testPresentation = CoverPresentation(this, coverDisplay, url)
                testPresentation?.show()
                btnTest.text = "Остановить Внешний Экран"
                Toast.makeText(this, "Суфлёр запущен на внешнем экране!", Toast.LENGTH_SHORT).show()
                return
            } catch (e: Exception) {
                // Fallback to Intent launch if presentation fails
            }
        }

        // Ultimate Honor Magic V2 Fallback: Direct Intent Launch on Display ID 1
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            val options = ActivityOptions.makeBasic()
            options.setLaunchDisplayId(1)
            startActivity(intent, options.toBundle())
            Toast.makeText(this, "Запуск на внешний экран (Display 1)...", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Toast.makeText(this, "Не удалось запустить на Display 1: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }

    companion object {
        fun findCoverDisplay(displayManager: DisplayManager): Display? {
            // 1. Presentation Category Displays
            val presentationDisplays = displayManager.getDisplays(DisplayManager.DISPLAY_CATEGORY_PRESENTATION)
            if (presentationDisplays.isNotEmpty()) return presentationDisplays[0]

            // 2. Any non-default display
            val otherDisplay = displayManager.displays.firstOrNull { it.displayId != Display.DEFAULT_DISPLAY }
            if (otherDisplay != null) return otherDisplay

            // 3. Honor Magic V2 specific display IDs
            return displayManager.getDisplay(1) ?: displayManager.getDisplay(2)
        }
    }
}
