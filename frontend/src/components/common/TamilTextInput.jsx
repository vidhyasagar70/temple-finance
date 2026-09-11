import React, { useState, useRef } from 'react';
import { IndicTransliterate } from '@ai4bharat/indic-transliterate';
import { TamilVirtualKeyboard } from './TamilVirtualKeyboard';
import { Keyboard, Languages } from 'lucide-react';

export function TamilTextInput({
  value = '',
  onChange,
  onBlur,
  name,
  id,
  placeholder,
  disabled = false,
  multiline = false,
  rows = 3,
  className = '',
  label,
  required = false,
  error,
  defaultTamilMode = true,
  ...props
}) {
  const [isTamilMode, setIsTamilMode] = useState(defaultTamilMode);
  const [showVirtualKb, setShowVirtualKb] = useState(false);
  const inputRef = useRef(null);

  const handleTextChange = (text) => {
    if (onChange) {
      // Create synthetic event if consumer expects standard event object, or pass raw text string
      const fakeEvent = {
        target: {
          name: name || '',
          value: text,
        },
      };
      onChange(fakeEvent);
    }
  };

  const handleVirtualInsert = (char) => {
    const stringVal = String(value || '');
    const targetEl = inputRef.current;
    
    let nextVal = stringVal + char;
    if (targetEl && typeof targetEl.selectionStart === 'number') {
      const start = targetEl.selectionStart;
      const end = targetEl.selectionEnd;
      nextVal = stringVal.slice(0, start) + char + stringVal.slice(end);
    }

    handleTextChange(nextVal);
  };

  const handleVirtualBackspace = () => {
    const stringVal = String(value || '');
    const targetEl = inputRef.current;
    if (!stringVal) return;

    let nextVal = stringVal.slice(0, -1);
    if (targetEl && typeof targetEl.selectionStart === 'number' && targetEl.selectionStart > 0) {
      const start = targetEl.selectionStart;
      const end = targetEl.selectionEnd;
      if (start === end) {
        nextVal = stringVal.slice(0, start - 1) + stringVal.slice(start);
      } else {
        nextVal = stringVal.slice(0, start) + stringVal.slice(end);
      }
    }
    handleTextChange(nextVal);
  };

  const handleVirtualClear = () => {
    handleTextChange('');
  };

  const baseInputStyle = `w-full px-3 py-2 border rounded-lg text-sm transition-colors focus:ring-2 focus:ring-temple-500 focus:outline-none min-h-touch ${
    error ? 'border-rose-400 bg-rose-50/20' : 'border-stone-300 bg-white'
  } ${className}`;

  return (
    <div className="w-full space-y-1">
      {/* Field Label + Controls Header */}
      <div className="flex items-center justify-between gap-2">
        {label && (
          <label htmlFor={id} className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          {/* Language Toggle */}
          <button
            type="button"
            onClick={() => setIsTamilMode(!isTamilMode)}
            className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-bold rounded-md border transition-all min-h-[32px] ${
              isTamilMode
                ? 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
                : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
            }`}
            title={isTamilMode ? 'Switch to English typing' : 'Switch to Tamil transliteration'}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>{isTamilMode ? 'த (Tamil)' : 'EN'}</span>
          </button>

          {/* Virtual Keyboard Button */}
          <button
            type="button"
            onClick={() => setShowVirtualKb(!showVirtualKb)}
            className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-md border transition-all min-h-[32px] ${
              showVirtualKb
                ? 'bg-temple-600 text-white border-temple-700'
                : 'bg-stone-100 text-stone-700 border-stone-300 hover:bg-stone-200'
            }`}
            title="Open Virtual Tamil Keyboard"
          >
            <Keyboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Keyboard</span>
          </button>
        </div>
      </div>

      {/* Input / Transliterate Field */}
      <div className="relative">
        <IndicTransliterate
          lang="ta"
          enabled={isTamilMode}
          value={value || ''}
          onChangeText={handleTextChange}
          renderComponent={(propsFromLib) => {
            const mergedRef = (node) => {
              inputRef.current = node;
              if (typeof propsFromLib.ref === 'function') propsFromLib.ref(node);
              else if (propsFromLib.ref) propsFromLib.ref.current = node;
            };

            return multiline ? (
              <textarea
                {...propsFromLib}
                {...props}
                id={id}
                name={name}
                rows={rows}
                onBlur={onBlur}
                disabled={disabled}
                placeholder={placeholder}
                ref={mergedRef}
                lang={isTamilMode ? 'ta' : 'en'}
                className={baseInputStyle}
              />
            ) : (
              <input
                {...propsFromLib}
                {...props}
                id={id}
                name={name}
                onBlur={onBlur}
                disabled={disabled}
                placeholder={placeholder}
                ref={mergedRef}
                lang={isTamilMode ? 'ta' : 'en'}
                className={baseInputStyle}
              />
            );
          }}
        />
      </div>

      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}

      {/* Virtual Tamil Keyboard Drawer */}
      <TamilVirtualKeyboard
        isOpen={showVirtualKb}
        onClose={() => setShowVirtualKb(false)}
        onInsertChar={handleVirtualInsert}
        onBackspace={handleVirtualBackspace}
        onClear={handleVirtualClear}
      />
    </div>
  );
}
