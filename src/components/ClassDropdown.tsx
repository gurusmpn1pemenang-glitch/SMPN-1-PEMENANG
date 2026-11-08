import React, { useState, useRef } from 'react';
import { ChevronDown, Filter, Check } from 'lucide-react';
import { useClickOutside } from '../utils/useClickOutside';

interface ClassDropdownProps {
  selectedClass: string;
  onSelectClass: (className: string) => void;
  classList?: string[];
  counts?: { [key: string]: number };
  labelPrefix?: string;
  className?: string;
  showAllOption?: boolean;
  allLabel?: string;
}

export const ClassDropdown: React.FC<ClassDropdownProps> = ({
  selectedClass,
  onSelectClass,
  classList = ['7A', '7B', '8A', '8B', '9A', '9B'],
  counts,
  labelPrefix = 'Kelas ',
  className = '',
  showAllOption = true,
  allLabel = 'Semua Kelas',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useClickOutside(dropdownRef, () => setIsOpen(false));

  const displayText =
    selectedClass === 'SEMUA'
      ? allLabel
      : `${labelPrefix}${selectedClass}`;

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold shadow-xs transition-colors cursor-pointer min-w-[130px] focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
      >
        <div className="flex items-center gap-1.5 truncate">
          <Filter className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="truncate">{displayText}</span>
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-emerald-600' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-48 rounded-xl bg-white shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
          <div className="px-3 py-1 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
            Pilih Filter Kelas
          </div>

          <div className="max-h-60 overflow-y-auto p-1 space-y-0.5">
            {showAllOption && (
              <button
                type="button"
                onClick={() => {
                  onSelectClass('SEMUA');
                  setIsOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  selectedClass === 'SEMUA'
                    ? 'bg-emerald-50 text-emerald-800 font-bold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>{allLabel}</span>
                {selectedClass === 'SEMUA' && (
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                )}
              </button>
            )}

            {classList.map((cls) => {
              const isSelected = selectedClass === cls;
              const count = counts ? counts[cls] : undefined;

              return (
                <button
                  key={cls}
                  type="button"
                  onClick={() => {
                    onSelectClass(cls);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50 text-emerald-800 font-bold'
                      : 'text-slate-700 hover:bg-slate-100 font-medium'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span>{labelPrefix}{cls}</span>
                    {count !== undefined && (
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-500 font-normal">
                        {count}
                      </span>
                    )}
                  </span>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
