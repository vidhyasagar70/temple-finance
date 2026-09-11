import React, { useState } from 'react';
import { X, Delete, Space, RotateCcw } from 'lucide-react';

const VOWELS = ['அ', 'ஆ', 'இ', 'ஈ', 'உ', 'ஊ', 'எ', 'ஏ', 'ஐ', 'ஒ', 'ஓ', 'ஔ', 'ஃ'];

const CONSONANTS = [
  'க்', 'ங', 'ச்', 'ஞ்', 'ட்', 'ண்', 'த்', 'ந்',
  'ப்', 'ம்', 'ய்', 'ர்', 'ல்', 'வ்', 'ழ்', 'ள்',
  'ற்', 'ன்', 'ஜ்', 'ஶ்', 'ஷ்', 'ஸ்', 'ஹ்', 'க்ஷ்'
];

const VOWEL_SIGNS = ['ா', 'ி', 'ீ', 'ு', 'ூ', 'ெ', 'ே', 'ை', 'ொ', 'ோ', 'ௌ', '்'];

const COMMON_WORDS = ['ரூபாய்', 'வரி', 'அம்மன்', 'கோவில்', 'நன்கொடை', 'பங்குனி', 'சித்திரை', 'திருவிழா'];

export function TamilVirtualKeyboard({ isOpen, onClose, onInsertChar, onBackspace, onClear }) {
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'vowels' | 'consonants' | 'signs'

  if (!isOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 bg-stone-900/95 text-white shadow-2xl border-t border-stone-700 backdrop-blur-md max-h-[50vh] overflow-y-auto pb-safe">
      <div className="p-3 border-b border-stone-800 flex items-center justify-between sticky top-0 bg-stone-900/95 z-10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
            தமிழ் விசைப்பலகை (Tamil Keyboard)
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-white rounded-lg transition-colors min-h-touch min-w-[44px] flex items-center justify-center"
            aria-label="Close Tamil Keyboard"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-3 pt-2 flex gap-1 overflow-x-auto text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'all' ? 'bg-amber-500 text-stone-950 font-bold' : 'bg-stone-800 text-stone-300'
          }`}
        >
          அனைத்தும் (All)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('vowels')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'vowels' ? 'bg-amber-500 text-stone-950 font-bold' : 'bg-stone-800 text-stone-300'
          }`}
        >
          உயிர் (Vowels)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('consonants')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'consonants' ? 'bg-amber-500 text-stone-950 font-bold' : 'bg-stone-800 text-stone-300'
          }`}
        >
          மெய் (Consonants)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('signs')}
          className={`px-3 py-1.5 rounded-lg transition-colors ${
            activeTab === 'signs' ? 'bg-amber-500 text-stone-950 font-bold' : 'bg-stone-800 text-stone-300'
          }`}
        >
          குறியீடுகள் (Signs)
        </button>
      </div>

      <div className="p-3 space-y-3">
        {/* Quick words */}
        <div className="flex flex-wrap gap-1.5 pb-1">
          {COMMON_WORDS.map((word) => (
            <button
              key={word}
              type="button"
              onClick={() => onInsertChar(word + ' ')}
              className="px-2.5 py-1 text-xs bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 rounded-md hover:bg-emerald-900 active:scale-95 transition-all font-medium"
            >
              {word}
            </button>
          ))}
        </div>

        {/* Character Keys Grid */}
        <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5">
          {(activeTab === 'all' || activeTab === 'vowels') &&
            VOWELS.map((char) => (
              <button
                key={char}
                type="button"
                onClick={() => onInsertChar(char)}
                className="h-11 rounded-lg bg-stone-800 text-amber-200 hover:bg-stone-700 active:bg-amber-500 active:text-stone-950 font-medium text-lg flex items-center justify-center border border-stone-700 shadow-xs transition-all"
              >
                {char}
              </button>
            ))}

          {(activeTab === 'all' || activeTab === 'consonants') &&
            CONSONANTS.map((char) => (
              <button
                key={char}
                type="button"
                onClick={() => onInsertChar(char)}
                className="h-11 rounded-lg bg-stone-800 text-white hover:bg-stone-700 active:bg-amber-500 active:text-stone-950 font-medium text-lg flex items-center justify-center border border-stone-700 shadow-xs transition-all"
              >
                {char}
              </button>
            ))}

          {(activeTab === 'all' || activeTab === 'signs') &&
            VOWEL_SIGNS.map((sign, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onInsertChar(sign)}
                className="h-11 rounded-lg bg-stone-800 text-amber-300 hover:bg-stone-700 active:bg-amber-500 active:text-stone-950 font-bold text-xl flex items-center justify-center border border-stone-700 shadow-xs transition-all"
              >
                ◌{sign}
              </button>
            ))}
        </div>

        {/* Action Row */}
        <div className="flex gap-2 pt-2 border-t border-stone-800">
          <button
            type="button"
            onClick={() => onInsertChar(' ')}
            className="flex-1 h-11 bg-stone-700 text-stone-200 rounded-lg font-medium text-sm flex items-center justify-center gap-1.5 hover:bg-stone-600 active:bg-stone-500 transition-colors"
          >
            <Space className="w-4 h-4" /> Space
          </button>
          <button
            type="button"
            onClick={onBackspace}
            className="w-20 h-11 bg-rose-900/60 text-rose-200 border border-rose-800/80 rounded-lg font-medium text-sm flex items-center justify-center gap-1 hover:bg-rose-800 active:bg-rose-700 transition-colors"
          >
            <Delete className="w-4 h-4" />
          </button>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="w-16 h-11 bg-stone-800 text-stone-400 rounded-lg font-medium text-xs flex items-center justify-center hover:bg-stone-700 transition-colors"
              title="Clear text"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
