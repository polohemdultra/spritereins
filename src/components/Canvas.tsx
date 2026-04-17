import React, { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Rect, Group, Line } from 'react-konva';
import { EditorState, Tool, Selection } from '../types';

interface CanvasProps {
  state: EditorState;
  updatePixels: (pixels: string[][], isFinal?: boolean) => void;
  setColor: (color: string) => void;
  setSelection: (selection?: Selection) => void;
  commitSelection: () => void;
  selectWand: (x: number, y: number) => void;
}

export const Canvas: React.FC<CanvasProps> = ({ state, updatePixels, setColor, setSelection, commitSelection, selectWand }) => {
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number, y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number, y: number } | null>(null);
  const [moveOffset, setMoveOffset] = useState<{ x: number, y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [pixelSize, setPixelSize] = useState(16);
  const [stageWidth, setStageWidth] = useState(307);
  const [stageHeight, setStageHeight] = useState(307);

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const maxWidth = containerRef.current.parentElement?.offsetWidth || 307;
        const availableWidth = Math.min(maxWidth - 32, 307); // Keep it relatively small like original
        
        const aspectRatio = state.width / state.height;
        let newWidth = availableWidth;
        let newHeight = availableWidth / aspectRatio;
        
        // If it gets too tall, scale it down
        if (newHeight > 400) {
          newHeight = 400;
          newWidth = newHeight * aspectRatio;
        }

        setStageWidth(newWidth);
        setStageHeight(newHeight);
        setPixelSize(newWidth / state.width);
      }
    };

    window.addEventListener('resize', updateSize);
    updateSize();
    return () => window.removeEventListener('resize', updateSize);
  }, [state.width, state.height]);

  const currentLayer = state.layers[state.currentLayerIndex];

  const getPixelCoord = (e: any) => {
    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();
    const x = Math.floor(pos.x / pixelSize);
    const y = Math.floor(pos.y / pixelSize);
    return { x, y };
  };

  const floodFill = (pixels: string[][], x: number, y: number, targetColor: string, replacementColor: string) => {
    if (targetColor === replacementColor) return;
    if (pixels[y][x] !== targetColor) return;

    const stack = [[x, y]];
    while (stack.length > 0) {
      const [currX, currY] = stack.pop()!;
      if (pixels[currY][currX] === targetColor) {
        pixels[currY][currX] = replacementColor;

        if (currX > 0) stack.push([currX - 1, currY]);
        if (currX < state.width - 1) stack.push([currX + 1, currY]);
        if (currY > 0) stack.push([currX, currY - 1]);
        if (currY < state.height - 1) stack.push([currX, currY + 1]);
      }
    }
  };

  const getShapePixels = (start: { x: number, y: number }, end: { x: number, y: number }, tool: Tool): { x: number, y: number }[] => {
    const pixels: { x: number, y: number }[] = [];
    
    if (tool === 'line') {
      let x0 = start.x;
      let y0 = start.y;
      let x1 = end.x;
      let y1 = end.y;
      const dx = Math.abs(x1 - x0);
      const dy = Math.abs(y1 - y0);
      const sx = x0 < x1 ? 1 : -1;
      const sy = y0 < y1 ? 1 : -1;
      let err = dx - dy;

      while (true) {
        pixels.push({ x: x0, y: y0 });
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) {
          err -= dy;
          x0 += sx;
        }
        if (e2 < dx) {
          err += dx;
          y0 += sy;
        }
      }
    } else if (tool === 'rect') {
      const xMin = Math.min(start.x, end.x);
      const xMax = Math.max(start.x, end.x);
      const yMin = Math.min(start.y, end.y);
      const yMax = Math.max(start.y, end.y);
      for (let y = yMin; y <= yMax; y++) {
        for (let x = xMin; x <= xMax; x++) {
          pixels.push({ x, y });
        }
      }
    } else if (tool === 'circle') {
      const r = Math.round(Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2)));
      let x = r;
      let y = 0;
      let err = 0;

      const addCirclePixels = (cx: number, cy: number, x: number, y: number) => {
        const points = [
          [cx + x, cy + y], [cx + y, cy + x], [cx - y, cy + x], [cx - x, cy + y],
          [cx - x, cy - y], [cx - y, cy - x], [cx + y, cy - x], [cx + x, cy - y]
        ];
        points.forEach(([px, py]) => {
          if (px >= 0 && px < state.width && py >= 0 && py < state.height) {
            pixels.push({ x: px, y: py });
          }
        });
      };

      while (x >= y) {
        // Fill circle interior
        for (let ix = start.x - x; ix <= start.x + x; ix++) {
          if (ix >= 0 && ix < state.width && start.y + y >= 0 && start.y + y < state.height)
            pixels.push({ x: ix, y: start.y + y });
          if (ix >= 0 && ix < state.width && start.y - y >= 0 && start.y - y < state.height)
            pixels.push({ x: ix, y: start.y - y });
        }
        for (let ix = start.x - y; ix <= start.x + y; ix++) {
          if (ix >= 0 && ix < state.width && start.y + x >= 0 && start.y + x < state.height)
            pixels.push({ x: ix, y: start.y + x });
          if (ix >= 0 && ix < state.width && start.y - x >= 0 && start.y - x < state.height)
            pixels.push({ x: ix, y: start.y - x });
        }

        if (err <= 0) {
          y += 1;
          err += 2 * y + 1;
        }
        if (err > 0) {
          x -= 1;
          err -= 2 * x + 1;
        }
      }
    }
    return pixels;
  };

  const handleMouseDown = (e: any) => {
    const { x, y } = getPixelCoord(e);
    if (x < 0 || x >= state.width || y < 0 || y >= state.height) return;

    if (state.currentTool === 'picker') {
      const color = currentLayer.pixels[y][x];
      if (color) setColor(color);
      return;
    }

    if (state.currentTool === 'move' && state.selection?.active) {
      if (x >= state.selection.x && x < state.selection.x + state.selection.width &&
          y >= state.selection.y && y < state.selection.y + state.selection.height) {
        setIsDrawing(true);
        setMoveOffset({ x: x - state.selection.x, y: y - state.selection.y });
        return;
      } else {
        // Committing selection if click outside
        commitSelection();
        return;
      }
    }

    if (state.currentTool === 'select' || state.currentTool === 'wand') {
      if (state.selection?.active) {
        commitSelection();
      }
      setSelection(undefined);
      
      if (state.currentTool === 'wand') {
        selectWand(x, y);
        return;
      }
    }

    setIsDrawing(true);
    setStartPos({ x, y });
    setCurrentPos({ x, y });

    if (state.currentTool === 'pencil' || state.currentTool === 'eraser' || state.currentTool === 'fill') {
      const newPixels = currentLayer.pixels.map(row => [...row]);
      const color = state.currentTool === 'eraser' ? '' : state.currentColor;

      if (state.currentTool === 'fill') {
        floodFill(newPixels, x, y, newPixels[y][x], color);
      } else {
        newPixels[y][x] = color;
      }
      updatePixels(newPixels);
    }
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawing) return;
    const { x, y } = getPixelCoord(e);
    
    if (state.currentTool === 'move' && state.selection?.active && moveOffset) {
      setSelection({
        ...state.selection,
        x: x - moveOffset.x,
        y: y - moveOffset.y
      });
      return;
    }

    if (x < 0 || x >= state.width || y < 0 || y >= state.height) return;

    setCurrentPos({ x, y });

    if (state.currentTool === 'pencil' || state.currentTool === 'eraser') {
      const newPixels = currentLayer.pixels.map(row => [...row]);
      const color = state.currentTool === 'eraser' ? '' : state.currentColor;
      
      // Interpolate between currentPos and {x, y}
      if (currentPos) {
        const shapePixels = getShapePixels(currentPos, { x, y }, 'line');
        shapePixels.forEach(p => {
          if (p.x >= 0 && p.x < state.width && p.y >= 0 && p.y < state.height) {
            newPixels[p.y][p.x] = color;
          }
        });
      } else {
        newPixels[y][x] = color;
      }
      
      updatePixels(newPixels);
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && startPos && currentPos) {
      if (state.currentTool === 'select') {
        const x1 = Math.min(startPos.x, currentPos.x);
        const y1 = Math.min(startPos.y, currentPos.y);
        const x2 = Math.max(startPos.x, currentPos.x);
        const y2 = Math.max(startPos.y, currentPos.y);
        const w = x2 - x1 + 1;
        const h = y2 - y1 + 1;
        
        const selectionPixels: string[][] = [];
        const newPixels = currentLayer.pixels.map(row => [...row]);

        for (let j = 0; j < h; j++) {
          selectionPixels[j] = [];
          for (let i = 0; i < w; i++) {
            selectionPixels[j][i] = currentLayer.pixels[y1 + j][x1 + i];
            newPixels[y1 + j][x1 + i] = ''; // Clear selected area
          }
        }
        
        updatePixels(newPixels, true);
        setSelection({
          x: x1,
          y: y1,
          width: w,
          height: h,
          pixels: selectionPixels,
          active: true
        });
      } else if (state.currentTool === 'move' && state.selection?.active) {
        // Drop selection into layer handled on next action or tool change usually,
        // but here we let it stay active until tool changed or selection dropped.
      } else if (['line', 'rect', 'circle'].includes(state.currentTool)) {
        const shapePixels = getShapePixels(startPos, currentPos, state.currentTool);
        const newPixels = currentLayer.pixels.map(row => [...row]);
        const color = state.currentColor;
        shapePixels.forEach(p => {
          if (p.x >= 0 && p.x < state.width && p.y >= 0 && p.y < state.height) {
            newPixels[p.y][p.x] = color;
          }
        });
        updatePixels(newPixels, true);
      } else if (state.currentTool === 'pencil' || state.currentTool === 'eraser') {
          // Pencil/Eraser updates are sent progressively, but we need to mark the end of stroke
          updatePixels(currentLayer.pixels, true);
      } else if (state.currentTool === 'fill') {
          // Fill is a single action, already saved progressive? 
          // Actually fill is one call. Let's make sure it's marked final.
          updatePixels(currentLayer.pixels, true);
      }
    }
    setIsDrawing(false);
    setStartPos(null);
    setCurrentPos(null);
  };

  // Onion skinning layers
  const prevLayer = state.showOnionPrev && state.currentLayerIndex > 0 ? state.layers[state.currentLayerIndex - 1] : null;
  const nextLayer = state.showOnionNext && state.currentLayerIndex < state.layers.length - 1 ? state.layers[state.currentLayerIndex + 1] : null;

  const renderPixels = (pixels: string[][], opacity: number = 1) => {
    const rects = [];
    const h = pixels.length;
    for (let y = 0; y < h; y++) {
      const row = pixels[y];
      if (!row) continue;
      const w = row.length;
      for (let x = 0; x < w; x++) {
        if (row[x]) {
          rects.push(
            <Rect
              key={`${x}-${y}`}
              x={x * pixelSize}
              y={y * pixelSize}
              width={pixelSize}
              height={pixelSize}
              fill={row[x]}
              opacity={opacity}
              listening={false}
            />
          );
        }
      }
    }
    return rects;
  };

  const renderPreview = () => {
    if (!isDrawing || !startPos || !currentPos || !['line', 'rect', 'circle'].includes(state.currentTool)) return null;
    const shapePixels = getShapePixels(startPos, currentPos, state.currentTool);
    return shapePixels.map((p, i) => (
      <Rect
        key={`preview-${i}`}
        x={p.x * pixelSize}
        y={p.y * pixelSize}
        width={pixelSize}
        height={pixelSize}
        fill={state.currentColor}
        opacity={0.6}
        listening={false}
      />
    ));
  };

  const renderSelection = () => {
    if (!state.selection?.active) return null;
    const { x, y, width, height, pixels } = state.selection;
    const items = [];
    
    // Transparent overlay for the selection area
    items.push(
      <Rect
        key="selection-border"
        x={x * pixelSize}
        y={y * pixelSize}
        width={width * pixelSize}
        height={height * pixelSize}
        stroke={state.isDarkBackground ? '#fff' : '#000'}
        strokeWidth={1}
        dash={[4, 2]}
      />
    );

    // Render selection pixels
    for (let j = 0; j < height; j++) {
      for (let i = 0; i < width; i++) {
        if (pixels[j][i]) {
          items.push(
            <Rect
              key={`sel-${i}-${j}`}
              x={(x + i) * pixelSize}
              y={(y + j) * pixelSize}
              width={pixelSize}
              height={pixelSize}
              fill={pixels[j][i]}
              listening={false}
            />
          );
        }
      }
    }
    return items;
  };

  const renderGrid = () => {
    const lines = [];
    const gridColor = state.isDarkBackground ? 'rgba(255,255,255,0.1)' : '#ddd';
    for (let i = 0; i <= state.height; i++) {
      lines.push(
        <Line
          key={`h${i}`}
          points={[0, i * pixelSize, state.width * pixelSize, i * pixelSize]}
          stroke={gridColor}
          strokeWidth={0.5}
        />
      );
    }
    for (let i = 0; i <= state.width; i++) {
      lines.push(
        <Line
          key={`v${i}`}
          points={[i * pixelSize, 0, i * pixelSize, state.height * pixelSize]}
          stroke={gridColor}
          strokeWidth={0.5}
        />
      );
    }
    return lines;
  };

  const checkerColor = state.isDarkBackground ? '#444' : '#eee';
  const bgColor = state.isDarkBackground ? '#222' : '#fafafa';

  return (
    <div 
      ref={containerRef} 
      className="brutal-border relative overflow-hidden touch-none shrink-0 outline-none mx-auto" 
      style={{ 
        backgroundColor: bgColor,
        width: stageWidth,
        height: stageHeight
      }}
    >
      {/* Background Checkerboard pattern */}
      <div className="absolute inset-0" style={{
        backgroundImage: `linear-gradient(45deg, ${checkerColor} 25%, transparent 25%), linear-gradient(-45deg, ${checkerColor} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${checkerColor} 75%), linear-gradient(-45deg, transparent 75%, ${checkerColor} 75%)`,
        backgroundSize: `${pixelSize * 2}px ${pixelSize * 2}px`,
        backgroundPosition: `0 0, 0 ${pixelSize}px, ${pixelSize}px -${pixelSize}px, -${pixelSize}px 0px`
      }} />

      <Stage
        width={stageWidth}
        height={stageHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleMouseDown}
        onTouchMove={handleMouseMove}
        onTouchEnd={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <Layer>
          {renderGrid()}
          {prevLayer && renderPixels(prevLayer.pixels, 0.2)}
          {nextLayer && renderPixels(nextLayer.pixels, 0.2)}
          {renderPixels(currentLayer.pixels)}
          {renderPreview()}
          {renderSelection()}
        </Layer>
      </Stage>
    </div>
  );
};
