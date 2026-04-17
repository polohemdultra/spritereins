import React from 'react';
import { EditorState } from '../types';
import { ChevronLeft, ChevronRight, Plus, Copy, Trash2, Eye, EyeOff } from 'lucide-react';

interface LayerToolbarProps {
  state: EditorState;
  onPrev: () => void;
  onNext: () => void;
  onAdd: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  toggleOnionPrev: () => void;
  toggleOnionNext: () => void;
}

export const LayerToolbar: React.FC<LayerToolbarProps> = ({
  state, onPrev, onNext, onAdd, onDuplicate, onDelete, toggleOnionPrev, toggleOnionNext
}) => {
  return (
    <div className="flex flex-col gap-2 w-full max-w-lg">
      <div className="flex items-center justify-between border-2 border-black p-2 bg-white">
        <div className="flex items-center gap-2">
          <button onClick={onPrev} disabled={state.currentLayerIndex === 0} className="disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-bold uppercase min-w-[80px] text-center">
            Frame {state.currentLayerIndex + 1} / {state.layers.length}
          </span>
          <button onClick={onNext} disabled={state.currentLayerIndex === state.layers.length - 1} className="disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="flex gap-1">
          <button title="Add Frame" onClick={onAdd}><Plus size={16} /></button>
          <button title="Duplicate Frame" onClick={onDuplicate}><Copy size={16} /></button>
          <button title="Delete Frame" onClick={onDelete} disabled={state.layers.length <= 1} className="disabled:opacity-30"><Trash2 size={16} /></button>
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={toggleOnionPrev}
          className={`flex-1 flex items-center justify-center gap-2 text-xs uppercase font-bold ${state.showOnionPrev ? 'tab-active' : ''}`}
        >
          {state.showOnionPrev ? <Eye size={14} /> : <EyeOff size={14} />} Onion Prev
        </button>
        <button
          onClick={toggleOnionNext}
          className={`flex-1 flex items-center justify-center gap-2 text-xs uppercase font-bold ${state.showOnionNext ? 'tab-active' : ''}`}
        >
          {state.showOnionNext ? <Eye size={14} /> : <EyeOff size={14} />} Onion Next
        </button>
      </div>
    </div>
  );
};
