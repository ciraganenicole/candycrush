import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './GameBoard.css';

// Define candy types
export const CANDY_COLORS = [
  'red-jelly',    // 🍬 Red Jelly Bean
  'yellow-lemon', // 🍋 Yellow Lemon Drop
  'purple-grape', // 🍇 Purple Cluster
  'green-apple',  // 🍏 Green Square
  'orange-candy', // 🍊 Orange Lozenge
  'blue-lollipop' // 💙 Blue Lollipop Head
];

// Define special candy types
export enum SpecialCandyType {
  NONE = 'none',
  STRIPED_H = 'striped_h',
  STRIPED_V = 'striped_v',
  WRAPPED = 'wrapped',
  COLOR_BOMB = 'color_bomb'
}

// Define grid size
const GRID_SIZE = 8;

// Define level configurations
interface LevelConfig {
  targetScore: number;
  moves: number;
  description: string;
}

const LEVELS: LevelConfig[] = [
  { targetScore: 1000, moves: 30, description: "Level 1: Get 1000 points!" },
  { targetScore: 2500, moves: 25, description: "Level 2: Get 2500 points!" },
  { targetScore: 5000, moves: 20, description: "Level 3: Get 5000 points!" },
  { targetScore: 10000, moves: 15, description: "Level 4: Get 10000 points!" },
  { targetScore: 20000, moves: 10, description: "Level 5: Get 20000 points!" },
];

export interface Candy {
  color: string;
  id: string;
  specialType: SpecialCandyType;
}

const candyVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: { 
      type: "spring",
      stiffness: 500,
      damping: 30
    }
  },
  exit: { 
    scale: 0, 
    opacity: 0,
    transition: { duration: 0.2 }
  },
  hover: { 
    scale: 1.1,
    transition: { duration: 0.2 }
  },
  tap: { 
    scale: 0.95,
    transition: { duration: 0.1 }
  }
};

