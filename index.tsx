import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';

type GameMode = 'single-note-reference' | 'single-note-absolute' | 'pattern-reference' | 'pattern-absolute' | 'chord-reference' | 'chord-absolute';
type GameScreen = 'menu' | 'game';
type Note = { name: string; frequency: number; type: 'white' | 'black' };
type Chord = { name: string; shortName: string; intervals: number[] };

const NOTES: Note[] = [
    { name: 'C4', frequency: 261.63, type: 'white' }, { name: 'C#4', frequency: 277.18, type: 'black' },
    { name: 'D4', frequency: 293.66, type: 'white' }, { name: 'D#4', frequency: 311.13, type: 'black' },
    { name: 'E4', frequency: 329.63, type: 'white' },
    { name: 'F4', frequency: 349.23, type: 'white' }, { name: 'F#4', frequency: 369.99, type: 'black' },
    { name: 'G4', frequency: 392.00, type: 'white' }, { name: 'G#4', frequency: 415.30, type: 'black' },
    { name: 'A4', frequency: 440.00, type: 'white' }, { name: 'A#4', frequency: 466.16, type: 'black' },
    { name: 'B4', frequency: 493.88, type: 'white' },
    { name: 'C5', frequency: 523.25, type: 'white' }, { name: 'C#5', frequency: 554.37, type: 'black' },
    { name: 'D5', frequency: 587.33, type: 'white' }, { name: 'D#5', frequency: 622.25, type: 'black' },
    { name: 'E5', frequency: 659.25, type: 'white' },
    { name: 'F5', frequency: 698.46, type: 'white' }, { name: 'F#5', frequency: 739.99, type: 'black' },
    { name: 'G5', frequency: 783.99, type: 'white' }, { name: 'G#5', frequency: 830.61, type: 'black' },
    { name: 'A5', frequency: 880.00, type: 'white' }, { name: 'A#5', frequency: 932.33, type: 'black' },
    { name: 'B5', frequency: 987.77, type: 'white' },
    { name: 'C6', frequency: 1046.50, type: 'white' },
];

const CHORDS: Chord[] = [
    { name: 'Mayor', shortName: 'Maj', intervals: [0, 4, 7] },
    { name: 'Menor', shortName: 'min', intervals: [0, 3, 7] },
    { name: 'Dominante 7', shortName: '7', intervals: [0, 4, 7, 10] },
    { name: 'Mayor 7', shortName: 'maj7', intervals: [0, 4, 7, 11] },
    { name: 'Menor 7', shortName: 'm7', intervals: [0, 3, 7, 10] },
];

const MainMenu: React.FC<{ onSelectMode: (mode: GameMode) => void }> = ({ onSelectMode }) => {
    return (
        <>
            <h1>Entrenador Auditivo</h1>
            <h2>Selecciona un modo para empezar a entrenar.</h2>
            <div className="menu-container">
                <div className="mode-selection-group">
                    <h3>Nota Individual</h3>
                    <div className="mode-buttons">
                        <button className="btn" onClick={() => onSelectMode('single-note-reference')}>Referencia</button>
                        <button className="btn" onClick={() => onSelectMode('single-note-absolute')}>Absoluta</button>
                    </div>
                </div>
                <div className="mode-selection-group">
                    <h3>Patrón</h3>
                    <div className="mode-buttons">
                        <button className="btn" onClick={() => onSelectMode('pattern-reference')}>Referencia</button>
                        <button className="btn" onClick={() => onSelectMode('pattern-absolute')}>Absoluta</button>
                    </div>
                </div>
                <div className="mode-selection-group">
                    <h3>Identificar Acorde</h3>
                    <div className="mode-buttons">
                        <button className="btn" onClick={() => onSelectMode('chord-reference')}>Referencia</button>
                        <button className="btn" onClick={() => onSelectMode('chord-absolute')}>Absoluta</button>
                    </div>
                </div>
            </div>
        </>
    );
};

