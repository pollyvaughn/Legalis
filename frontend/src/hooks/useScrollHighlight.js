import { useCallback, useEffect, useRef } from 'react';

export default function useScrollHighlight(abierto, clave) {
  const elementoRef = useRef(null);
  const callbackRef = useCallback((elemento) => {
    elementoRef.current = elemento;
  }, []);

  useEffect(() => {
    const elemento = elementoRef.current;
    if (!abierto || !elemento) return;

    const frame = requestAnimationFrame(() => {
      elemento.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
      elemento.classList.add(
        'ring-2',
        'ring-blue-400',
        'ring-offset-2',
        'transition-shadow'
      );
    });

    const temporizador = window.setTimeout(() => {
      elemento.classList.remove(
        'ring-2',
        'ring-blue-400',
        'ring-offset-2',
        'transition-shadow'
      );
    }, 1500);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(temporizador);
      elemento.classList.remove(
        'ring-2',
        'ring-blue-400',
        'ring-offset-2',
        'transition-shadow'
      );
    };
  }, [abierto, clave]);

  return callbackRef;
}