export const GameBoard: React.FC = () => {
  const [board, setBoard] = useState<Candy[][]>([]);
  const [score, setScore] = useState(0);
  const [movesLeft, setMovesLeft] = useState(LEVELS[0].moves);
  const [gameOver, setGameOver] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [levelComplete, setLevelComplete] = useState(false);
  const [matchingCandies, setMatchingCandies] = useState<Set<string>>(new Set());
  const [swappingCandies, setSwappingCandies] = useState<Set<string>>(new Set());
  
  // Add touch/mouse tracking
  const touchStart = useRef<{ x: number; y: number; row: number; col: number } | null>(null);

  // Initialize the board
  useEffect(() => {
    const initialBoard = createBoard();
    setBoard(initialBoard);
  }, []);

  const createBoard = (): Candy[][] => {
    const newBoard: Candy[][] = [];
    
    for (let row = 0; row < GRID_SIZE; row++) {
      const newRow: Candy[] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        newRow.push(createCandy(row, col));
      }
      newBoard.push(newRow);
    }

    // Ensure no initial matches
    let hasMatches = true;
    while (hasMatches) {
      hasMatches = false;
      for (let row = 0; row < GRID_SIZE; row++) {
        for (let col = 0; col < GRID_SIZE; col++) {
          // Check horizontal matches
          if (col > 1) {
            if (
              newBoard[row][col].color === newBoard[row][col - 1].color &&
              newBoard[row][col].color === newBoard[row][col - 2].color
            ) {
              newBoard[row][col] = createCandy(row, col);
              hasMatches = true;
            }
          }
          // Check vertical matches
          if (row > 1) {
            if (
              newBoard[row][col].color === newBoard[row - 1][col].color &&
              newBoard[row][col].color === newBoard[row - 2][col].color
            ) {
              newBoard[row][col] = createCandy(row, col);
              hasMatches = true;
            }
          }
        }
      }
    }

    return newBoard;
  };

  const createCandy = (row: number, col: number): Candy => {
    return {
      color: CANDY_COLORS[Math.floor(Math.random() * CANDY_COLORS.length)],
      id: `${row}-${col}-${Math.random()}`,
      specialType: SpecialCandyType.NONE
    };
  };

  const createSpecialCandy = (color: string, specialType: SpecialCandyType): Candy => {
    return {
      color,
      id: Math.random().toString(),
      specialType
    };
  };

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent, row: number, col: number) => {
    if (gameOver || levelComplete) return;
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    touchStart.current = {
      x: clientX,
      y: clientY,
      row,
      col
    };
  };

  const handleTouchEnd = async (e: React.TouchEvent | React.MouseEvent) => {
    if (!touchStart.current) return;

    const clientX = 'touches' in e ? e.changedTouches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.changedTouches[0].clientY : e.clientY;

    const deltaX = clientX - touchStart.current.x;
    const deltaY = clientY - touchStart.current.y;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    // Decrease moves for any attempted swap
    setMovesLeft(prev => prev - 1);

    if (absDeltaX > 30 || absDeltaY > 30) {
      let targetRow = touchStart.current.row;
      let targetCol = touchStart.current.col;

      if (absDeltaX > absDeltaY) {
        targetCol += deltaX > 0 ? 1 : -1;
      } else {
        targetRow += deltaY > 0 ? 1 : -1;
      }

      if (targetRow >= 0 && targetRow < GRID_SIZE && targetCol >= 0 && targetCol < GRID_SIZE) {
        const isAdjacent = (
          (Math.abs(touchStart.current.row - targetRow) === 1 && touchStart.current.col === targetCol) ||
          (Math.abs(touchStart.current.col - targetCol) === 1 && touchStart.current.row === targetRow)
        );

        if (isAdjacent) {
          // Add swapping animation
          setSwappingCandies(new Set([
            `${touchStart.current.row}-${touchStart.current.col}`,
            `${targetRow}-${targetCol}`
          ]));

          const newBoard = [...board];
          const temp = newBoard[touchStart.current.row][touchStart.current.col];
          newBoard[touchStart.current.row][touchStart.current.col] = newBoard[targetRow][targetCol];
          newBoard[targetRow][targetCol] = temp;
          setBoard(newBoard);

          const matches = findMatches(newBoard);
          if (matches.length > 0) {
            // Add matching animation
            const matchingIds = new Set(matches.map(({row, col}) => `${row}-${col}`));
            setMatchingCandies(matchingIds);
            
            // Wait for animation to complete
            await new Promise(resolve => setTimeout(resolve, 300));
            await handleMatches(matches, newBoard);
          } else {
            // If no matches, swap back
            await new Promise(resolve => setTimeout(resolve, 300));
            const swappedBack = [...newBoard];
            swappedBack[touchStart.current.row][touchStart.current.col] = temp;
            swappedBack[targetRow][targetCol] = newBoard[touchStart.current.row][touchStart.current.col];
            setBoard(swappedBack);
          }

          // Clear animations
          setSwappingCandies(new Set());
          setMatchingCandies(new Set());
        }
      }
    }

    touchStart.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!touchStart.current) return;
    e.preventDefault(); // Prevent scrolling while swiping
  };

  const findMatches = (currentBoard: Candy[][]): { row: number; col: number }[] => {
    const matches: { row: number; col: number }[] = [];
    
    // Check horizontal matches
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE - 2; col++) {
        const color = currentBoard[row][col].color;
        if (
          color === currentBoard[row][col + 1].color &&
          color === currentBoard[row][col + 2].color
        ) {
          matches.push({ row, col });
          matches.push({ row, col: col + 1 });
          matches.push({ row, col: col + 2 });
        }
      }
    }

    // Check vertical matches
    for (let row = 0; row < GRID_SIZE - 2; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const color = currentBoard[row][col].color;
        if (
          color === currentBoard[row + 1][col].color &&
          color === currentBoard[row + 2][col].color
        ) {
          matches.push({ row, col });
          matches.push({ row: row + 1, col });
          matches.push({ row: row + 2, col });
        }
      }
    }

    // Check L-shaped and T-shaped matches
    for (let row = 0; row < GRID_SIZE - 2; row++) {
      for (let col = 0; col < GRID_SIZE - 2; col++) {
        const color = currentBoard[row][col].color;
        
        // L-shaped match (horizontal)
        if (
          color === currentBoard[row][col + 1].color &&
          color === currentBoard[row][col + 2].color &&
          color === currentBoard[row + 1][col].color &&
          color === currentBoard[row + 2][col].color
        ) {
          matches.push({ row, col });
          matches.push({ row, col: col + 1 });
          matches.push({ row, col: col + 2 });
          matches.push({ row: row + 1, col });
          matches.push({ row: row + 2, col });
        }

        // T-shaped match
        if (
          color === currentBoard[row][col + 1].color &&
          color === currentBoard[row][col + 2].color &&
          color === currentBoard[row + 1][col + 1].color &&
          color === currentBoard[row + 2][col + 1].color
        ) {
          matches.push({ row, col });
          matches.push({ row, col: col + 1 });
          matches.push({ row, col: col + 2 });
          matches.push({ row: row + 1, col: col + 1 });
          matches.push({ row: row + 2, col: col + 1 });
        }
      }
    }

    return matches;
  };

  const handleSpecialCandy = (row: number, col: number, candy: Candy, newBoard: Candy[][]): void => {
    let targetColor: string;
    switch (candy.specialType) {
      case SpecialCandyType.STRIPED_H:
        // Clear entire row
        for (let c = 0; c < GRID_SIZE; c++) {
          newBoard[row][c] = {
            color: '',
            id: `${row}-${c}`,
            specialType: SpecialCandyType.NONE
          };
        }
        break;
      case SpecialCandyType.STRIPED_V:
        // Clear entire column
        for (let r = 0; r < GRID_SIZE; r++) {
          newBoard[r][col] = {
            color: '',
            id: `${r}-${col}`,
            specialType: SpecialCandyType.NONE
          };
        }
        break;
      case SpecialCandyType.WRAPPED:
        // Clear 3x3 area
        for (let r = Math.max(0, row - 1); r <= Math.min(GRID_SIZE - 1, row + 1); r++) {
          for (let c = Math.max(0, col - 1); c <= Math.min(GRID_SIZE - 1, col + 1); c++) {
            newBoard[r][c] = {
              color: '',
              id: `${r}-${c}`,
              specialType: SpecialCandyType.NONE
            };
          }
        }
        break;
      case SpecialCandyType.COLOR_BOMB:
        // Clear all candies of the same color
        targetColor = candy.color;
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            if (newBoard[r][c].color === targetColor) {
              newBoard[r][c] = {
                color: '',
                id: `${r}-${c}`,
                specialType: SpecialCandyType.NONE
              };
            }
          }
        }
        break;
    }
  };

  const handleMatches = async (matches: { row: number; col: number }[], currentBoard: Candy[][]) => {
    // Remove matched candies with animation
    const newBoard = [...currentBoard];
    let specialCandyCreated = false;

    // Handle special candies first
    matches.forEach(({ row, col }) => {
      const candy = newBoard[row][col];
      if (candy.specialType !== SpecialCandyType.NONE) {
        handleSpecialCandy(row, col, candy, newBoard);
      }
    });

    // Remove regular matches
    matches.forEach(({ row, col }) => {
      if (newBoard[row][col].color !== '') {
        newBoard[row][col] = {
          color: '',
          id: `${row}-${col}`,
          specialType: SpecialCandyType.NONE
        };
      }
    });

    // Create special candies for matches of 4 or more
    if (matches.length >= 4) {
      const centerMatch = matches[Math.floor(matches.length / 2)];
      const candy = currentBoard[centerMatch.row][centerMatch.col];
      let specialType = SpecialCandyType.NONE;

      if (matches.length === 4) {
        // Create striped candy
        const isHorizontal = matches.every(m => m.row === centerMatch.row);
        specialType = isHorizontal ? SpecialCandyType.STRIPED_H : SpecialCandyType.STRIPED_V;
      } else if (matches.length === 5) {
        // Create wrapped candy
        specialType = SpecialCandyType.WRAPPED;
      } else if (matches.length >= 6) {
        // Create color bomb
        specialType = SpecialCandyType.COLOR_BOMB;
      }

      if (specialType !== SpecialCandyType.NONE) {
        newBoard[centerMatch.row][centerMatch.col] = createSpecialCandy(candy.color, specialType);
        specialCandyCreated = true;
      }
    }

    // Update score with bonus for special candies
    const baseScore = matches.length * 10;
    const specialBonus = specialCandyCreated ? 50 : 0;
    const newScore = score + baseScore + specialBonus;
    setScore(newScore);

    // Check if level is complete
    if (newScore >= LEVELS[currentLevel].targetScore) {
      setLevelComplete(true);
      return;
    }

    // Shift candies down with animation
    for (let col = 0; col < GRID_SIZE; col++) {
      let emptyRow = GRID_SIZE - 1;
      for (let row = GRID_SIZE - 1; row >= 0; row--) {
        if (newBoard[row][col].color !== '') {
          if (emptyRow !== row) {
            newBoard[emptyRow][col] = newBoard[row][col];
            newBoard[row][col] = {
              color: '',
              id: `${row}-${col}`,
              specialType: SpecialCandyType.NONE
            };
          }
          emptyRow--;
        }
      }

      // Fill empty spaces with new candies
      for (let row = emptyRow; row >= 0; row--) {
        newBoard[row][col] = {
          color: CANDY_COLORS[Math.floor(Math.random() * CANDY_COLORS.length)],
          id: `${row}-${col}-${Math.random()}`,
          specialType: SpecialCandyType.NONE
        };
      }
    }

    setBoard(newBoard);

    // Check for new matches after refilling
    const newMatches = findMatches(newBoard);
    if (newMatches.length > 0) {
      await new Promise(resolve => setTimeout(resolve, 500));
      await handleMatches(newMatches, newBoard);
    } else if (movesLeft <= 0) {
      setGameOver(true);
    }
  };

  const nextLevel = () => {
    if (currentLevel < LEVELS.length - 1) {
      setCurrentLevel(prev => prev + 1);
      setScore(0);
      setMovesLeft(LEVELS[currentLevel + 1].moves);
      setBoard(createBoard());
      setLevelComplete(false);
    } else {
      setGameOver(true);
    }
  };

  const resetGame = () => {
    setCurrentLevel(0);
    setScore(0);
    setMovesLeft(LEVELS[0].moves);
    setBoard(createBoard());
    setGameOver(false);
    setLevelComplete(false);
  };

  return (
    <div className="game-container">
      <div className="game-info">
        <div className="level-info">
          <div className="level">Level {currentLevel + 1}</div>
          <div className="target">Target: {LEVELS[currentLevel].targetScore}</div>
        </div>
        <div className="score">Score: {score}</div>
        <div className="moves">Moves Left: {movesLeft}</div>
      </div>
      <div className="board">
        {board.map((row, rowIndex) => (
          <div key={rowIndex} className="row">
            {row.map((candy, colIndex) => {
              const candyId = `${rowIndex}-${colIndex}`;
              const isMatching = matchingCandies.has(candyId);
              const isSwapping = swappingCandies.has(candyId);
              
              return (
                <motion.div
                  key={candy.id}
                  className={`candy ${candy.color} ${candy.specialType} ${
                    !candy.color ? 'empty' : ''
                  } ${isMatching ? 'matching' : ''} ${isSwapping ? 'swapping' : ''}`}
                  variants={candyVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  whileHover="hover"
                  whileTap="tap"
                  onTouchStart={(e) => handleTouchStart(e, rowIndex, colIndex)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchMove}
                  onMouseDown={(e) => handleTouchStart(e, rowIndex, colIndex)}
                  onMouseUp={handleTouchEnd}
                  onMouseMove={handleTouchMove}
                />
              );
            })}
          </div>
        ))}
      </div>
      <AnimatePresence>
        {levelComplete && (
          <motion.div 
            className="level-complete"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            <h2>Level {currentLevel + 1} Complete!</h2>
            <p>Score: {score}</p>
            {currentLevel < LEVELS.length - 1 ? (
              <motion.button 
                onClick={nextLevel}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Next Level
              </motion.button>
            ) : (
              <motion.button 
                onClick={resetGame}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Play Again
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {gameOver && (
          <motion.div 
            className="game-over"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          >
            <h2>Game Over!</h2>
            <p>Final Score: {score}</p>
            <motion.button 
              onClick={resetGame}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Play Again
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}; 