const OrientationPrompt: React.FC = () => (
    <div className="orientation-prompt">
        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M11.25 4.07V2.5h1.5v1.57c1.31.11 2.51.63 3.54 1.46l.71-.71 1.06 1.06-.71.71c.63.88 1.11 1.88 1.43 2.94h1.62v1.5h-1.62c-.11 1.31-.63 2.51-1.46 3.54l.71.71-1.06 1.06-.71-.71c-.88.63-1.88 1.11-2.94 1.43v1.62h-1.5v-1.62c-1.31-.11-2.51-.63-3.54-1.46l-.71.71-1.06-1.06.71-.71c-.63-.88-1.11-1.88-1.43-2.94H4.5v-1.5h1.62c.11-1.31.63-2.51 1.46-3.54l-.71-.71 1.06-1.06.71.71c.88-.63 1.88-1.11 2.94-1.43zM12 16.5c2.49 0 4.5-2.01 4.5-4.5S14.49 7.5 12 7.5 7.5 9.51 7.5 12s2.01 4.5 4.5 4.5z"/></svg>
        <span>Gira tu dispositivo o usa pantalla completa.</span>
    </div>
);

const GameView: React.FC<{ mode: GameMode; onBackToMenu: () => void }> = ({ mode, onBackToMenu }) => {
    const audioCtxRef = useRef<AudioContext | null>(null);
    const PATTERN_LENGTH = 3;
    const isPatternMode = mode.startsWith('pattern');
    const isChordMode = mode.startsWith('chord');
    
    const [currentNote, setCurrentNote] = useState<Note | null>(null);
    const [currentSequence, setCurrentSequence] = useState<Note[]>([]);
    const [currentChord, setCurrentChord] = useState<{ root: Note; chord: Chord, notes: Note[] } | null>(null);
    const [score, setScore] = useState({ correct: 0, total: 0 });
    const [feedback, setFeedback] = useState<{ message: string; type: 'correct' | 'incorrect' | 'info' }>({ message: 'Escucha...', type: 'info' });
    const [userSequence, setUserSequence] = useState<string[]>([]);
    const [isGuessing, setIsGuessing] = useState(true);
    const [referenceNote, setReferenceNote] = useState<Note | null>(null);
    const [flashEffect, setFlashEffect] = useState<{ noteName: string, type: 'correct-guess' | 'incorrect-guess' } | null>(null);
    const [showAnswer, setShowAnswer] = useState<string[]>([]);
    const [correctlyGuessedNotes, setCorrectlyGuessedNotes] = useState<string[]>([]);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [selectedKeys, setSelectedKeys] = useState<string[]>([]);

    useEffect(() => {
        const onFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
    }, []);

    const toggleFullscreen = async () => {
        const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
                if (isMobile && screen.orientation && (screen.orientation as any).lock) {
                    await (screen.orientation as any).lock('landscape');
                }
            } else {
                if (isMobile && screen.orientation && (screen.orientation as any).unlock) {
                    (screen.orientation as any).unlock();
                }
                await document.exitFullscreen();
            }
        } catch (err) {
            console.error(`Error with fullscreen/orientation: ${(err as Error).message}`);
        }
    };

    const getAudioContext = useCallback(() => {
        if (!audioCtxRef.current) {
            try {
                audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            } catch (e) {
                console.error("Web Audio API is not supported in this browser");
                setFeedback({ message: "El audio no es compatible en este navegador.", type: 'incorrect' });
                return null;
            }
        }
        return audioCtxRef.current;
    }, []);

    const playNoteSound = useCallback((frequency: number, duration: number = 0.5) => {
        const audioCtx = getAudioContext();
        if (!audioCtx) return;
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
        gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.01);
        gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + duration);
    }, [getAudioContext]);
    
    const playChordSound = useCallback((frequencies: number[], duration: number = 1.0) => {
        const audioCtx = getAudioContext();
        if (!audioCtx) return;
        const masterGain = audioCtx.createGain();
        masterGain.gain.setValueAtTime(0, audioCtx.currentTime);
        masterGain.gain.linearRampToValueAtTime(0.3 / frequencies.length, audioCtx.currentTime + 0.01);
        masterGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + duration);
        masterGain.connect(audioCtx.destination);
    
        frequencies.forEach(frequency => {
            const oscillator = audioCtx.createOscillator();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
            oscillator.connect(masterGain);
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + duration);
        });
    }, [getAudioContext]);

    const playSequenceSound = useCallback(async (sequence: { frequency: number }[]) => {
        for (const note of sequence) {
            playNoteSound(note.frequency, 0.4);
            await new Promise(resolve => setTimeout(resolve, 450));
        }
    }, [playNoteSound]);

    const startNewRound = useCallback(() => {
        setIsGuessing(true);
        setUserSequence([]);
        setShowAnswer([]);
        setCorrectlyGuessedNotes([]);
        setCurrentChord(null);
        setSelectedKeys([]);

        const playSounds = async () => {
            if (isChordMode) {
                const rootNotes = NOTES.slice(0, 13); // C4 to C5 as possible roots
                const randomRoot = rootNotes[Math.floor(Math.random() * rootNotes.length)];
                const randomChord = CHORDS[Math.floor(Math.random() * CHORDS.length)];
                
                const rootIndex = NOTES.findIndex(n => n.name === randomRoot.name);
                const chordNotes = randomChord.intervals.map(interval => NOTES[rootIndex + interval]).filter(Boolean);
                
                if (chordNotes.length !== randomChord.intervals.length) {
                    startNewRound(); // Recalculate if chord goes out of bounds
                    return;
                }
                
                setCurrentChord({ root: randomRoot, chord: randomChord, notes: chordNotes });

                if (mode.endsWith('-reference')) {
                    setFeedback({ message: 'Escucha: Referencia y luego el acorde...', type: 'info' });
                    playNoteSound(randomRoot.frequency, 0.8);
                    await new Promise(resolve => setTimeout(resolve, 950));
                } else {
                    setFeedback({ message: 'Escucha el acorde...', type: 'info' });
                }
                playChordSound(chordNotes.map(n => n.frequency));
                setFeedback({ message: 'Selecciona las notas en el piano.', type: 'info' });

            } else if (isPatternMode) {
                const playableNotes = NOTES.slice(0, -1);
                const newSequence = Array.from({ length: PATTERN_LENGTH }, () =>
                    playableNotes[Math.floor(Math.random() * playableNotes.length)]
                );
                setCurrentSequence(newSequence);
                
                let currentRefNote: Note | null = null;
                if (mode.endsWith('-reference')) {
                    currentRefNote = playableNotes[Math.floor(Math.random() * playableNotes.length)];
                    setReferenceNote(currentRefNote);
                    setFeedback({ message: 'Escucha: Referencia y luego el patrón...', type: 'info' });
                    playNoteSound(currentRefNote.frequency);
                    await new Promise(resolve => setTimeout(resolve, 650));
                } else {
                    setFeedback({ message: 'Escucha el patrón...', type: 'info' });
                }
                await playSequenceSound(newSequence);
                setFeedback({ message: '¿Cuál era el patrón?', type: 'info' });

            } else { // Single note mode
                const playableNotes = NOTES.slice(0,-1);
                const randomNote = playableNotes[Math.floor(Math.random() * playableNotes.length)];
                setCurrentNote(randomNote);

                let currentRefNote: Note | null = null;
                if (mode.endsWith('-reference')) {
                    currentRefNote = playableNotes[Math.floor(Math.random() * playableNotes.length)];
                    setReferenceNote(currentRefNote);
                    setFeedback({ message: 'Escucha: Referencia y luego la nota...', type: 'info' });
                    playNoteSound(currentRefNote.frequency);
                    await new Promise(resolve => setTimeout(resolve, 650));
                } else {
                    setFeedback({ message: 'Escucha la nota...', type: 'info' });
                }
                playNoteSound(randomNote.frequency);
                setFeedback({ message: '¿Qué nota es?', type: 'info' });
            }
        };
        setTimeout(playSounds, 500);
    }, [isPatternMode, isChordMode, playNoteSound, playSequenceSound, playChordSound, mode, PATTERN_LENGTH]);

    useEffect(() => { startNewRound(); }, [startNewRound]);

    const handleVerifyChord = () => {
        if (!isGuessing || !currentChord) return;
        setIsGuessing(false);
    
        const correctNoteNames = currentChord.notes.map(n => n.name).sort();
        const selectedNoteNames = [...selectedKeys].sort();
    
        const isCorrect = JSON.stringify(correctNoteNames) === JSON.stringify(selectedNoteNames);
        
        setScore(prev => ({ correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1 }));
    
        if (isCorrect) {
            setCorrectlyGuessedNotes(currentChord.notes.map(n => n.name));
            setFeedback({ message: '¡Correcto!', type: 'correct' });
        } else {
            setShowAnswer(currentChord.notes.map(n => n.name));
            setFeedback({ message: `Incorrecto. Era un acorde ${currentChord.root.name.slice(0,-1)} ${currentChord.chord.name}.`, type: 'incorrect' });
        }
    };
    
    const handlePlaySelection = () => {
        if (selectedKeys.length === 0) return;
        const selectedNotes = NOTES.filter(note => selectedKeys.includes(note.name));
        const frequencies = selectedNotes.map(note => note.frequency);
        playChordSound(frequencies, 0.8);
    };

    const handleKeyPress = (note: Note) => {
        playNoteSound(note.frequency);
        addPressedEffect(note.name);
        if (!isGuessing) return;

        if (isChordMode) {
            setSelectedKeys(prev =>
                prev.includes(note.name)
                    ? prev.filter(n => n !== note.name)
                    : [...prev, note.name]
            );
            return;
        }

        if (isPatternMode) {
            const newUserSequence = [...userSequence, note.name.replace(/\d/, '')];
            setUserSequence(newUserSequence);

            const targetNoteName = currentSequence[userSequence.length].name.replace(/\d/, '');
            if (note.name.replace(/\d/, '') !== targetNoteName) {
                setIsGuessing(false);
                setFlashEffect({ noteName: note.name, type: 'incorrect-guess' });
                setTimeout(() => setFlashEffect(null), 500);
                setShowAnswer(currentSequence.map(n => n.name));
                setScore(prev => ({ ...prev, total: prev.total + 1 }));
                setFeedback({ message: `Incorrecto. El patrón era ${currentSequence.map(n => n.name.slice(0, -1)).join(' - ')}.`, type: 'incorrect' });
                return;
            } else {
                setFlashEffect({ noteName: note.name, type: 'correct-guess' });
                setTimeout(() => setFlashEffect(null), 500);
            }

            if (newUserSequence.length === currentSequence.length) {
                setIsGuessing(false);
                setCorrectlyGuessedNotes(currentSequence.map(n => n.name));
                setScore(prev => ({ correct: prev.correct + 1, total: prev.total + 1 }));
                setFeedback({ message: '¡Correcto!', type: 'correct' });
            }
        } else {
            if (!currentNote) return;
            setIsGuessing(false);
            setUserSequence([note.name.slice(0, -1)]);
            const isCorrect = note.name === currentNote.name;
            setFlashEffect({ noteName: note.name, type: isCorrect ? 'correct-guess' : 'incorrect-guess' });
            setTimeout(() => setFlashEffect(null), 500);
            if (isCorrect) {
                setCorrectlyGuessedNotes([currentNote.name]);
            } else {
                setShowAnswer([currentNote.name]);
            }
            setScore(prev => ({ correct: prev.correct + (isCorrect ? 1 : 0), total: prev.total + 1 }));
            setFeedback({ message: isCorrect ? '¡Correcto!' : `Incorrecto. La nota era ${currentNote.name}.`, type: isCorrect ? 'correct' : 'incorrect' });
        }
    };
    
    const handleReplay = async () => {
        if (!isGuessing) return;
        if (isChordMode && currentChord) {
            if (mode.endsWith('-reference')) {
                playNoteSound(currentChord.root.frequency, 0.8);
                await new Promise(resolve => setTimeout(resolve, 950));
            }
            playChordSound(currentChord.notes.map(n => n.frequency));
        } else if (isPatternMode) {
            if (mode.endsWith('-reference') && referenceNote) {
                playNoteSound(referenceNote.frequency);
                await new Promise(resolve => setTimeout(resolve, 650));
            }
            await playSequenceSound(currentSequence);
        } else if (currentNote) {
            if (mode.endsWith('-reference') && referenceNote) {
                playNoteSound(referenceNote.frequency);
                await new Promise(resolve => setTimeout(resolve, 650));
            }
            playNoteSound(currentNote.frequency);
        }
    };

    const addPressedEffect = (noteName: string) => {
        const keyElement = document.querySelector(`[data-note="${noteName}"]`);
        keyElement?.classList.add('pressed');
        setTimeout(() => keyElement?.classList.remove('pressed'), 200);
    }
    
    const getModeTitleParts = (mode: GameMode) => {
        const parts = mode.split('-');
        let type: string;
        if(parts.includes('single')) type = 'Nota Individual';
        else if(parts.includes('pattern')) type = 'Patrón';
        else type = 'Identificar Acorde';
        
        const difficulty = parts.includes('reference') ? '(Referencia)' : '(Absoluta)';
        return { title: type, subtitle: difficulty };
    };

    const { title, subtitle } = getModeTitleParts(mode);

    const getKeyClassName = (note: Note) => {
        const classes = ['key', note.type === 'white' ? 'white-key' : 'black-key'];
        if (flashEffect?.noteName === note.name) classes.push(flashEffect.type);
        else if (correctlyGuessedNotes.includes(note.name)) classes.push('correctly-guessed');
        else if (showAnswer.includes(note.name)) classes.push('show-answer');
        else if (selectedKeys.includes(note.name)) classes.push('selected');
        else if (referenceNote?.name === note.name) classes.push('reference');
        else if (isChordMode && mode.endsWith('-reference') && currentChord?.root.name === note.name && isGuessing) classes.push('reference');
        return classes.join(' ');
    };

    return (
        <>
            <div className="game-header">
                <button className="btn secondary back-btn" onClick={onBackToMenu}>Menú</button>
                <div className="game-title-container">
                    <h1 className="game-title">{title}</h1>
                    <span className="difficulty-subtitle">{subtitle}</span>
                </div>
                <button onClick={toggleFullscreen} className="btn-icon" aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Entrar en pantalla completa'}>
                    {isFullscreen ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M21 9V3h-6l2 2-4 4 2 2 4-4 2 2zM3 21h6v-6l-2 2 4-4-2-2-4 4-2-2z"></path></svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M15 3h6v6l-2-2-4 4-2-2 4-4-2-2zM3 15v6h6l-2-2 4-4-2-2-4 4-2-2z"></path></svg>
                    )}
                </button>
            </div>
            
            <OrientationPrompt />

            <div className="score">Puntuación: {score.correct} / {score.total}</div>

            <div className="controls">
                {isGuessing ? (
                    <button className="btn primary" onClick={handleReplay}>Repetir</button>
                ) : (
                    <button className="btn primary" onClick={startNewRound}>Siguiente</button>
                )}
                {isChordMode && isGuessing && selectedKeys.length > 0 && (
                    <button className="btn secondary" onClick={handlePlaySelection}>Tocar Selección</button>
                )}
                 {isChordMode && isGuessing && selectedKeys.length > 1 && (
                    <button className="btn primary" onClick={handleVerifyChord}>Verificar Acorde</button>
                )}
            </div>
            
            <div className="piano-container" role="group" aria-label="Teclado de piano">
                 {NOTES.filter(n => n.type === 'white').map(note => (
                     <div
                        key={note.name}
                        data-note={note.name}
                        className={getKeyClassName(note)}
                        role="button"
                        aria-label={`Tocar nota ${note.name}`}
                        onClick={() => handleKeyPress(note)}
                    >
                        {note.name.slice(0, -1)}
                    </div>
                ))}
                 {NOTES.filter(n => n.type === 'black').map(note => (
                     <div
                        key={note.name}
                        data-note={note.name}
                        className={getKeyClassName(note)}
                        role="button"
                        aria-label={`Tocar nota ${note.name}`}
                        onClick={() => handleKeyPress(note)}
                    >
                        {note.name.slice(0, -1)}
                    </div>
                ))}
            </div>
            <div className="feedback-container">
                <div className={`feedback ${feedback.type}`}>{feedback.message}</div>
                {!isChordMode && <div className="sequence-display">Tu secuencia: {userSequence.join(' - ')}</div>}
            </div>
        </>
    );
};

const App: React.FC = () => {
    const [screen, setScreen] = useState<GameScreen>('menu');
    const [gameMode, setGameMode] = useState<GameMode | null>(null);

    const handleSelectMode = (mode: GameMode) => {
        setGameMode(mode);
        setScreen('game');
    };

    const handleBackToMenu = () => {
        setGameMode(null);
        setScreen('menu');
    }

    return (
        <div className="app-container">
            {screen === 'menu' || !gameMode ? (
                <MainMenu onSelectMode={handleSelectMode} />
            ) : (
                <GameView mode={gameMode} onBackToMenu={handleBackToMenu} />
            )}
        </div>
    );
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<App />);
}