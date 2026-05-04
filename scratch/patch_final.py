import codecs
import os

path = r'c:\Sher_AI_Studio\projects\ViralEngine\src\app\[locale]\app\(main)\projects\new\delivery\page.tsx'

def patch():
    if not os.path.exists(path):
        print("File not found")
        return

    with codecs.open(path, 'r', 'utf-8') as f:
        content = f.read()

    # 1. Fix broken subtitle filter line
    # We look for the broken pattern we saw in view_file
    # It was: subtitles='subtitles=./subs.srt'
    bad_sub = "subtitles='subtitles=./subs.srt'"
    good_sub = "subtitles=./subs.srt"
    content = content.replace(bad_sub, good_sub)

    # 2. Add Magic Button
    magic_btn = """{(!distributionAssets && !isLaunchingRender) && (
        <div className="p-8 rounded-3xl bg-purple-500/5 border border-dashed border-purple-500/20 text-center space-y-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto">
            <ImageIcon className="text-purple-400" size={32} />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-black uppercase text-white">Ассеты дистрибуции не готовы</h3>
            <p className="text-[10px] text-white/40 uppercase tracking-widest">Нажмите кнопку ниже для генерации всего пакета</p>
          </div>
          <button 
            onClick={async () => { 
              setRenderStatus("Генерация ассетов...");
              const res = await fetch("/api/ai/distribution-assets", { 
                method: "POST", 
                body: JSON.stringify({ scriptText: scriptData.meat, projectId, locale }) 
              });
              const assets = await res.json();
              if (assets && !assets.error) {
                await projectService.updateLatestVersionManifest(projectId, { ...manifest, distributionAssets: assets });
                setVersion(prev => (prev ? { ...prev, script_data: { ...prev.script_data, distributionAssets: assets } } : prev) as any);
              }
            }}
            className="px-6 py-3 rounded-xl bg-purple-500 text-white text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all"
          >
            Сгенерировать пакет (AI)
          </button>
        </div>
      )}{TEXT_OUTPUTS.map((output) => ("""
      
    if "{TEXT_OUTPUTS.map" in content and "Сгенерировать пакет" not in content:
        content = content.replace("{TEXT_OUTPUTS.map((output) => (", magic_btn)

    with codecs.open(path, 'w', 'utf-8') as f:
        f.write(content)
    print("Patch applied")

if __name__ == "__main__":
    patch()
