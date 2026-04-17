export type Tool = 'pencil' | 'eraser' | 'fill' | 'picker' | 'line' | 'rect' | 'circle' | 'select' | 'move' | 'wand';

export interface LayerData {
  id: string;
  name: string;
  pixels: string[][]; // 2D array of hex colors (or empty for transparent)
  visible: boolean;
  opacity: number;
}

export interface Selection {
  x: number;
  y: number;
  width: number;
  height: number;
  pixels: string[][];
  active: boolean;
}

export interface EditorState {
  width: number;
  height: number;
  layers: LayerData[];
  currentLayerIndex: number;
  currentColor: string;
  currentTool: Tool;
  showOnionPrev: boolean;
  showOnionNext: boolean;
  zoom: number;
  selection?: Selection;
  isDarkBackground: boolean;
  wandTolerance: number;
}
