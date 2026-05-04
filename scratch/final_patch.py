import codecs
import os

path = r'c:\Sher_AI_Studio\projects\ViralEngine\src\app\[locale]\app\(main)\projects\new\delivery\page.tsx'

def patch():
    if not os.path.exists(path):
        print("File not found")
        return

    with codecs.open(path, 'r', 'utf-8') as f:
        content = f.read()

    # 1. Add Polling Logic
    poll_code = """  useEffect(() => {
    let pollInterval;
    if (projectId && !distributionAssets) {
      pollInterval = setInterval(async () => {
        const ver = await projectService.getLatestVersion(projectId);
        if (ver?.script_data?.distributionAssets) {
          setVersion(ver);
          clearInterval(pollInterval);
        }
      }, 5000);
    }
    return () => clearInterval(pollInterval);
  }, [projectId, !!distributionAssets]);

  useEffect(() => {"""
    
    if "pollInterval" not in content:
        content = content.replace("useEffect(() => {", poll_code, 1)

    # 2. Add Magic Button for Assets
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
      
    if "Сгенерировать пакет" not in content:
        content = content.replace("{TEXT_OUTPUTS.map((output) => (", magic_btn)

    # 3. Subtitle Fix
    content = content.replace("subtitles=subs.srt", "subtitles='./subs.srt'")

    with codecs.open(path, 'w', 'utf-8') as f:
        f.write(content)
    print("All fixes applied successfully")

if __name__ == "__main__":
    patch()
