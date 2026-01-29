import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, Play, Pause, Settings } from 'lucide-react';

const SVGtoGIFConverter = () => {
  const [svgCode, setSvgCode] = useState('');
  const [isPlaying, setIsPlaying] = useState(true);
  const [gifDataUrl, setGifDataUrl] = useState(null);
  const [isConverting, setIsConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [settings, setSettings] = useState({
    width: 400,
    height: 400,
    duration: 3,
    fps: 20
  });
  const [showSettings, setShowSettings] = useState(false);
  const previewRef = useRef(null);

  const sampleSVG = `<svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
  <circle cx="100" cy="100" r="40" fill="#3b82f6">
    <animate attributeName="r" values="40;60;40" dur="2s" repeatCount="indefinite"/>
    <animate attributeName="fill" values="#3b82f6;#8b5cf6;#3b82f6" dur="2s" repeatCount="indefinite"/>
  </circle>
  <rect x="70" y="70" width="60" height="60" fill="none" stroke="#ec4899" stroke-width="2">
    <animateTransform attributeName="transform" type="rotate" from="0 100 100" to="360 100 100" dur="3s" repeatCount="indefinite"/>
  </rect>
</svg>`;

  useEffect(() => {
    setSvgCode(sampleSVG);
  }, []);

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSvgCode(event.target.result);
        setGifDataUrl(null);
      };
      reader.readAsText(file);
    }
  };

  const createImageFromSVG = (svgData, width, height) => {
    return new Promise((resolve, reject) => {
      const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img);
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('SVG画像の読み込みに失敗'));
      };
      
      img.src = url;
    });
  };

  const convertToGIF = async () => {
    setIsConverting(true);
    setGifDataUrl(null);
    setProgress(0);
    setProgressText('準備中...');

    try {
      // gif.jsを動的に読み込み
      if (!window.GIF) {
        setProgressText('GIFライブラリを読み込み中...');
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/gif.js@0.2.0/dist/gif.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      setProgressText('フレームをキャプチャ中...');

      // 録画用コンテナを作成
      const container = document.createElement('div');
      container.style.position = 'fixed';
      container.style.left = '50%';
      container.style.top = '50%';
      container.style.transform = 'translate(-50%, -50%)';
      container.style.width = settings.width + 'px';
      container.style.height = settings.height + 'px';
      container.style.background = 'white';
      container.style.zIndex = '10000';
      container.style.border = '4px solid #667eea';
      container.style.boxShadow = '0 20px 60px rgba(0,0,0,0.5)';
      container.style.borderRadius = '12px';
      container.style.padding = '10px';
      container.innerHTML = svgCode;
      document.body.appendChild(container);

      const svgElement = container.querySelector('svg');
      if (!svgElement) {
        throw new Error('有効なSVG要素が見つかりません');
      }

      svgElement.setAttribute('width', settings.width);
      svgElement.setAttribute('height', settings.height);

      // Canvas作成
      const canvas = document.createElement('canvas');
      canvas.width = settings.width;
      canvas.height = settings.height;
      const ctx = canvas.getContext('2d');

      // GIF作成（Worker無し）
      const gif = new window.GIF({
        workers: 0,
        quality: 10,
        width: settings.width,
        height: settings.height
      });

      const totalFrames = Math.floor(settings.duration * settings.fps);
      const frameDelay = 1000 / settings.fps;

      // 少し待ってから開始
      await new Promise(resolve => setTimeout(resolve, 100));

      // 各フレームをキャプチャ
      for (let i = 0; i < totalFrames; i++) {
        const startTime = Date.now();

        // SVGを画像化
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const img = await createImageFromSVG(svgData, settings.width, settings.height);
        
        ctx.clearRect(0, 0, settings.width, settings.height);
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, settings.width, settings.height);
        ctx.drawImage(img, 0, 0, settings.width, settings.height);
        
        gif.addFrame(ctx, { copy: true, delay: frameDelay });

        setProgress(Math.floor((i + 1) / totalFrames * 70));

        // 次のフレームまで待機
        const elapsed = Date.now() - startTime;
        const waitTime = Math.max(0, frameDelay - elapsed);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      document.body.removeChild(container);

      setProgressText('GIFをエンコード中...');
      setProgress(75);

      // GIF生成
      gif.on('finished', (blob) => {
        const url = URL.createObjectURL(blob);
        setGifDataUrl(url);
        setProgress(100);
        setIsConverting(false);
        setProgressText('');
      });

      gif.render();

    } catch (error) {
      console.error('変換エラー:', error);
      alert(`エラー: ${error.message}`);
      setIsConverting(false);
      setProgressText('');
    }
  };

  const downloadGIF = () => {
    if (gifDataUrl) {
      const a = document.createElement('a');
      a.href = gifDataUrl;
      a.download = 'animation.gif';
      a.click();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-white mb-8 text-center">
          🎨 SVG → GIF コンバーター
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* SVGエディタ */}
          <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-4 flex justify-between items-center">
              <h2 className="text-white font-semibold text-lg">SVGコード</h2>
              <label className="cursor-pointer bg-white text-purple-600 px-4 py-2 rounded-lg hover:bg-purple-50 transition flex items-center gap-2">
                <Upload size={18} />
                <span className="text-sm">アップロード</span>
                <input
                  type="file"
                  accept=".svg"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
            <textarea
              value={svgCode}
              onChange={(e) => {
                setSvgCode(e.target.value);
                setGifDataUrl(null);
              }}
              className="w-full h-96 p-4 font-mono text-sm resize-none focus:outline-none"
              placeholder="SVGコードを貼り付けてください..."
            />
          </div>

          {/* プレビュー */}
          <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-4 flex justify-between items-center">
              <h2 className="text-white font-semibold text-lg">プレビュー</h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="bg-white text-purple-600 p-2 rounded-lg hover:bg-purple-50 transition"
                >
                  <Settings size={18} />
                </button>
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="bg-white text-purple-600 p-2 rounded-lg hover:bg-purple-50 transition"
                >
                  {isPlaying ? <Pause size={18} /> : <Play size={18} />}
                </button>
              </div>
            </div>

            {showSettings && (
              <div className="bg-gray-50 p-4 border-b">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-700">幅 (px)</label>
                    <input
                      type="number"
                      value={settings.width}
                      onChange={(e) => setSettings({...settings, width: parseInt(e.target.value)})}
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700">高さ (px)</label>
                    <input
                      type="number"
                      value={settings.height}
                      onChange={(e) => setSettings({...settings, height: parseInt(e.target.value)})}
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700">長さ (秒)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={settings.duration}
                      onChange={(e) => setSettings({...settings, duration: parseFloat(e.target.value)})}
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-700">FPS</label>
                    <input
                      type="number"
                      min="10"
                      max="60"
                      value={settings.fps}
                      onChange={(e) => setSettings({...settings, fps: parseInt(e.target.value)})}
                      className="w-full px-2 py-1 border rounded text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="p-8 bg-gray-100 flex items-center justify-center min-h-96">
              {svgCode && isPlaying ? (
                <div
                  ref={previewRef}
                  className="bg-white rounded-lg shadow-lg p-4"
                  style={{ maxWidth: settings.width, maxHeight: settings.height }}
                  dangerouslySetInnerHTML={{ __html: svgCode }}
                />
              ) : (
                <div className="text-gray-400">プレビュー停止中</div>
              )}
            </div>
          </div>
        </div>

        {/* 変換エリア */}
        <div className="bg-white rounded-lg shadow-2xl p-6">
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={convertToGIF}
              disabled={isConverting || !svgCode}
              className="bg-gradient-to-r from-blue-500 to-purple-500 text-white px-8 py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isConverting ? `変換中... ${progress}%` : '🎬 GIFに変換'}
            </button>

            {isConverting && (
              <div className="w-full max-w-md">
                <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-600 mt-2 text-center">{progressText}</p>
              </div>
            )}

            {gifDataUrl && (
              <div className="flex flex-col items-center gap-4 mt-4">
                <h3 className="text-lg font-semibold text-gray-800">✨ 生成されたGIF</h3>
                <img src={gifDataUrl} alt="Generated GIF" className="border-4 border-purple-200 rounded-lg max-w-full" />
                <button
                  onClick={downloadGIF}
                  className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 transition flex items-center gap-2"
                >
                  <Download size={18} />
                  ダウンロード
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SVGtoGIFConverter;