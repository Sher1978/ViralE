package com.viralengine.companion

import android.content.Context
import android.hardware.display.DisplayManager
import android.os.Bundle
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
        val currentUrl = prefs.getString("prompter_url", "https://viralengine.ru")
        editUrl.setText(currentUrl)

        btnSave.setOnClickListener {
            val newUrl = editUrl.text.toString().trim()
            if (newUrl.isNotEmpty()) {
                prefs.edit().putString("prompter_url", newUrl).apply()
                Toast.makeText(this, "Ссылка сохранена!", Toast.LENGTH_SHORT).show()
            }
        }

        btnTest.setOnClickListener {
            val url = editUrl.text.toString().trim().ifEmpty { "https://viralengine.ru" }
            toggleTestCoverDisplay(url)
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
        val displays = displayManager.displays
        val coverDisplay = displays.firstOrNull { it.displayId != Display.DEFAULT_DISPLAY }

        if (coverDisplay == null) {
            Toast.makeText(this, "Внешний экран не обнаружен. Проверьте устройство.", Toast.LENGTH_LONG).show()
            return
        }

        try {
            testPresentation = CoverPresentation(this, coverDisplay, url)
            testPresentation?.show()
            btnTest.text = "Остановить Внешний Экран"
            Toast.makeText(this, "Успешно запущен на внешнем экране (180°)!", Toast.LENGTH_SHORT).show()
        } catch (e: Exception) {
            Toast.makeText(this, "Ошибка запуска: ${e.message}", Toast.LENGTH_LONG).show()
        }
    }
}
