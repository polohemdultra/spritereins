import React, { useState, useCallback } from 'react';
import { Canvas } from './components/Canvas';
import { LayerToolbar } from './components/LayerToolbar';
import { ToolsToolbar } from './components/ToolsToolbar';
import { ColorPicker } from './components/ColorPicker';
import { EditorState, LayerData, Tool, Selection } from './types';
import { saveAs } from 'file-saver';
import { Undo2, Redo2, SunMoon } from 'lucide-react';

const GRID_SIZE = 32;

const createEmptyPixels = (width: number, height: number) =>
  Array(height).fill(null).map(() => Array(width).fill(''));

const hexToRgb = (hex: string) => {
  let s = hex.slice(1);
  if (s.length === 3) s = s.split('').map(c => c + c).join('');
  return {
    r: parseInt(s.slice(0, 2), 16),
    g: parseInt(s.slice(2, 4), 16),
    b: parseInt(s.slice(4, 6), 16)
  };
};

const rgbToHex = (r: number, g: number, b: number) => {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${clamp(r).toString(16).padStart(2, '0')}${clamp(g).toString(16).padStart(2, '0')}${clamp(b).toString(16).padStart(2, '0')}`;
};

const BAYER_4X4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5]
].map(row => row.map(v => (v / 16) - 0.5));

const initialLayer = (width: number, height: number): LayerData => ({
  id: 'layer-1',
  name: 'Frame 1',
  pixels: createEmptyPixels(width, height),
  visible: true,
  opacity: 1
});

interface HistorySnapshot {
  layers: LayerData[];
  width: number;
  height: number;
}

export default function App() {
  const [state, setState] = useState<EditorState>({
    width: 32,
    height: 32,
    layers: [initialLayer(32, 32)],
    currentLayerIndex: 0,
    currentColor: '#000000',
    currentTool: 'pencil',
    showOnionPrev: true,
    showOnionNext: false,
    zoom: 1,
    isDarkBackground: false,
    wandTolerance: 20
  });

  const [history, setHistory] = useState<HistorySnapshot[]>([]);
  const [future, setFuture] = useState<HistorySnapshot[]>([]);

  const pushToHistory = useCallback(() => {
    setHistory(prev => [...prev.slice(-29), {
      layers: state.layers,
      width: state.width,
      height: state.height
    }]);
    setFuture([]);
  }, [state.layers, state.width, state.height]);

  const undo = useCallback(() => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    setFuture(prev => [{
      layers: state.layers,
      width: state.width,
      height: state.height
    }, ...prev]);
    setHistory(prev => prev.slice(0, -1));
    setState(s => ({
      ...s,
      layers: previous.layers,
      width: previous.width,
      height: previous.height
    }));
  }, [history, state.layers, state.width, state.height]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    setHistory(prev => [...prev, {
      layers: state.layers,
      width: state.width,
      height: state.height
    }]);
    setFuture(prev => prev.slice(1));
    setState(s => ({
      ...s,
      layers: next.layers,
      width: next.width,
      height: next.height
    }));
  }, [future, state.layers, state.width, state.height]);

  const commitSelection = useCallback(() => {
    setState(prev => {
      if (!prev.selection?.active) return prev;
      
      const { x, y, width, height, pixels } = prev.selection;
      const newLayers = [...prev.layers];
      const currentLayer = { ...newLayers[prev.currentLayerIndex] };
      const newPixels = currentLayer.pixels.map(row => [...row]);

      for (let j = 0; j < height; j++) {
        for (let i = 0; i < width; i++) {
          const targetX = x + i;
          const targetY = y + j;
          if (targetX >= 0 && targetX < prev.width && targetY >= 0 && targetY < prev.height) {
            const color = pixels[j][i];
            if (color) { // Only overwrite color if selected pixel is NOT transparent
              newPixels[targetY][targetX] = color;
            }
          }
        }
      }
      
      // Save history when dropping selection
      setHistory(h => [...h.slice(-29), {
        layers: prev.layers,
        width: prev.width,
        height: prev.height
      }]);
      setFuture([]);

      newLayers[prev.currentLayerIndex] = { ...currentLayer, pixels: newPixels };
      return { ...prev, layers: newLayers, selection: undefined };
    });
  }, []);

  const selectWand = useCallback((x: number, y: number) => {
    setState(prev => {
      if (prev.selection?.active) {
        // commit first? or just replace? Usually replace
      }
      
      const currentLayer = prev.layers[prev.currentLayerIndex];
      const startColor = currentLayer.pixels[y][x];
      const targetRgb = startColor ? hexToRgb(startColor) : null;
      
      const visited = new Set<string>();
      const queue: [number, number][] = [[x, y]];
      const selectedCoords: [number, number][] = [];
      
      while (queue.length > 0) {
        const [cx, cy] = queue.shift()!;
        const key = `${cx},${cy}`;
        if (visited.has(key)) continue;
        visited.add(key);
        
        const currentColor = currentLayer.pixels[cy][cx];
        let isSimilar = false;
        
        if (!startColor && !currentColor) {
          isSimilar = true;
        } else if (startColor && currentColor) {
          const cRgb = hexToRgb(currentColor);
          if (targetRgb) {
            const diff = Math.sqrt(
              Math.pow(targetRgb.r - cRgb.r, 2) +
              Math.pow(targetRgb.g - cRgb.g, 2) +
              Math.pow(targetRgb.b - cRgb.b, 2)
            );
            if (diff <= prev.wandTolerance) isSimilar = true;
          }
        }
        
        if (isSimilar) {
          selectedCoords.push([cx, cy]);
          const neighbors: [number, number][] = [[cx-1, cy], [cx+1, cy], [cx, cy-1], [cx, cy+1]];
          for (const [nx, ny] of neighbors) {
            if (nx >= 0 && nx < prev.width && ny >= 0 && ny < prev.height) {
              queue.push([nx, ny]);
            }
          }
        }
      }
      
      if (selectedCoords.length === 0) return prev;
      
      const minX = Math.min(...selectedCoords.map(c => c[0]));
      const maxX = Math.max(...selectedCoords.map(c => c[0]));
      const minY = Math.min(...selectedCoords.map(c => c[1]));
      const maxY = Math.max(...selectedCoords.map(c => c[1]));
      
      const w = maxX - minX + 1;
      const h = maxY - minY + 1;
      
      const selectionPixels = createEmptyPixels(w, h);
      const newLayers = [...prev.layers];
      const newPixels = currentLayer.pixels.map(row => [...row]);
      
      selectedCoords.forEach(([cx, cy]) => {
        selectionPixels[cy - minY][cx - minX] = currentLayer.pixels[cy][cx];
        newPixels[cy][cx] = ''; // Extract
      });
      
      newLayers[prev.currentLayerIndex] = { ...currentLayer, pixels: newPixels };
      
      return {
        ...prev,
        layers: newLayers,
        selection: {
          x: minX,
          y: minY,
          width: w,
          height: h,
          pixels: selectionPixels,
          active: true
        }
      };
    });
  }, []);

  const updatePixels = useCallback((newPixels: string[][], isFinal: boolean = false) => {
    if (isFinal) {
      pushToHistory();
    }
    setState(prev => {
      const newLayers = [...prev.layers];
      newLayers[prev.currentLayerIndex] = {
        ...newLayers[prev.currentLayerIndex],
        pixels: newPixels
      };
      return { ...prev, layers: newLayers };
    });
  }, [state.layers, pushToHistory]);

  const addLayer = () => {
    pushToHistory();
    setState(prev => {
      const newLayer: LayerData = {
        id: `layer-${Date.now()}`,
        name: `Frame ${prev.layers.length + 1}`,
        pixels: createEmptyPixels(prev.width, prev.height),
        visible: true,
        opacity: 1
      };
      return {
        ...prev,
        layers: [...prev.layers, newLayer],
        currentLayerIndex: prev.layers.length
      };
    });
  };

  const duplicateLayer = () => {
    pushToHistory();
    setState(prev => {
      const current = prev.layers[prev.currentLayerIndex];
      const newLayer: LayerData = {
        ...current,
        id: `layer-${Date.now()}`,
        name: `${current.name} Copy`
      };
      const newLayers = [...prev.layers];
      newLayers.splice(prev.currentLayerIndex + 1, 0, newLayer);
      return {
        ...prev,
        layers: newLayers,
        currentLayerIndex: prev.currentLayerIndex + 1
      };
    });
  };

  const deleteLayer = () => {
    if (state.layers.length <= 1) return;
    pushToHistory();
    setState(prev => {
      const newLayers = prev.layers.filter((_, i) => i !== prev.currentLayerIndex);
      return {
        ...prev,
        layers: newLayers,
        currentLayerIndex: Math.max(0, prev.currentLayerIndex - 1)
      };
    });
  };

  const applyEffect = (effect: string, params: any = {}) => {
    pushToHistory();
    setState(prev => {
      const newLayers = [...prev.layers];
      const current = { ...newLayers[prev.currentLayerIndex] };
      let newPixels = current.pixels.map(row => [...row]);

      switch (effect) {
        case 'flip-h':
          newPixels = newPixels.map(row => [...row].reverse());
          break;
        case 'flip-v':
          newPixels = [...newPixels].reverse();
          break;
        case 'clear':
          newPixels = createEmptyPixels(prev.width, prev.height);
          break;
        case 'invert':
          newPixels = newPixels.map(row =>
            row.map(color => {
              if (!color) return '';
              const { r, g, b } = hexToRgb(color);
              return rgbToHex(255 - r, 255 - g, 255 - b);
            })
          );
          break;
        case 'noise':
          const amount = params.amount || 30;
          const type = params.type || 'color';
          const size = params.size || 1;
          const range = (amount / 100) * 255;
          
          for (let y = 0; y < prev.height; y += size) {
            for (let x = 0; x < prev.width; x += size) {
              const rand = Math.random();
              
              // Determine noise value for this block
              let nr = (Math.random() - 0.5) * range;
              let ng = (Math.random() - 0.5) * range;
              let nb = (Math.random() - 0.5) * range;
              let monoNoise = (Math.random() - 0.5) * range;
              
              for (let blockY = 0; blockY < size && y + blockY < prev.height; blockY++) {
                for (let blockX = 0; blockX < size && x + blockX < prev.width; blockX++) {
                  const color = newPixels[y + blockY][x + blockX];
                  if (!color) continue;
                  
                  const { r, g, b } = hexToRgb(color);
                  const n = (v: number, val: number) => Math.max(0, Math.min(255, Math.round(v + val)));

                  if (type === 'salt') {
                    if (rand < (amount / 400)) newPixels[y + blockY][x + blockX] = '#ffffff';
                    else if (rand > 1 - (amount / 400)) newPixels[y + blockY][x + blockX] = '#000000';
                  } else if (type === 'mono') {
                    newPixels[y + blockY][x + blockX] = rgbToHex(n(r, monoNoise), n(g, monoNoise), n(b, monoNoise));
                  } else {
                    newPixels[y + blockY][x + blockX] = rgbToHex(n(r, nr), n(g, ng), n(b, nb));
                  }
                }
              }
            }
          }
          break;
        case 'quantize':
          const steps = params.steps || 4;
          const stepSize = 255 / (steps - 1);
          newPixels = newPixels.map(row =>
            row.map(color => {
              if (!color) return '';
              const { r, g, b } = hexToRgb(color);
              const q = (v: number) => Math.round(v / stepSize) * stepSize;
              return rgbToHex(q(r), q(g), q(b));
            })
          );
          break;
        case 'dither-bayer':
          const bayerStrength = params.strength || 1;
          newPixels = newPixels.map((row, y) =>
            row.map((color, x) => {
              if (!color) return '';
              const { r, g, b } = hexToRgb(color);
              const threshold = BAYER_4X4[y % 4][x % 4] * 32 * bayerStrength;
              const qd = (v: number) => {
                const step = 85;
                const level = Math.floor((v + threshold) / step);
                return Math.min(255, level * step);
              };
              return rgbToHex(qd(r), qd(g), qd(b));
            })
          );
          break;
        case 'dither-random':
          const randomStrength = params.strength || 1;
          newPixels = newPixels.map(row =>
            row.map(color => {
              if (!color) return '';
              const { r, g, b } = hexToRgb(color);
              const noise = (Math.random() - 0.5) * 64 * randomStrength;
              const qd = (v: number) => {
                const step = 85;
                const level = Math.round((v + noise) / step);
                return Math.max(0, Math.min(3, level)) * step;
              };
              return rgbToHex(qd(r), qd(g), qd(b));
            })
          );
          break;
      }

      newLayers[prev.currentLayerIndex] = { ...current, pixels: newPixels };
      return { ...prev, layers: newLayers };
    });
  };

  const resizeCanvas = (newWidth: number, newHeight: number) => {
    pushToHistory();
    setState(prev => {
      const newLayers = prev.layers.map(layer => {
        const newPixels = createEmptyPixels(newWidth, newHeight);
        // Copy old pixels if they fit
        for (let y = 0; y < Math.min(prev.height, newHeight); y++) {
          for (let x = 0; x < Math.min(prev.width, newWidth); x++) {
            newPixels[y][x] = layer.pixels[y][x];
          }
        }
        return { ...layer, pixels: newPixels };
      });
      return { ...prev, width: newWidth, height: newHeight, layers: newLayers };
    });
  };

  const exportPng = (scale: number = 1) => {
    const canvas = document.createElement('canvas');
    canvas.width = state.width * scale;
    canvas.height = state.height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    const currentPixels = state.layers[state.currentLayerIndex].pixels;
    for (let y = 0; y < state.height; y++) {
      for (let x = 0; x < state.width; x++) {
        if (currentPixels[y][x]) {
          ctx.fillStyle = currentPixels[y][x];
          ctx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }

    canvas.toBlob((blob) => {
      if (blob) saveAs(blob, `sprite-frame-${state.currentLayerIndex + 1}-x${scale}.png`);
    });
  };

  const exportSheet = (scale: number = 1) => {
    const frameCount = state.layers.length;
    const canvas = document.createElement('canvas');
    canvas.width = state.width * frameCount * scale;
    canvas.height = state.height * scale;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    state.layers.forEach((layer, index) => {
      const offsetX = index * state.width * scale;
      for (let y = 0; y < state.height; y++) {
        for (let x = 0; x < state.width; x++) {
          if (layer.pixels[y][x]) {
            ctx.fillStyle = layer.pixels[y][x];
            ctx.fillRect(offsetX + (x * scale), y * scale, scale, scale);
          }
        }
      }
    });

    canvas.toBlob((blob) => {
      if (blob) saveAs(blob, `spritesheet-${state.width}x${state.height}-x${scale}.png`);
    });
  };

  const importPng = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = state.width;
        canvas.height = state.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Disable smoothing for sharp pixel imports
        ctx.imageSmoothingEnabled = false;

        // Auto-fit Logic: Draw image to fill the canvas
        ctx.drawImage(img, 0, 0, state.width, state.height);
        
        const imageData = ctx.getImageData(0, 0, state.width, state.height);
        const newPixels = createEmptyPixels(state.width, state.height);

        for (let y = 0; y < state.height; y++) {
          for (let x = 0; x < state.width; x++) {
            const i = (y * state.width + x) * 4;
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            const a = imageData.data[i + 3];

            if (a > 128) { // Threshold for transparency
              newPixels[y][x] = rgbToHex(r, g, b);
            } else {
              newPixels[y][x] = '';
            }
          }
        }

        pushToHistory();
        setState(prev => {
          const newLayers = [...prev.layers];
          newLayers[prev.currentLayerIndex] = {
            ...newLayers[prev.currentLayerIndex],
            pixels: newPixels
          };
          return { ...prev, layers: newLayers };
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="h-screen w-full flex flex-col items-center bg-white px-0 py-4 overflow-hidden">
      <div className="flex flex-col items-center w-full pt-4 h-full overflow-hidden">
        {/* Top Tool Bar */}
        <div className="w-[307px] flex justify-between items-center mb-1 px-1">
          <div className="flex items-center gap-2">
            <ColorPicker
              currentColor={state.currentColor}
              setColor={(color: string) => setState(s => ({ ...s, currentColor: color }))}
            />
            <span className="text-[10px] uppercase font-bold opacity-50 tabular-nums">
              {state.currentColor.toUpperCase()}
            </span>
          </div>
          
          <div className="flex gap-3">
            <button
              title="Toggle Background Theme"
              onClick={() => setState(s => ({ ...s, isDarkBackground: !s.isDarkBackground }))}
              className="p-1 hover:bg-gray-100 active:bg-gray-200"
            >
              <SunMoon size={16} />
            </button>
            <button
              title="Undo"
              onClick={undo}
              disabled={history.length === 0}
              className="p-1 disabled:opacity-20 disabled:cursor-not-allowed hover:bg-gray-100 active:bg-gray-200"
            >
              <Undo2 size={16} />
            </button>
            <button
              title="Redo"
              onClick={redo}
              disabled={future.length === 0}
              className="p-1 disabled:opacity-20 disabled:cursor-not-allowed hover:bg-gray-100 active:bg-gray-200"
            >
              <Redo2 size={16} />
            </button>
          </div>
        </div>

        <Canvas
          state={state}
          updatePixels={updatePixels}
          commitSelection={commitSelection}
          setColor={(color) => setState(s => ({ ...s, currentColor: color }))}
          setSelection={(selection) => setState(s => ({ ...s, selection }))}
          selectWand={selectWand}
        />

        <div className="w-full flex-1 flex flex-col items-center overflow-y-auto px-4 mt-4 gap-4">
          <LayerToolbar
            state={state}
            onPrev={() => setState(s => ({ ...s, currentLayerIndex: Math.max(0, s.currentLayerIndex - 1) }))}
            onNext={() => setState(s => ({ ...s, currentLayerIndex: Math.min(s.layers.length - 1, s.currentLayerIndex + 1) }))}
            onAdd={addLayer}
            onDuplicate={duplicateLayer}
            onDelete={deleteLayer}
            toggleOnionPrev={() => setState(s => ({ ...s, showOnionPrev: !s.showOnionPrev }))}
            toggleOnionNext={() => setState(s => ({ ...s, showOnionNext: !s.showOnionNext }))}
          />

          <ToolsToolbar
            state={state}
            setTool={(tool: Tool) => {
              if (state.selection?.active && tool !== 'move' && tool !== 'select' && tool !== 'wand') {
                commitSelection();
              }
              setState(s => ({ ...s, currentTool: tool }));
            }}
            setColor={(color: string) => setState(s => ({ ...s, currentColor: color }))}
            applyEffect={applyEffect}
            exportPng={exportPng}
            exportSheet={exportSheet}
            importPng={importPng}
            resizeCanvas={resizeCanvas}
            setWandTolerance={(val: number) => setState(s => ({ ...s, wandTolerance: val }))}
          />
        </div>
      </div>

      <footer className="w-full text-center py-4 text-[10px] uppercase font-bold opacity-30">
        {state.width}x{state.height} Grid • {state.layers.length} Frames
      </footer>
    </div>
  );
}
