import React, { useRef, useState } from 'react';
import { Pencil, Eraser, PaintBucket, Pipette, FlipHorizontal, FlipVertical, Trash2, Contrast, Download, Grid3X3, Dice5, Box, FileJson, FileUp, Minus, Square, Circle, Undo2, Redo2, MousePointer2, Move, Sparkles, Upload, Wand2 } from 'lucide-react';
import { Tool, EditorState } from '../types';
import { ColorPicker } from './ColorPicker';
import { Sliders, Zap, Layers as LayersIcon, Ghost, Droplets } from 'lucide-react';

interface ToolsToolbarProps {
  state: EditorState;
  setTool: (tool: Tool) => void;
  setColor: (color: string) => void;
  applyEffect: (effect: string, params?: any) => void;
  exportPng: (scale: number) => void;
  exportSheet: (scale: number) => void;
  importPng: (file: File) => void;
  resizeCanvas: (width: number, height: number) => void;
  setWandTolerance: (val: number) => void;
}

export const ToolsToolbar: React.FC<ToolsToolbarProps> = ({ state, setTool, setColor, applyEffect, exportPng, exportSheet, importPng, resizeCanvas, setWandTolerance }) => {
  const [activeTab, setActiveTab] = useState<'tools' | 'effects' | 'file'>('tools');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [noiseAmount, setNoiseAmount] = useState(30);
  const [noiseSize, setNoiseSize] = useState(1);
  const [noiseType, setNoiseType] = useState<'color' | 'mono' | 'salt'>('color');
  const [quantizeSteps, setQuantizeSteps] = useState(4);
  const [ditherStrength, setDitherStrength] = useState(1);
  const [exportScale, setExportScale] = useState(1);

  return (
    <div className="flex flex-col gap-2 w-full max-lg border-2 border-black bg-white">
      {/* Tabs */}
      <div className="flex border-b-2 border-black">
        <button
          onClick={() => setActiveTab('tools')}
          className={`flex-1 border-none py-2 text-xs uppercase font-bold text-center ${activeTab === 'tools' ? 'tab-active' : ''}`}
        >
          Tools
        </button>
        <button
          onClick={() => setActiveTab('effects')}
          className={`flex-1 border-none border-l-2 border-black py-2 text-xs uppercase font-bold text-center ${activeTab === 'effects' ? 'tab-active' : ''}`}
        >
          Effects
        </button>
        <button
          onClick={() => setActiveTab('file')}
          className={`flex-1 border-none border-l-2 border-black py-2 text-xs uppercase font-bold text-center ${activeTab === 'file' ? 'tab-active' : ''}`}
        >
          File
        </button>
      </div>

      <div className="p-3">
        {activeTab === 'tools' && (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-4 gap-2">
              <button
                title="Pencil"
                onClick={() => setTool('pencil')}
                className={`p-2 flex items-center justify-center border-2 border-black ${state.currentTool === 'pencil' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
              >
                <Pencil size={18} />
              </button>
              <button
                title="Eraser"
                onClick={() => setTool('eraser')}
                className={`p-2 flex items-center justify-center border-2 border-black ${state.currentTool === 'eraser' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
              >
                <Eraser size={18} />
              </button>
              <button
                title="Flood Fill"
                onClick={() => setTool('fill')}
                className={`p-2 flex items-center justify-center border-2 border-black ${state.currentTool === 'fill' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
              >
                <PaintBucket size={18} />
              </button>
              <button
                title="Line Tool"
                onClick={() => setTool('line')}
                className={`p-2 flex items-center justify-center border-2 border-black ${state.currentTool === 'line' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
              >
                <Minus size={18} className="rotate-45" />
              </button>
              <button
                title="Rectangle Tool"
                onClick={() => setTool('rect')}
                className={`p-2 flex items-center justify-center border-2 border-black ${state.currentTool === 'rect' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
              >
                <Square size={18} />
              </button>
              <button
                title="Circle Tool"
                onClick={() => setTool('circle')}
                className={`p-2 flex items-center justify-center border-2 border-black ${state.currentTool === 'circle' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
              >
                <Circle size={18} />
              </button>
              <button
                title="Eyedropper"
                onClick={() => setTool('picker')}
                className={`p-2 flex items-center justify-center border-2 border-black ${state.currentTool === 'picker' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
              >
                <Pipette size={18} />
              </button>
              <button
                title="Select Tool"
                onClick={() => setTool('select')}
                className={`p-2 flex items-center justify-center border-2 border-black ${state.currentTool === 'select' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
              >
                <MousePointer2 size={18} />
              </button>
              <button
                title="Move Tool"
                onClick={() => setTool('move')}
                className={`p-2 flex items-center justify-center border-2 border-black ${state.currentTool === 'move' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
              >
                <Move size={18} />
              </button>
              <button
                title="Magic Wand"
                onClick={() => setTool('wand')}
                className={`p-2 flex items-center justify-center border-2 border-black ${state.currentTool === 'wand' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
              >
                <Wand2 size={18} />
              </button>
            </div>

            {state.currentTool === 'wand' && (
              <div className="p-2 border-2 border-black bg-gray-50 flex flex-col gap-1">
                <div className="flex justify-between text-[10px] uppercase font-bold opacity-50">
                  <span>Wand Tolerance</span>
                  <span>{state.wandTolerance}</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="255"
                  value={state.wandTolerance}
                  onChange={(e) => setWandTolerance(parseInt(e.target.value))}
                  className="w-full h-1 bg-black rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}
          </div>
        )}

        {activeTab === 'effects' && (
          <div className="flex flex-col gap-4">
            {/* Transform */}
            <div>
              <div className="flex items-center gap-1 mb-2">
                <Zap size={10} className="opacity-50" />
                <span className="text-[10px] uppercase font-bold opacity-50">Transform</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                <button title="Flip Horizontal" className="p-2 border-2 border-black hover:bg-gray-100" onClick={() => applyEffect('flip-h')}><FlipHorizontal size={18} /></button>
                <button title="Flip Vertical" className="p-2 border-2 border-black hover:bg-gray-100" onClick={() => applyEffect('flip-v')}><FlipVertical size={18} /></button>
                <button title="Invert Colors" className="p-2 border-2 border-black hover:bg-gray-100" onClick={() => applyEffect('invert')}><Contrast size={18} /></button>
                <button title="Clear Layer" className="p-2 border-2 border-black hover:bg-gray-100 text-red-500" onClick={() => applyEffect('clear')}><Trash2 size={18} /></button>
              </div>
            </div>

            {/* Quantize */}
            <div>
              <div className="flex items-center gap-1 mb-2">
                <Box size={10} className="opacity-50" />
                <span className="text-[10px] uppercase font-bold opacity-50">Quantization</span>
              </div>
              <div className="flex flex-col gap-2">
                <button 
                  title="Apply Quantize" 
                  className="flex items-center justify-center gap-2 p-2 border-2 border-black hover:bg-black hover:text-white uppercase font-bold text-[10px]" 
                  onClick={() => applyEffect('quantize', { steps: quantizeSteps })}
                >
                  <Box size={16} /> Apply Quantize
                </button>
                <div className="p-2 bg-gray-50 border border-gray-200">
                  <div className="flex justify-between text-[9px] uppercase font-bold mb-1">
                    <span>Steps</span>
                    <span>{quantizeSteps}</span>
                  </div>
                  <input 
                    type="range" 
                    min="2" max="16" 
                    value={quantizeSteps} 
                    onChange={(e) => setQuantizeSteps(parseInt(e.target.value))}
                    className="w-full accent-black h-1"
                  />
                </div>
              </div>
            </div>

            {/* Noise Generation */}
            <div>
              <div className="flex items-center gap-1 mb-2">
                <Sparkles size={10} className="opacity-50" />
                <span className="text-[10px] uppercase font-bold opacity-50">Noise Generation</span>
              </div>
              <div className="flex flex-col gap-2">
                 <button 
                  title="Apply Noise" 
                  className="flex items-center justify-center gap-2 p-2 border-2 border-black hover:bg-black hover:text-white uppercase font-bold text-[10px]" 
                  onClick={() => applyEffect('noise', { amount: noiseAmount, type: noiseType, size: noiseSize })}
                >
                  <Sparkles size={16} /> Generate Noise
                </button>
                
                <div className="flex flex-col gap-3 p-2 bg-gray-50 border border-gray-200">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] uppercase font-bold">Type</span>
                    <div className="flex gap-1">
                      {(['color', 'mono', 'salt'] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => setNoiseType(t)}
                          className={`flex-1 text-[8px] py-1 border border-black uppercase font-bold ${noiseType === t ? 'bg-black text-white' : 'bg-white text-black hover:bg-gray-100'}`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[9px] uppercase font-bold">
                      <span>Intensity</span>
                      <span>{noiseAmount}%</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" max="100" 
                      value={noiseAmount} 
                      onChange={(e) => setNoiseAmount(parseInt(e.target.value))}
                      className="w-full accent-black h-1"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[9px] uppercase font-bold">
                      <span>Grain Size</span>
                      <span>{noiseSize}px</span>
                    </div>
                    <input 
                      type="range" 
                      min="1" max="8" 
                      value={noiseSize} 
                      onChange={(e) => setNoiseSize(parseInt(e.target.value))}
                      className="w-full accent-black h-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Dithering */}
            <div>
              <div className="flex items-center gap-1 mb-2">
                <Grid3X3 size={10} className="opacity-50" />
                <span className="text-[10px] uppercase font-bold opacity-50">Dithering</span>
              </div>
              <div className="flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    title="Bayer Dither" 
                    className="flex items-center justify-center gap-2 p-2 border-2 border-black hover:bg-black hover:text-white text-[10px] uppercase font-bold" 
                    onClick={() => applyEffect('dither-bayer', { strength: ditherStrength })}
                  >
                    <Grid3X3 size={16} /> Bayer
                  </button>
                  <button 
                    title="Random Dither" 
                    className="flex items-center justify-center gap-2 p-2 border-2 border-black hover:bg-black hover:text-white text-[10px] uppercase font-bold" 
                    onClick={() => applyEffect('dither-random', { strength: ditherStrength })}
                  >
                    <Dice5 size={16} /> Random
                  </button>
                </div>

                <div className="p-2 bg-gray-50 border border-gray-200">
                  <div className="flex justify-between text-[9px] uppercase font-bold mb-1">
                    <span>Threshold Strength</span>
                    <span>{ditherStrength.toFixed(1)}x</span>
                  </div>
                  <input 
                    type="range" 
                    min="0.1" max="4.0" step="0.1"
                    value={ditherStrength} 
                    onChange={(e) => setDitherStrength(parseFloat(e.target.value))}
                    className="w-full accent-black h-1"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'file' && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] uppercase font-bold opacity-50">Grid Resolution</span>
              <select
                className="w-full border-2 border-black p-2 text-xs uppercase font-bold bg-white cursor-pointer hover:bg-gray-50 focus:outline-none"
                value={`${state.width}x${state.height}`}
                onChange={(e) => {
                  const [w, h] = e.target.value.split('x').map(Number);
                  resizeCanvas(w, h);
                }}
              >
                {[
                  { w: 16, h: 16 },
                  { w: 32, h: 32 },
                  { w: 64, h: 64 },
                  { w: 32, h: 16 },
                  { w: 16, h: 32 },
                  { w: 64, h: 32 },
                  { w: 32, h: 64 }
                ].map(({ w, h }) => (
                  <option key={`${w}x${h}`} value={`${w}x${h}`}>
                    {w}x{h} Resolution
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <div className="p-2 bg-gray-50 border border-gray-200 mb-1">
                <div className="flex justify-between text-[9px] uppercase font-bold mb-1">
                  <span>Export Resolution Scale</span>
                  <span>{exportScale}x ({state.width * exportScale}px)</span>
                </div>
                <input 
                  type="range" 
                  min="1" max="20" 
                  value={exportScale} 
                  onChange={(e) => setExportScale(parseInt(e.target.value))}
                  className="w-full accent-black h-1"
                />
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 uppercase font-bold text-xs border-2 border-black hover:bg-gray-100 py-2"
              >
                <Upload size={14} /> Import PNG
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png"
                onChange={(e) => {
                  if (e.target.files?.[0]) importPng(e.target.files[0]);
                }}
                className="hidden"
              />
              <button
                onClick={() => exportPng(exportScale)}
                className="w-full flex items-center justify-center gap-2 uppercase font-bold text-xs bg-black text-white hover:bg-white hover:text-black py-2"
              >
                <Download size={14} /> Export Frame
              </button>
              <button
                onClick={() => exportSheet(exportScale)}
                className="w-full flex items-center justify-center gap-2 uppercase font-bold text-xs border-2 border-black hover:bg-black hover:text-white py-2"
              >
                <Grid3X3 size={14} /> Export Spritesheet
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
