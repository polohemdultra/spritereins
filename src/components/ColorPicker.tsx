import React, { useEffect, useRef } from 'react';
import Pickr from '@simonwep/pickr';
import '@simonwep/pickr/dist/themes/monolith.min.css';

interface ColorPickerProps {
  currentColor: string;
  setColor: (color: string) => void;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ currentColor, setColor }) => {
  const pickrRef = useRef<HTMLDivElement>(null);
  const pickrInstance = useRef<Pickr | null>(null);

  useEffect(() => {
    if (pickrRef.current && !pickrInstance.current) {
      pickrInstance.current = Pickr.create({
        el: pickrRef.current,
        theme: 'monolith',
        default: currentColor,
        swatches: [
          '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff',
          '#ffff00', '#00ffff', '#ff00ff', '#888888', '#444444'
        ],
        components: {
          preview: true,
          opacity: false,
          hue: true,
          interaction: {
            hex: true,
            input: true,
            save: true
          }
        }
      });

      pickrInstance.current.on('save', (color: any) => {
        setColor(color.toHEXA().toString());
      });

      pickrInstance.current.on('change', (color: any) => {
        setColor(color.toHEXA().toString());
      });
    }
  }, []);

  useEffect(() => {
    if (pickrInstance.current) {
      pickrInstance.current.setColor(currentColor, true);
    }
  }, [currentColor]);

  return (
    <div className="flex items-center justify-center border-2 border-black bg-gray-50 overflow-hidden relative w-6 h-6">
      <div ref={pickrRef} className="opacity-0 absolute inset-0 w-full h-full cursor-pointer z-10" />
      <div
        className="w-full h-full"
        style={{ backgroundColor: currentColor }}
      />
    </div>
  );
};
